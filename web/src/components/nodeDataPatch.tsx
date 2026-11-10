"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { WorkflowNodeData } from "@/lib/types";

export type NodePatch = (id: string, patch: Partial<WorkflowNodeData>) => void;

export const nodePatchContext = createContext<NodePatch>(() => {});

export function NodePatchProvider({
  onPatch,
  children,
}: {
  onPatch: NodePatch;
  children: ReactNode;
}) {
  return <nodePatchContext.Provider value={onPatch}>{children}</nodePatchContext.Provider>;
}

export function useNodePatch(): NodePatch {
  return useContext(nodePatchContext);
}
