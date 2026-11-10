export type NodeType = "chat" | "web-search" | "code-exec" | "guardrails";

export type NodeRunStatus = "idle" | "running" | "done" | "error" | "skipped";

export type WorkflowNodeData = {
  label: string;
  system?: string;
  prompt?: string;
  query?: string;
  code?: string;
  banned?: string[];
  stop_on_block?: boolean;
  status?: NodeRunStatus;
  statusInfo?: StepResult | null;
};

export type WorkflowNode = {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: WorkflowNodeData;
};

export type WorkflowEdge = {
  id: string;
  source: string;
  target: string;
};

export type GuardViolation = { rule: string; sample: string };

export type StepResult = {
  nodeId: string;
  type?: NodeType;
  output?: string;
  model?: string | null;
  chain?: string[];
  tokens?: number;
  cost?: number;
  latencyMs?: number;
  routing?: string;
  demo?: boolean;
  blocked?: boolean;
  violations?: GuardViolation[];
  error?: string;
};

export type BudgetSnapshot = {
  cap: number;
  spent: number;
  reserved: number;
  committed: number;
  remaining: number;
};

export type ActivityEvent = { event: string; ts: number } & Record<string, unknown>;

export type RunResponse = {
  steps: StepResult[];
  budget: BudgetSnapshot;
  aborted: string | null;
};

export type CatalogModel = {
  id: string;
  name?: string;
  cost_per_token?: number;
  latency?: number;
  health?: number;
};

export type HealthResponse = {
  status: string;
  otari: boolean;
  groq: boolean;
  budget: BudgetSnapshot;
};

export const NODE_LABELS: Record<NodeType, string> = {
  chat: "Model Chat",
  "web-search": "Web Search",
  "code-exec": "Code Exec",
  guardrails: "Guardrails",
};
