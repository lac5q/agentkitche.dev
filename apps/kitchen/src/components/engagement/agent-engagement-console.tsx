"use client";

import { useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Mic,
  MessageSquare,
  PhoneCall,
  RefreshCw,
  Send,
  TestTube2,
  Video,
  Volume2,
} from "lucide-react";
import { useAgents, useDelegations } from "@/lib/api-client";
import { PLATFORM_LABELS } from "@/lib/constants";
import { InfoTip } from "@/components/ui/info-tip";
import { LineageDrawer } from "@/components/dispatch/lineage-drawer";
import type { RegisteredAgent } from "@/types";

type Mode = "chat" | "voice" | "standup" | "conference";
type ChatMessage = { role: "user" | "assistant" | "system"; content: string; agentId?: string };
type SpeechRecognitionResultLike = ArrayLike<{ transcript?: string }>;
type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultLike>;
};
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type AgentCheck = {
  agentId: string;
  name: string;
  status: RegisteredAgent["status"];
  chat: { status: "ready" | "blocked" | "warning"; runner: string; detail: string };
  dispatch: { status: "ready" | "blocked" | "warning"; adapter: string; detail: string };
  voice: { status: "ready" | "blocked" | "warning"; detail: string };
};

const MODE_COPY: Record<Mode, { label: string; description: string }> = {
  chat: {
    label: "Chat",
    description: "Direct text exchange with the selected agent through the chat runner.",
  },
  voice: {
    label: "Voice",
    description: "Use browser speech recognition, then play the agent response through TTS when configured.",
  },
  standup: {
    label: "Standup",
    description: "Run a structured check-in where each selected agent answers in turn.",
  },
  conference: {
    label: "Conference",
    description: "Capture one spoken or typed prompt and let the room participants respond in sequence.",
  },
};

const STATUS_STYLES: Record<string, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  idle: "border-sky-200 bg-sky-50 text-sky-700",
  dormant: "border-slate-200 bg-slate-50 text-slate-500",
  error: "border-rose-200 bg-rose-50 text-rose-700",
  ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  blocked: "border-rose-200 bg-rose-50 text-rose-700",
};

function formatAgent(agent: RegisteredAgent): string {
  const platform = PLATFORM_LABELS[agent.platform] ?? agent.platform;
  return `${platform} - ${agent.name}`;
}

function parseChatError(raw: string): string {
  const jsonStart = raw.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(raw.slice(jsonStart)) as {
        error?: { message?: string };
        message?: string;
      };
      return parsed.error?.message ?? parsed.message ?? raw;
    } catch {
      return raw;
    }
  }
  return raw;
}

async function readChatStream(
  response: Response,
  onText: (text: string) => void
): Promise<string> {
  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    throw new Error(parseChatError(detail || `HTTP ${response.status}`));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  let error: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    for (const line of chunk.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") break;
      try {
        const parsed = JSON.parse(payload) as { text?: string; error?: string };
        if (parsed.error) {
          error = parseChatError(parsed.error);
          break;
        }
        if (parsed.text) {
          full += parsed.text;
          onText(full);
        }
      } catch {
        // Ignore malformed stream events.
      }
    }
    if (error) break;
  }

  if (error) throw new Error(error);
  return full;
}

function Pill({ value }: { value: string }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[value] ?? STATUS_STYLES.dormant}`}>
      {value}
    </span>
  );
}

export function AgentEngagementConsole() {
  const { data: agentsData, isLoading: agentsLoading } = useAgents();
  const { data: delegationsData } = useDelegations(8);
  const agents = useMemo(() => (agentsData?.agents ?? []) as RegisteredAgent[], [agentsData?.agents]);
  const activeAgents = useMemo(() => agents.filter((agent) => agent.status === "active"), [agents]);
  const roster = useMemo(() => activeAgents.length > 0 ? activeAgents : agents, [activeAgents, agents]);
  const defaultAgentId = roster[0]?.id ?? "";

  const [mode, setMode] = useState<Mode>("chat");
  const [selectedAgentId, setSelectedAgentId] = useState(defaultAgentId);
  const [participants, setParticipants] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [standupFocus, setStandupFocus] = useState("");
  const [standupBlockers, setStandupBlockers] = useState("");
  const [standupAsk, setStandupAsk] = useState("");
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [checks, setChecks] = useState<Record<string, AgentCheck>>({});
  const [testing, setTesting] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === (selectedAgentId || defaultAgentId)) ?? roster[0],
    [agents, defaultAgentId, roster, selectedAgentId]
  );
  const selectedId = selectedAgent?.id ?? "";
  const selectedLabel = selectedAgent ? formatAgent(selectedAgent) : "No agent selected";
  const activeParticipantIds = participants.length > 0 ? participants : selectedId ? [selectedId] : [];
  const recentDelegations = delegationsData?.delegations ?? [];

  function toggleParticipant(agentId: string) {
    setParticipants((current) =>
      current.includes(agentId)
        ? current.filter((id) => id !== agentId)
        : [...current, agentId]
    );
  }

  function agentName(agentId?: string): string {
    if (!agentId) return "Agent";
    return agents.find((agent) => agent.id === agentId)?.name ?? agentId;
  }

  function formatMeetingTranscript(entries: ChatMessage[]): string {
    return entries
      .map((entry) => {
        const speaker = entry.role === "user"
          ? "Luis"
          : entry.role === "assistant"
            ? agentName(entry.agentId)
            : "System";
        return `${speaker}: ${entry.content}`;
      })
      .join("\n\n");
  }

  async function speak(text: string) {
    if (!selectedId || !text.trim()) return;
    audioRef.current?.pause();
    setSpeaking(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: selectedId, text }),
      });
      if (!res.ok) throw new Error("TTS unavailable");
      const url = URL.createObjectURL(await res.blob());
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setSpeaking(false);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => setSpeaking(false);
      await audio.play();
    } catch {
      setSpeaking(false);
    }
  }

  async function sendChatMessage(text = message, withVoice = false) {
    if (!selectedId || !text.trim() || busy) return;
    setBusy(true);
    setMessage("");
    const userMsg: ChatMessage = { role: "user", content: text, agentId: selectedId };
    const assistantMsg: ChatMessage = { role: "assistant", content: "", agentId: selectedId };
    setHistory((current) => [...current, userMsg, assistantMsg]);

    try {
      let finalText = "";
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          agentId: selectedId,
          history: history
            .filter((entry) => entry.role !== "system")
            .slice(-10)
            .map((entry) => ({ role: entry.role, content: entry.content })),
        }),
      });
      finalText = await readChatStream(res, (nextText) => {
        setHistory((current) => {
          const updated = [...current];
          updated[updated.length - 1] = { role: "assistant", content: nextText, agentId: selectedId };
          return updated;
        });
      });
      if (withVoice && finalText) await speak(finalText);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Chat failed";
      setHistory((current) => {
        const updated = [...current];
        updated[updated.length - 1] = {
          role: "assistant",
          content: `Chat unavailable: ${detail}`,
          agentId: selectedId,
        };
        return updated;
      });
    } finally {
      setBusy(false);
    }
  }

  async function runMeetingRound(text: string) {
    const prompt = text.trim();
    if (!prompt || activeParticipantIds.length === 0 || busy) return;

    setBusy(true);
    setMessage("");
    const userMsg: ChatMessage = { role: "user", content: prompt };
    let meetingHistory: ChatMessage[] = [...history.slice(-12), userMsg];
    setHistory((current) => [...current, userMsg]);

    try {
      for (const agentId of activeParticipantIds) {
        setActiveSpeakerId(agentId);
        const participantNames = activeParticipantIds.map((id) => agentName(id)).join(", ");
        const turnPrompt = [
          `You are in a live agent standup meeting with Luis and these participants: ${participantNames}.`,
          `Meeting transcript so far:\n${formatMeetingTranscript(meetingHistory)}`,
          `It is your turn as ${agentName(agentId)}. Respond conversationally and concisely. Add your status, blocker, or next step when relevant, then stop so the next agent can take a turn.`,
        ].join("\n\n");

        setHistory((current) => [...current, { role: "assistant", content: "", agentId }]);

        try {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: turnPrompt,
              agentId,
              history: [],
            }),
          });
          const finalText = await readChatStream(res, (nextText) => {
            setHistory((current) => {
              const updated = [...current];
              const targetIndex = updated.findLastIndex(
                (entry) => entry.role === "assistant" && entry.agentId === agentId
              );
              if (targetIndex >= 0) {
                updated[targetIndex] = { role: "assistant", content: nextText, agentId };
              }
              return updated;
            });
          });
          meetingHistory = [...meetingHistory, { role: "assistant", content: finalText, agentId }];
        } catch (error) {
          const detail = error instanceof Error ? error.message : "Chat failed";
          const failure = `Chat unavailable: ${detail}`;
          setHistory((current) => {
            const updated = [...current];
            const targetIndex = updated.findLastIndex(
              (entry) => entry.role === "assistant" && entry.agentId === agentId
            );
            if (targetIndex >= 0) {
              updated[targetIndex] = { role: "assistant", content: failure, agentId };
            }
            return updated;
          });
          meetingHistory = [...meetingHistory, { role: "assistant", content: failure, agentId }];
        }
      }
    } finally {
      setActiveSpeakerId(null);
      setBusy(false);
    }
  }

  async function runStandup() {
    const summary = [
      "Standup check-in",
      standupFocus ? `Focus: ${standupFocus}` : null,
      standupBlockers ? `Blockers: ${standupBlockers}` : null,
      standupAsk ? `Ask: ${standupAsk}` : null,
    ].filter(Boolean).join("\n");
    await runMeetingRound(summary);
  }

  async function runConferencePrompt(text = message) {
    if (!text.trim()) return;
    await runMeetingRound(text);
  }

  async function runAgentTests(ids = roster.map((agent) => agent.id)) {
    setTesting(true);
    try {
      const res = await fetch("/api/engagement/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentIds: ids }),
      });
      const body = (await res.json()) as { results?: AgentCheck[] };
      const next = Object.fromEntries((body.results ?? []).map((check) => [check.agentId, check]));
      setChecks((current) => ({ ...current, ...next }));
    } finally {
      setTesting(false);
    }
  }

  function startVoiceCapture() {
    const speechWindow = window as typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setHistory((current) => [
        ...current,
        { role: "system", content: "Voice capture is not supported in this browser. Use Chrome or type the prompt." },
      ]);
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;
    setListening(true);
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      setListening(false);
      if (!transcript) return;
      if (mode === "conference" || mode === "standup") {
        void runMeetingRound(transcript);
      } else {
        void sendChatMessage(transcript, true);
      }
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.07)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Agent Engagement</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Chat, voice, standups, conference prompts, and dispatch checks for the active agent fleet.
            </p>
          </div>
          <button
            type="button"
            onClick={() => runAgentTests()}
            disabled={testing || roster.length === 0}
            className="inline-flex items-center gap-2 rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100 disabled:opacity-50"
          >
            {testing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />}
            Test agents
          </button>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_16px_48px_rgba(15,23,42,0.05)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center text-sm font-semibold text-slate-950">
              Active Agents
              <InfoTip text="Agents marked active are shown first. If none are active, the full registered roster is shown." />
            </h2>
            <Pill value={`${roster.length}`} />
          </div>
          {agentsLoading && <p className="text-sm text-slate-500">Loading agents...</p>}
          <div className="max-h-[34rem] space-y-2 overflow-y-auto pr-1">
            {roster.map((agent) => {
              const selected = selectedId === agent.id;
              const participating = activeParticipantIds.includes(agent.id);
              const check = checks[agent.id];
              return (
                <article
                  key={agent.id}
                  className={`rounded-md border p-3 transition ${
                    selected
                      ? "border-cyan-300 bg-cyan-50 shadow-[0_10px_30px_rgba(8,145,178,0.10)]"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAgentId(agent.id);
                      if (!participants.includes(agent.id)) setParticipants([agent.id]);
                    }}
                    className="flex w-full items-start justify-between gap-3 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-950">{agent.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">{PLATFORM_LABELS[agent.platform] ?? agent.platform} - {agent.role}</span>
                    </span>
                    <Pill value={agent.status} />
                  </button>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">
                      {check ? `${check.dispatch.adapter} / ${check.chat.runner}` : "Not tested"}
                    </span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleParticipant(agent.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600"
                    >
                      {participating ? <CheckCircle2 className="h-3.5 w-3.5 text-cyan-600" /> : <Circle className="h-3.5 w-3.5" />}
                      Room
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </aside>

        <section className="rounded-lg border border-slate-200 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.05)]">
          <div className="border-b border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center text-base font-semibold text-slate-950">
                  Engagement Controls
                  <InfoTip text="Choose a mode, select one or more room participants, then send chat, voice, standup, or conference prompts." />
                </h2>
                <p className="mt-1 text-sm text-slate-500">{selectedLabel}</p>
              </div>
              <div className="flex rounded-md border border-slate-200 bg-slate-50 p-1">
                {(Object.keys(MODE_COPY) as Mode[]).map((nextMode) => (
                  <button
                    key={nextMode}
                    type="button"
                    onClick={() => setMode(nextMode)}
                    className={`rounded px-3 py-1.5 text-xs font-semibold transition ${
                      mode === nextMode ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"
                    }`}
                    title={MODE_COPY[nextMode].description}
                  >
                    {MODE_COPY[nextMode].label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-0 2xl:grid-cols-[1fr_280px]">
            <div className="space-y-4 p-4">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="flex items-center text-sm font-semibold text-slate-950">
                  {MODE_COPY[mode].label}
                  <InfoTip text={MODE_COPY[mode].description} />
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{MODE_COPY[mode].description}</p>
              </div>

              {(mode === "standup" || mode === "conference") && (
                <div className="rounded-md border border-slate-200 bg-slate-950 p-3 text-white">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-cyan-300" />
                      <p className="text-sm font-semibold">Live room</p>
                    </div>
                    <span className="text-xs text-slate-300">
                      {busy && activeSpeakerId ? `${agentName(activeSpeakerId)} speaking` : `${activeParticipantIds.length} seats`}
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {activeParticipantIds.map((agentId) => {
                      const agent = agents.find((item) => item.id === agentId);
                      const speakingNow = activeSpeakerId === agentId;
                      const initials = (agent?.name ?? agentId)
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")
                        .toUpperCase();
                      return (
                        <div
                          key={agentId}
                          className={`min-h-28 rounded-md border p-3 transition ${
                            speakingNow
                              ? "border-cyan-300 bg-cyan-500/15 shadow-[0_0_0_1px_rgba(103,232,249,0.45)]"
                              : "border-slate-700 bg-slate-900"
                          }`}
                        >
                          <div className="flex h-full flex-col justify-between">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-800 text-sm font-semibold text-cyan-100">
                                {initials}
                              </div>
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${
                                speakingNow ? "bg-cyan-300 text-slate-950" : "bg-slate-800 text-slate-300"
                              }`}>
                                <Mic className="h-3 w-3" />
                                {speakingNow ? "Live" : "Ready"}
                              </span>
                            </div>
                            <div>
                              <p className="truncate text-sm font-semibold">{agent?.name ?? agentId}</p>
                              <p className="truncate text-xs text-slate-400">{PLATFORM_LABELS[agent?.platform ?? ""] ?? agent?.platform ?? agentId}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="min-h-56 max-h-80 space-y-2 overflow-y-auto rounded-md border border-slate-200 bg-white p-3">
                {history.length === 0 ? (
                  <p className="py-14 text-center text-sm text-slate-400">
                    Start a room prompt and each selected agent will take a turn.
                  </p>
                ) : (
                  history.slice(-10).map((entry, index) => (
                    <div
                      key={`${entry.role}-${index}`}
                      className={`rounded-md border px-3 py-2 text-sm ${
                        entry.role === "user"
                          ? "ml-8 border-cyan-100 bg-cyan-50 text-cyan-950"
                          : entry.role === "assistant"
                            ? "mr-8 border-slate-200 bg-slate-50 text-slate-800"
                            : "border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                    >
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        {entry.role === "user" ? "You" : entry.role === "assistant" ? agentName(entry.agentId) : "System"}
                      </p>
                      <p className="whitespace-pre-wrap leading-6">{entry.content || "..."}</p>
                    </div>
                  ))
                )}
              </div>

              {(mode === "chat" || mode === "voice" || mode === "conference") && (
                <div className="flex gap-2">
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey && mode !== "conference") {
                        event.preventDefault();
                        void sendChatMessage(message, mode === "voice");
                      }
                    }}
                    rows={2}
                    placeholder={mode === "conference" ? "Say something to the room..." : `Message ${selectedAgent?.name ?? "agent"}...`}
                    className="min-h-16 flex-1 resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400"
                  />
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => (mode === "conference" ? runConferencePrompt() : sendChatMessage(message, mode === "voice"))}
                      disabled={busy || !message.trim() || !selectedId}
                      className="inline-flex h-9 items-center justify-center rounded-md bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
                      aria-label={mode === "conference" ? "Start room round" : "Send message"}
                    >
                      <Send className="h-4 w-4" />
                    </button>
                    {(mode === "voice" || mode === "conference") && (
                      <button
                        type="button"
                        onClick={startVoiceCapture}
                        disabled={busy}
                        className={`inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-semibold transition ${
                          listening
                            ? "border-rose-200 bg-rose-50 text-rose-700"
                            : "border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100"
                        }`}
                        aria-label={listening ? "Stop voice capture" : "Start voice capture"}
                      >
                        <Mic className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {mode === "standup" && (
                <div className="grid gap-3">
                  <label className="text-sm font-semibold text-slate-700">
                    Focus <InfoTip text="What each selected agent should report progress against." />
                    <input
                      value={standupFocus}
                      onChange={(event) => setStandupFocus(event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-cyan-400"
                      placeholder="What changed since the last checkpoint?"
                    />
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    Blockers <InfoTip text="Ask agents to surface missing context, permissions, or runtime failures." />
                    <input
                      value={standupBlockers}
                      onChange={(event) => setStandupBlockers(event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-cyan-400"
                      placeholder="Anything blocked or stale?"
                    />
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    Ask <InfoTip text="The exact response or action expected from each participant." />
                    <input
                      value={standupAsk}
                      onChange={(event) => setStandupAsk(event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-cyan-400"
                      placeholder="Reply with status, next step, and one risk."
                    />
                  </label>
                  <button
                    type="button"
                    onClick={runStandup}
                    disabled={busy || activeParticipantIds.length === 0 || (!standupFocus && !standupAsk)}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Start standup round
                  </button>
                  <button
                    type="button"
                    onClick={startVoiceCapture}
                    disabled={busy}
                    className={`inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition ${
                      listening
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100"
                    }`}
                  >
                    <Mic className="h-4 w-4" />
                    {listening ? "Listening" : "Speak to room"}
                  </button>
                </div>
              )}
            </div>

            <aside className="border-t border-slate-200 p-4 2xl:border-l 2xl:border-t-0">
              <div className="space-y-4">
                <div>
                  <h3 className="flex items-center text-sm font-semibold text-slate-950">
                    Room
                    <InfoTip text="Selected agents receive standup and conference prompts. Chat and voice use the primary selected agent." />
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">{activeParticipantIds.length} participant{activeParticipantIds.length === 1 ? "" : "s"}</p>
                </div>
                <div className="space-y-2">
                  {activeParticipantIds.map((agentId) => {
                    const agent = agents.find((item) => item.id === agentId);
                    return (
                      <div key={agentId} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="truncate text-sm font-semibold text-slate-900">{agent?.name ?? agentId}</p>
                        <p className="truncate text-xs text-slate-500">{agentId}</p>
                      </div>
                    );
                  })}
                </div>

                <div>
                  <h3 className="flex items-center text-sm font-semibold text-slate-950">
                    Diagnostics
                    <InfoTip text="Tests chat configuration, dispatch delivery mode, and server-side TTS prerequisites for selected agents." />
                  </h3>
                  <div className="mt-2 space-y-2">
                    {activeParticipantIds.map((agentId) => {
                      const check = checks[agentId];
                      return (
                        <div key={agentId} className="rounded-md border border-slate-200 bg-white p-3 text-xs">
                          <p className="mb-2 font-semibold text-slate-900">{agents.find((agent) => agent.id === agentId)?.name ?? agentId}</p>
                          {check ? (
                            <div className="space-y-1.5">
                              <p><Pill value={check.chat.status} /> <span className="ml-1 text-slate-500">chat: {check.chat.detail}</span></p>
                              <p><Pill value={check.dispatch.status} /> <span className="ml-1 text-slate-500">dispatch: {check.dispatch.detail}</span></p>
                              <p><Pill value={check.voice.status} /> <span className="ml-1 text-slate-500">voice: {check.voice.detail}</span></p>
                            </div>
                          ) : (
                            <p className="text-slate-500">Run tests to verify this agent.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="flex items-center text-sm font-semibold text-slate-950">
                    Recent Delegations
                    <InfoTip text="The latest queued or pushed engagements created by dispatch." />
                  </h3>
                  <div className="mt-2 space-y-2">
                    {recentDelegations.slice(0, 4).map((delegation) => (
                      <div key={delegation.task_id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                        <p className="truncate text-xs font-semibold text-slate-800">{delegation.task_summary}</p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <Pill value={delegation.status} />
                          <LineageDrawer taskId={delegation.task_id} taskSummary={delegation.task_summary} />
                        </div>
                      </div>
                    ))}
                    {recentDelegations.length === 0 && <p className="text-xs text-slate-500">No delegations yet.</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <PhoneCall className="h-4 w-4 text-slate-500" />
                    <p className="mt-2 text-xs font-semibold text-slate-900">Conference</p>
                    <p className="text-[11px] leading-4 text-slate-500">Live room turns.</p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <Volume2 className="h-4 w-4 text-slate-500" />
                    <p className="mt-2 text-xs font-semibold text-slate-900">Voice</p>
                    <p className="text-[11px] leading-4 text-slate-500">{speaking ? "Speaking now" : "Mic plus TTS"}</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}
