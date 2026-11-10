import { NodeChat } from "./nodes/NodeChat";
import { NodeWebSearch } from "./nodes/NodeWebSearch";
import { NodeCodeExec } from "./nodes/NodeCodeExec";
import { NodeGuardrails } from "./nodes/NodeGuardrails";

export const nodeTypes = {
  chat: NodeChat,
  "web-search": NodeWebSearch,
  "code-exec": NodeCodeExec,
  guardrails: NodeGuardrails,
};
