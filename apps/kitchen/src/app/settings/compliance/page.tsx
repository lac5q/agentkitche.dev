"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, ShieldCheck } from "lucide-react";

interface ComplianceSummary {
  dataResidencyEnabled: boolean;
  judgeProvider: string;
  judgeModel: string;
  judgeModelFamily: string;
  judgeEndpoint: string | null;
  judgeEndpointLocal: boolean;
  auditRetentionDays: number;
  enabledAdapters: string[];
}

interface ComplianceResponse {
  compliance: ComplianceSummary;
  timestamp: string;
}

async function fetchCompliance(): Promise<ComplianceResponse> {
  const res = await fetch("/api/admin/compliance", { credentials: "include" });
  if (!res.ok) throw new Error("Admin access required");
  return res.json() as Promise<ComplianceResponse>;
}

async function updateCompliance(input: {
  dataResidencyEnabled: boolean;
  auditRetentionDays: number;
  enabledAdapters: string[];
  judgeProvider: string;
  judgeLocalEndpoint: string;
  judgeModelFamily: string;
}): Promise<ComplianceResponse> {
  const res = await fetch("/api/admin/compliance", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to update compliance controls");
  }
  return res.json() as Promise<ComplianceResponse>;
}

export default function ComplianceSettingsPage() {
  const queryClient = useQueryClient();
  const [dataResidencyEnabled, setDataResidencyEnabled] = useState(false);
  const [auditRetentionDays, setAuditRetentionDays] = useState(365);
  const [enabledAdapters, setEnabledAdapters] = useState("hubspot, intercom, quickbooks, bank_reconciliation");
  const [judgeProvider, setJudgeProvider] = useState("ollama");
  const [judgeLocalEndpoint, setJudgeLocalEndpoint] = useState("http://localhost:11434/v1");
  const [judgeModelFamily, setJudgeModelFamily] = useState("local");

  const { data, error, isLoading } = useQuery({
    queryKey: ["admin", "compliance"],
    queryFn: fetchCompliance,
  });

  const loaded = data?.compliance;
  useEffect(() => {
    if (!loaded) return;
    setDataResidencyEnabled(loaded.dataResidencyEnabled);
    setAuditRetentionDays(loaded.auditRetentionDays);
    setEnabledAdapters(loaded.enabledAdapters.join(", "));
    setJudgeProvider(loaded.judgeProvider);
    setJudgeLocalEndpoint(loaded.judgeEndpoint ?? "");
    setJudgeModelFamily(loaded.judgeModelFamily);
  }, [loaded]);

  const mutation = useMutation({
    mutationFn: updateCompliance,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "compliance"] });
      void queryClient.invalidateQueries({ queryKey: ["evals", "config"] });
    },
  });

  const adapterList = enabledAdapters
    .split(",")
    .map((adapter) => adapter.trim())
    .filter(Boolean);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-[#a8392c]" />
        <div>
          <h1 className="text-xl font-semibold text-[#0f0f0e]">Compliance</h1>
          <p className="text-sm text-[#73736b]">Data residency, local judge posture, audit retention, and adapter controls.</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-[#73736b]">Loading compliance posture...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error.message}</p>
      ) : (
        <>
          <section className="grid gap-3 border-y border-[#c9c9c2] py-4 md:grid-cols-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#73736b]">Residency</p>
              <p className="mt-1 text-sm font-semibold text-[#0f0f0e]">
                {loaded?.dataResidencyEnabled ? "Local only" : "Standard"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#73736b]">Judge</p>
              <p className="mt-1 text-sm font-semibold text-[#0f0f0e]">{loaded?.judgeProvider}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#73736b]">Endpoint</p>
              <p className="mt-1 text-sm font-semibold text-[#0f0f0e]">
                {loaded?.judgeEndpointLocal ? "Local" : "Not local"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#73736b]">Retention</p>
              <p className="mt-1 text-sm font-semibold text-[#0f0f0e]">{loaded?.auditRetentionDays} days</p>
            </div>
          </section>

          <form
            className="max-w-3xl space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate({
                dataResidencyEnabled,
                auditRetentionDays,
                enabledAdapters: adapterList,
                judgeProvider,
                judgeLocalEndpoint,
                judgeModelFamily,
              });
            }}
          >
            <label className="flex items-center gap-3 text-sm font-medium text-[#0f0f0e]">
              <input
                type="checkbox"
                checked={dataResidencyEnabled}
                onChange={(event) => setDataResidencyEnabled(event.target.checked)}
                className="h-4 w-4"
              />
              Data residency mode
            </label>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-[#0f0f0e]" htmlFor="retention">
                Audit retention days
              </label>
              <input
                id="retention"
                type="number"
                min={1}
                value={auditRetentionDays}
                onChange={(event) => setAuditRetentionDays(Number(event.target.value))}
                className="w-40 rounded-sm border border-[#c9c9c2] bg-white px-2 py-1.5 text-sm text-[#0f0f0e]"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[#0f0f0e]" htmlFor="judge-provider">
                  Judge provider
                </label>
                <select
                  id="judge-provider"
                  value={judgeProvider}
                  onChange={(event) => setJudgeProvider(event.target.value)}
                  className="rounded-sm border border-[#c9c9c2] bg-white px-2 py-1.5 text-sm text-[#0f0f0e]"
                >
                  <option value="ollama">Ollama</option>
                  <option value="vllm">vLLM</option>
                  <option value="openai-compatible">OpenAI-compatible local</option>
                  <option value="anthropic">Anthropic</option>
                </select>
              </div>

              <div className="grid gap-2 md:col-span-2">
                <label className="text-sm font-medium text-[#0f0f0e]" htmlFor="judge-endpoint">
                  Local judge endpoint
                </label>
                <input
                  id="judge-endpoint"
                  value={judgeLocalEndpoint}
                  onChange={(event) => setJudgeLocalEndpoint(event.target.value)}
                  placeholder="http://localhost:11434/v1"
                  className="w-full rounded-sm border border-[#c9c9c2] bg-white px-2 py-1.5 text-sm text-[#0f0f0e]"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-[#0f0f0e]" htmlFor="judge-model-family">
                Judge model family
              </label>
              <input
                id="judge-model-family"
                value={judgeModelFamily}
                onChange={(event) => setJudgeModelFamily(event.target.value)}
                className="w-full rounded-sm border border-[#c9c9c2] bg-white px-2 py-1.5 text-sm text-[#0f0f0e]"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-[#0f0f0e]" htmlFor="adapters">
                Enabled adapters
              </label>
              <input
                id="adapters"
                value={enabledAdapters}
                onChange={(event) => setEnabledAdapters(event.target.value)}
                className="w-full rounded-sm border border-[#c9c9c2] bg-white px-2 py-1.5 text-sm text-[#0f0f0e]"
              />
            </div>

            {mutation.error && <p className="text-sm text-red-600">{mutation.error.message}</p>}
            {mutation.isSuccess && <p className="text-sm text-green-700">Compliance controls saved.</p>}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex items-center gap-2 rounded-sm bg-[#a8392c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {mutation.isPending ? "Saving" : "Save"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
