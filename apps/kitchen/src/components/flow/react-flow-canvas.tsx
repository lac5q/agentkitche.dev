"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeTypes,
  Handle,
  Position,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { HealthStatus } from "@/types";
import { applyCollapseToNodes, applyCollapseToEdges, aggregateHealthColor } from "@/lib/flow/collapse-logic";

interface RegisteredFlowAgent {
  id: string;
  name: string;
  status: string;
  latencyMs: number | null;
  location: string;
  protocol?: string;
  platform?: string;
  metadata?: Record<string, unknown>;
  capabilities?: Array<{ id: string; name: string; description: string; tags: string[] }>;
  currentTask?: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function a2aMetadata(agent: RegisteredFlowAgent): Record<string, unknown> {
  const metadata = agent.metadata?.a2a;
  return isRecord(metadata) ? metadata : {};
}

function isAdkAgent(agent: RegisteredFlowAgent): boolean {
  return a2aMetadata(agent).source === "adk";
}

function agentSubtitle(agent: RegisteredFlowAgent): string {
  const labels = [
    agent.protocol === "a2a" ? "A2A" : agent.protocol,
    isAdkAgent(agent) ? "ADK" : null,
    a2aMetadata(agent).streaming === true ? "streaming" : null,
    agent.location,
  ].filter(Boolean);
  return labels.join(" · ");
}

function agentStats(agent: RegisteredFlowAgent): Record<string, string | number> {
  const metadata = a2aMetadata(agent);
  return {
    "Protocol": agent.protocol === "a2a" ? "A2A" : agent.protocol ?? "unknown",
    "Source": isAdkAgent(agent) ? "ADK" : String(metadata.source ?? agent.platform ?? "unknown"),
    "Status": agent.status,
    "Location": agent.location,
    "Capabilities": agent.capabilities?.length ?? 0,
    ...(typeof metadata.version === "string" ? { "Version": metadata.version } : {}),
    ...(typeof metadata.lastFetchedAt === "string" ? { "Last validation": metadata.lastFetchedAt } : {}),
    ...(typeof metadata.latestTaskState === "string" ? { "Latest task": metadata.latestTaskState } : {}),
    ...(agent.currentTask ? { "Current task": agent.currentTask } : {}),
  };
}

const STATUS_THEME = {
  active: {
    accent: "#06b6d4",
    text: "#075985",
    bg: "#ecfeff",
    ring: "rgba(6, 182, 212, 0.28)",
  },
  idle: {
    accent: "#f59e0b",
    text: "#92400e",
    bg: "#fffbeb",
    ring: "rgba(245, 158, 11, 0.22)",
  },
  dormant: {
    accent: "#cbd5e1",
    text: "#475569",
    bg: "#f8fafc",
    ring: "rgba(148, 163, 184, 0.18)",
  },
  error: {
    accent: "#f43f5e",
    text: "#be123c",
    bg: "#fff1f2",
    ring: "rgba(244, 63, 94, 0.22)",
  },
} as const;

const NODE_ICONS: Record<string, string> = {
  request: "✉",
  gateways: "▤",
  manager: "⌘",
  output: "↗",
  tunnels: "◌",
  taskboard: "□",
  notebooks: "●",
  librarian: "⌕",
  cookbooks: "▰",
  "tool-gateway": "⌑",
  apo: "⚡",
  gitnexus: "◇",
  llmwiki: "◫",
  "local-agents": "CLI",
};

function agentIcon(agent: RegisteredFlowAgent) {
  const haystack = `${agent.platform ?? ""} ${agent.protocol ?? ""} ${agent.name} ${agent.id}`.toLowerCase();
  if (haystack.includes("codex")) return "Cx";
  if (haystack.includes("claude")) return "Cl";
  if (haystack.includes("qwen")) return "Qw";
  if (haystack.includes("gemini")) return "Gm";
  if (haystack.includes("hermes")) return "He";
  if (haystack.includes("openclaw") || haystack.includes("claw")) return "Oc";
  if (haystack.includes("adk")) return "ADK";
  const words = agent.name.match(/[A-Za-z0-9]+/g) ?? [agent.id];
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "AI";
}

// Custom node component
function FlowNode({ data }: {
  data: {
    label: string;
    subtitle: string;
    icon: string;
    status: string;
    highlighted: boolean;
  }
}) {
  const theme = STATUS_THEME[data.status as keyof typeof STATUS_THEME] || STATUS_THEME.dormant;
  const isActive = data.status === "active" || data.highlighted;
  const displayIcon = data.icon || NODE_ICONS[data.label.toLowerCase()] || "AI";
  const isTextIcon = /^[A-Z0-9]{2,3}$/i.test(displayIcon);

  return (
    <div className="flex flex-col items-center" style={{ width: 112 }}>
      <Handle type="target" position={Position.Left} style={{ opacity: 0, top: 36 }} />
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        className="relative flex cursor-pointer items-center justify-center rounded-2xl"
        style={{
          width: 76,
          height: 76,
          background: data.highlighted ? "#ecfeff" : "#ffffff",
          border: `1px solid ${data.highlighted ? "#67e8f9" : "#dbeafe"}`,
          boxShadow: isActive
            ? `0 18px 36px ${theme.ring}, 0 0 0 4px ${theme.ring}`
            : "0 12px 28px rgba(15, 23, 42, 0.08)",
          transition: "all 0.2s",
        }}
      >
        <span
          className="absolute left-2 top-2 h-2 w-2 rounded-full"
          style={{ background: theme.accent }}
        />
        <span
          className={isTextIcon ? "font-semibold tracking-tight" : ""}
          style={{
            color: theme.text,
            fontSize: isTextIcon ? 18 : 28,
            lineHeight: 1,
          }}
        >
          {displayIcon}
        </span>
      </div>
      <p style={{ fontSize: 11, fontWeight: 650, color: "#0f172a", marginTop: 7, textAlign: "center", maxWidth: 108 }} className="truncate">
        {data.label}
      </p>
      <p style={{ fontSize: 9, color: "#64748b", textAlign: "center", maxWidth: 108 }} className="truncate">
        {data.subtitle}
      </p>
      <Handle type="source" position={Position.Right} style={{ opacity: 0, top: 36 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

// Group box node — dashed border container for a cluster of child nodes.
// Clickable: calls data.onToggleCollapse() to collapse/expand children.
// When collapsed, shows aggregateColor as the border accent.
function GroupBoxNode({ data }: {
  data: {
    label: string;
    width: number;
    height: number;
    collapsed?: boolean;
    aggregateColor?: string;
    onToggleCollapse?: () => void;
  }
}) {
  const borderColor = data.collapsed && data.aggregateColor ? data.aggregateColor : "#bfdbfe";
  const bgColor = data.collapsed ? "rgba(239, 246, 255, 0.9)" : "rgba(248, 250, 252, 0.72)";

  return (
    <div
      onClick={data.onToggleCollapse}
      style={{
        width: data.width,
        height: data.collapsed ? 40 : data.height,
        border: `1px dashed ${borderColor}`,
        borderRadius: 18,
        background: bgColor,
        position: "relative",
        cursor: "pointer",
        transition: "all 0.2s",
        boxShadow: data.collapsed ? "0 10px 24px rgba(15, 23, 42, 0.06)" : "none",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 6,
          left: 12,
          fontSize: 10,
          fontWeight: 700,
          color: data.collapsed ? (data.aggregateColor ?? "#64748b") : "#64748b",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
        }}
      >
        {data.label}
      </span>
      <span
        style={{
          position: "absolute",
          top: 6,
          right: 12,
          fontSize: 9,
          color: "#94a3b8",
        }}
      >
        {data.collapsed ? "▶" : "▼"}
      </span>
    </div>
  );
}

const nodeTypes: NodeTypes = { flowNode: FlowNode, groupBoxNode: GroupBoxNode };

// Layout constants — agent group
const agentSpacing = 120;
const agentStartX = 100;
const agentY = 380;

// Layout constants — dev tool group
const DEV_TOOL_SPACING = 160;
const DEV_TOOL_START_X = 160;
const DEV_TOOL_Y = 680;
interface ReactFlowCanvasProps {
  services: HealthStatus[];
  agentCount: number;
  activeCount: number;
  memoryCount: number;
  knowledgeCount: number;
  skillCount: number;
  coverageGapsCount?: number;
  toolCapabilityCount?: number;
  toolWorkspaceCount?: number;
  topFailureAgent?: string | null;
  nodeActivity: Record<string, number>;
  highlightedNode?: string | null;
  registeredAgents?: RegisteredFlowAgent[];
  localActiveCount?: number;
  localTotalCount?: number;
  onNodeClick: (nodeId: string, nodeLabel: string, nodeIcon: string, nodeStats: Record<string, string | number>) => void;
}

const EDGE_COLORS = {
  request: "#f59e0b",
  knowledge: "#10b981",
  memory: "#0284c7",
  apo: "#6366f1",
  tools: "#06b6d4",
};

function edgeStroke(edge: Edge) {
  const stroke = edge.style?.stroke;
  return typeof stroke === "string" ? stroke : "#94a3b8";
}

function nodeAccent(node: Node) {
  const status = (node.data as { status?: string }).status;
  return (STATUS_THEME[status as keyof typeof STATUS_THEME] || STATUS_THEME.dormant).accent;
}

function absoluteNodePosition(node: Node, nodeById: Map<string, Node>) {
  let x = node.position.x;
  let y = node.position.y;
  let parentId = node.parentId;
  while (parentId) {
    const parent = nodeById.get(parentId);
    if (!parent) break;
    x += parent.position.x;
    y += parent.position.y;
    parentId = parent.parentId;
  }
  return { x, y };
}

function MiniOverview({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) {
  const visibleNodes = nodes.filter((node) => !node.hidden);
  const nodeById = new Map(visibleNodes.map((node) => [node.id, node]));
  const points = visibleNodes.flatMap((node) => {
    const position = absoluteNodePosition(node, nodeById);
    const width = typeof node.data?.width === "number" ? node.data.width : 80;
    const height = typeof node.data?.height === "number" ? node.data.height : 80;
    return [
      { x: position.x, y: position.y },
      { x: position.x + width, y: position.y + height },
    ];
  });

  if (points.length === 0) return null;

  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxX = Math.max(...points.map((point) => point.x));
  const maxY = Math.max(...points.map((point) => point.y));
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  const pad = 28;
  const viewBox = `${minX - pad} ${minY - pad} ${width + pad * 2} ${height + pad * 2}`;

  const flowNodes = visibleNodes.filter((node) => node.type !== "groupBoxNode");

  return (
    <div className="pointer-events-none absolute bottom-4 right-4 z-10 w-56 rounded-xl border border-sky-100 bg-white/95 p-3 shadow-[0_18px_50px_rgba(15,23,42,0.14)] backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Mini view</span>
        <span className="text-[10px] text-slate-400">{flowNodes.length} nodes</span>
      </div>
      <svg viewBox={viewBox} className="h-28 w-full overflow-visible rounded-lg bg-slate-50">
        <rect x={minX - pad} y={minY - pad} width={width + pad * 2} height={height + pad * 2} rx="18" fill="#f8fafc" />
        {edges.map((edge) => {
          const source = nodeById.get(edge.source);
          const target = nodeById.get(edge.target);
          if (!source || !target) return null;
          const sourcePosition = absoluteNodePosition(source, nodeById);
          const targetPosition = absoluteNodePosition(target, nodeById);
          return (
            <line
              key={edge.id}
              x1={sourcePosition.x + 38}
              y1={sourcePosition.y + 38}
              x2={targetPosition.x + 38}
              y2={targetPosition.y + 38}
              stroke={edgeStroke(edge)}
              strokeOpacity="0.36"
              strokeWidth="4"
              strokeLinecap="round"
            />
          );
        })}
        {visibleNodes.filter((node) => node.type === "groupBoxNode").map((node) => {
          const position = absoluteNodePosition(node, nodeById);
          const widthValue = typeof node.data?.width === "number" ? node.data.width : 160;
          const heightValue = typeof node.data?.height === "number" ? node.data.height : 80;
          return (
            <rect
              key={node.id}
              x={position.x}
              y={position.y}
              width={widthValue}
              height={heightValue}
              rx="18"
              fill="#e0f2fe"
              fillOpacity="0.24"
              stroke="#bae6fd"
              strokeWidth="3"
              strokeDasharray="10 8"
            />
          );
        })}
        {flowNodes.map((node) => {
          const position = absoluteNodePosition(node, nodeById);
          return (
            <circle
              key={node.id}
              cx={position.x + 38}
              cy={position.y + 38}
              r="16"
              fill={nodeAccent(node)}
              stroke="#ffffff"
              strokeWidth="5"
            />
          );
        })}
      </svg>
    </div>
  );
}

export function ReactFlowCanvas({
  services,
  agentCount,
  activeCount,
  memoryCount,
  knowledgeCount,
  skillCount,
  coverageGapsCount = 0,
  toolCapabilityCount = 0,
  toolWorkspaceCount = 0,
  topFailureAgent = null,
  nodeActivity,
  highlightedNode,
  registeredAgents = [],
  localActiveCount = 0,
  localTotalCount = 0,
  onNodeClick,
}: ReactFlowCanvasProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());

  const toggleGroup = useCallback((id: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  function getStatus(nodeId: string, agentStatus?: string): "active" | "idle" | "dormant" | "error" {
    if (agentStatus) return agentStatus === "active" ? "active" : "dormant";
    const minsAgo = nodeActivity[nodeId];
    if (minsAgo !== undefined && minsAgo < 5) return "active";
    if (minsAgo !== undefined && minsAgo < 60) return "idle";
    const svcMap: Record<string, string> = { gateways: "Agents", manager: "Paperclip", notebooks: "mem0", librarian: "QMD" };
    const svc = services.find(s => s.service === svcMap[nodeId]);
    if (svc?.status === "up") return "active";
    if (svc?.status === "down") return "error";
    return "idle";
  }

  function nodeStats(id: string): Record<string, string | number> {
    switch (id) {
      case "agents": return { "Total": agentCount, "Active": activeCount };
      case "notebooks": return { "Entries": memoryCount };
      case "librarian": return { "Docs": knowledgeCount, "Collections": 15 };
      case "cookbooks": return { "Skills": skillCount, "Gaps": coverageGapsCount, ...(topFailureAgent ? { "Top Failure": topFailureAgent } : {}) };
      case "tool-gateway": return { "Capabilities": toolCapabilityCount, "Workspaces": toolWorkspaceCount };
      case "gateways": return { "Registered": agentCount, "Active": activeCount };
      case "manager": return { "Platform": "Paperclip", "Port": "3100" };
      case "apo": return { "Mode": "QA", "Cycle": "hourly" };
      case "gitnexus": return { "Repos": 8, "Symbols": "75k+" };
      case "llmwiki": return { "Topics": 6, "Status": "active" };
      default: return {};
    }
  }

  const visibleAgents = useMemo(() => registeredAgents.slice(0, 7), [registeredAgents]);

  const nodes: Node[] = useMemo(() => {
    // Ungrouped static nodes — these stay at absolute coordinates and do NOT get parentId
    const staticNodes: Node[] = [
      { id: "request",   position: { x: 20,  y: 170 }, data: { label: "User / Telegram", subtitle: "input channel",        icon: NODE_ICONS.request, status: getStatus("request"),   highlighted: highlightedNode === "request"   }, type: "flowNode" },
      { id: "gateways",  position: { x: 160, y: 170 }, data: { label: "Gateways",         subtitle: "registered entrypoints", icon: NODE_ICONS.gateways, status: getStatus("gateways"),  highlighted: highlightedNode === "gateways"  }, type: "flowNode" },
      { id: "manager",   position: { x: 560, y: 170 }, data: { label: "Paperclip",        subtitle: "orchestrator",         icon: NODE_ICONS.manager, status: getStatus("manager"),   highlighted: highlightedNode === "manager"   }, type: "flowNode" },
      { id: "output",    position: { x: 720, y: 170 }, data: { label: "Response",         subtitle: "Discord · Telegram",   icon: NODE_ICONS.output, status: getStatus("output"),    highlighted: highlightedNode === "output"    }, type: "flowNode" },
      { id: "tunnels",   position: { x: 20,  y: 520 }, data: { label: "CF Tunnels",       subtitle: "your-tunnel.domain",  icon: NODE_ICONS.tunnels, status: getStatus("tunnels"),   highlighted: highlightedNode === "tunnels"   }, type: "flowNode" },
      { id: "taskboard", position: { x: 160, y: 520 }, data: { label: "Task Board",       subtitle: "Nerve Kanban",         icon: NODE_ICONS.taskboard, status: getStatus("taskboard"), highlighted: highlightedNode === "taskboard" }, type: "flowNode" },
      { id: "notebooks", position: { x: 460, y: 520 }, data: { label: "mem0",             subtitle: "semantic memory",      icon: NODE_ICONS.notebooks, status: getStatus("notebooks"), highlighted: highlightedNode === "notebooks" }, type: "flowNode" },
      { id: "librarian", position: { x: 600, y: 520 }, data: { label: "QMD",              subtitle: "3,445 docs",           icon: NODE_ICONS.librarian, status: getStatus("librarian"), highlighted: highlightedNode === "librarian" }, type: "flowNode" },
    ];

    // Compute aggregate health colors for each group from their children's statuses
    const agentStatuses = [
      ...visibleAgents.map(a => (a.status === "active" ? "active" : "dormant")),
      localActiveCount > 0 ? "active" : "idle",
    ];
    const devToolStatuses = ["cookbooks", "tool-gateway", "apo", "gitnexus", "llmwiki"].map(id => getStatus(id));

    // Group box nodes — parent containers; MUST appear BEFORE their children in the array.
    // These keep absolute canvas positions (they are roots, no parentId).
    // zIndex: -1 so they render behind their child nodes.
    const groupBoxNodes: Node[] = [
      {
        id: "group-agents",
        type: "groupBoxNode",
        position: { x: agentStartX - 15, y: agentY - 32 }, // { x: 85, y: 248 }
        style: { zIndex: -1 },
        data: {
          label: "Server Agents",
          width: 840,
          height: 160,
          collapsed: collapsedGroups.has("group-agents"),
          aggregateColor: aggregateHealthColor(agentStatuses),
          onToggleCollapse: () => toggleGroup("group-agents"),
        },
        selectable: false,
        draggable: false,
      },
      {
        id: "group-devtools",
        type: "groupBoxNode",
        position: { x: DEV_TOOL_START_X - 15, y: DEV_TOOL_Y - 32 }, // { x: 145, y: 528 }
        style: { zIndex: -1 },
        data: {
          label: "Dev Tools",
          width: 760,
          height: 160,
          collapsed: collapsedGroups.has("group-devtools"),
          aggregateColor: aggregateHealthColor(devToolStatuses),
          onToggleCollapse: () => toggleGroup("group-devtools"),
        },
        selectable: false,
        draggable: false,
      },
    ];

    // Agent child nodes — parent-relative positions.
    // Absolute: { x: agentStartX + i * agentSpacing, y: agentY }
    // Relative:  absolute - parent = { x: 15 + i * agentSpacing, y: 32 }
    const agentNodes: Node[] = visibleAgents.map((agent, i) => ({
      id: `agent-${agent.id}`,
      parentId: "group-agents",
      extent: "parent" as const,
      position: { x: 15 + i * agentSpacing, y: 32 },
      data: {
        label: agent.name,
        subtitle: agentSubtitle(agent),
        icon: agentIcon(agent),
        status: agent.status === "active" ? "active" : "dormant",
        highlighted: highlightedNode === `agent-${agent.id}`,
      },
      type: "flowNode",
    }));

    // Local-agents node — parent-relative position.
    // Absolute: { x: agentStartX + visibleAgents.length * agentSpacing, y: agentY }
    // Relative:  { x: 15 + visibleAgents.length * agentSpacing, y: 32 }
    const localNode: Node = {
      id: "local-agents",
      parentId: "group-agents",
      extent: "parent" as const,
      position: { x: 15 + visibleAgents.length * agentSpacing, y: 32 },
      data: {
        label: `${localActiveCount} Active`,
        subtitle: `${localTotalCount} local chefs`,
        icon: NODE_ICONS["local-agents"],
        status: localActiveCount > 0 ? "active" : "idle",
        highlighted: highlightedNode === "local-agents",
      },
      type: "flowNode",
    };

    // Dev tool child nodes — parent-relative positions.
    // Absolute: { x: DEV_TOOL_START_X + i * DEV_TOOL_SPACING, y: DEV_TOOL_Y }
    // Relative:  { x: 15 + i * DEV_TOOL_SPACING, y: 32 }
    const devToolNodes: Node[] = [
      { id: "cookbooks", data: { label: "Skills",          subtitle: skillCount > 0 ? `${skillCount} skills · ${coverageGapsCount} gaps` : "skillshare", icon: NODE_ICONS.cookbooks, status: getStatus("cookbooks"), highlighted: highlightedNode === "cookbooks" } },
      { id: "tool-gateway", data: { label: "Tool Gateway", subtitle: toolCapabilityCount > 0 ? `${toolCapabilityCount} caps · ${toolWorkspaceCount} spaces` : "progressive MCP", icon: NODE_ICONS["tool-gateway"], status: getStatus("tool-gateway"), highlighted: highlightedNode === "tool-gateway" } },
      { id: "apo",       data: { label: "Agent Lightning", subtitle: "APO · hourly",        icon: NODE_ICONS.apo, status: getStatus("apo"),       highlighted: highlightedNode === "apo"       } },
      { id: "gitnexus",  data: { label: "GitNexus",        subtitle: "code graph",          icon: NODE_ICONS.gitnexus, status: getStatus("gitnexus"),  highlighted: highlightedNode === "gitnexus"  } },
      { id: "llmwiki",   data: { label: "LLM Wiki",        subtitle: "knowledge wiki",      icon: NODE_ICONS.llmwiki, status: getStatus("llmwiki"),   highlighted: highlightedNode === "llmwiki"   } },
    ].map((node, i) => ({
      ...node,
      parentId: "group-devtools",
      extent: "parent" as const,
      position: { x: 15 + i * DEV_TOOL_SPACING, y: 32 },
      type: "flowNode",
    }));

    // CRITICAL: group box nodes MUST come before their children (React Flow v12 parentId requirement)
    const baseNodes = [...groupBoxNodes, ...staticNodes, ...agentNodes, localNode, ...devToolNodes];
    return applyCollapseToNodes(baseNodes, collapsedGroups);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleAgents, nodeActivity, highlightedNode, localActiveCount, localTotalCount, collapsedGroups, toggleGroup, skillCount, coverageGapsCount, topFailureAgent, toolCapabilityCount, toolWorkspaceCount]);

  // Derive hidden node IDs from the processed nodes array (after collapse applied)
  const hiddenNodeIds = useMemo(
    () => new Set(nodes.filter(n => n.hidden).map(n => n.id)),
    [nodes]
  );

  const allAgentIds = useMemo(
    () => [...visibleAgents.map(a => `agent-${a.id}`), "local-agents"],
    [visibleAgents]
  );

  const edges: Edge[] = useMemo(() => {
    const base: Edge[] = [
      { id: "req-gw",  source: "request",  target: "gateways",  animated: true, style: { stroke: EDGE_COLORS.request,   strokeWidth: 2 } },
      { id: "gw-mgr", source: "gateways", target: "manager",   animated: true, style: { stroke: EDGE_COLORS.request,   strokeWidth: 2 } },
      { id: "mgr-out", source: "manager",  target: "output",    animated: true, style: { stroke: EDGE_COLORS.request,   strokeWidth: 2 } },
      { id: "gw-tun",  source: "gateways", target: "tunnels",   animated: true, style: { stroke: EDGE_COLORS.request,   strokeWidth: 2 } },
      { id: "mgr-tb",  source: "manager",  target: "taskboard", animated: true, style: { stroke: EDGE_COLORS.request,   strokeWidth: 2 } },
      { id: "apo-sk",  source: "apo",      target: "cookbooks", animated: true, style: { stroke: EDGE_COLORS.apo,       strokeWidth: 2 } },
    ];

    const agentEdges: Edge[] = allAgentIds.flatMap((id) => [
      { id: `mgr-${id}`,  source: "manager",   target: id,          animated: true, style: { stroke: EDGE_COLORS.request,   strokeWidth: 1.5 } },
      { id: `${id}-mem`,  source: id,           target: "notebooks", animated: true, style: { stroke: EDGE_COLORS.memory,    strokeWidth: 1 } },
      { id: `${id}-qmd`,  source: id,           target: "librarian", animated: true, style: { stroke: EDGE_COLORS.knowledge, strokeWidth: 1 } },
      { id: `${id}-sk`,   source: id,           target: "cookbooks", animated: true, style: { stroke: EDGE_COLORS.knowledge, strokeWidth: 1 } },
    ]).slice(0, 20);

    const extraEdges: Edge[] = [
      { id: "agents-apo",  source: "local-agents", target: "apo",      animated: true, style: { stroke: EDGE_COLORS.apo,       strokeWidth: 1.5 } },
      { id: "agents-tools", source: "local-agents", target: "tool-gateway", animated: true, style: { stroke: EDGE_COLORS.tools, strokeWidth: 1.5 } },
      { id: "agents-gnx",  source: "local-agents", target: "gitnexus", animated: true, style: { stroke: EDGE_COLORS.knowledge, strokeWidth: 1.5 } },
      { id: "agents-wiki", source: "local-agents", target: "llmwiki",  animated: true, style: { stroke: EDGE_COLORS.knowledge, strokeWidth: 1.5 } },
    ];

    const allEdges = [...base, ...agentEdges, ...extraEdges];
    return applyCollapseToEdges(allEdges, hiddenNodeIds);
  }, [allAgentIds, hiddenNodeIds]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    // Group box node clicks are handled by the node's own onClick (onToggleCollapse in data)
    if (node.type === "groupBoxNode") return;
    const statsId = node.id.startsWith("agent-") ? node.id.replace("agent-", "") : node.id;
    const agent = node.id.startsWith("agent-") ? visibleAgents.find((candidate) => candidate.id === statsId) : null;
    const stats = agent ? agentStats(agent) : nodeStats(statsId);
    onNodeClick(node.id, node.data.label as string, node.data.icon as string, stats);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onNodeClick]);

  return (
    <div className="relative h-[640px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <div className="pointer-events-none absolute left-5 top-4 z-10 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 shadow-sm">
        Live topology
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        defaultViewport={{ x: 220, y: 15, zoom: 0.72 }}
        minZoom={0.3}
        maxZoom={2}
        attributionPosition="bottom-left"
        colorMode="light"
      >
        <Background color="#dbeafe" gap={28} size={1.2} variant={BackgroundVariant.Dots} />
        <Controls className="flow-controls-paperclip" />
      </ReactFlow>
      <MiniOverview nodes={nodes} edges={edges} />
    </div>
  );
}
