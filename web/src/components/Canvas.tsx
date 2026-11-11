"use client";

import { useEffect } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
} from "@xyflow/react";
import type { WorkflowEdge, WorkflowNode } from "@/lib/types";
import type {
  Connection,
  EdgeChange,
  NodeChange,
  NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

type CanvasProps = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  nodeTypes: NodeTypes;
  onNodeClick?: (node: WorkflowNode) => void;
  onPaneClick?: () => void;
  animated?: boolean;
  fitKey?: number;
};

export function Canvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  nodeTypes,
  onNodeClick,
  onPaneClick,
  animated = false,
  fitKey = 0,
}: CanvasProps) {
  const rf = useReactFlow();
  const nodeCount = nodes.length;

  // Keep every node in view: refit whenever the node count changes or the
  // graph is replaced (template load / import), capped at a readable zoom so
  // a single node never fills the screen.
  useEffect(() => {
    const t = setTimeout(() => {
      rf.fitView({ padding: 0.25, maxZoom: 1.1 });
    }, 100);
    return () => clearTimeout(t);
  }, [rf, nodeCount, fitKey]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      colorMode="dark"
      fitView
      fitViewOptions={{ padding: 0.25, maxZoom: 1.1 }}
      minZoom={0.25}
      maxZoom={2.5}
      className="h-full w-full"
      defaultEdgeOptions={{
        type: "smoothstep",
        animated,
        style: { stroke: "rgba(184, 169, 143, 0.55)", strokeWidth: 1.5 },
      }}
      onNodeClick={(_: unknown, node: { id: string }) => {
        if (!onNodeClick) return;
        const found = nodes.find((n) => n.id === node.id);
        if (found) onNodeClick(found);
      }}
      onPaneClick={onPaneClick}
    >
      <Background
        color="rgba(255,255,255,0.05)"
        bgColor="#111110"
        gap={24}
        size={1}
        variant={BackgroundVariant.Dots}
      />
      <Controls />
      <MiniMap pannable zoomable nodeColor="#34322D" maskColor="rgba(9, 11, 13, 0.65)" />
    </ReactFlow>
  );
}
