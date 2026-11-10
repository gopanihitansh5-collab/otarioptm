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
}: CanvasProps) {
  const rf = useReactFlow();

  useEffect(() => {
    const t = setTimeout(() => {
      rf.fitView({ padding: 0.25 });
    }, 100);
    return () => clearTimeout(t);
  }, [rf]);

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
      fitViewOptions={{ padding: 0.25 }}
      minZoom={0.25}
      maxZoom={2.5}
      className="h-full w-full"
      defaultEdgeOptions={{
        type: "smoothstep",
        animated: true,
        style: { stroke: "#6366f1", strokeWidth: 1.5 },
      }}
      onNodeClick={(_: unknown, node: { id: string }) => {
        if (!onNodeClick) return;
        const found = nodes.find((n) => n.id === node.id);
        if (found) onNodeClick(found);
      }}
      onPaneClick={onPaneClick}
    >
      <Background
        color="rgba(255,255,255,0.06)"
        bgColor="#0f0f10"
        gap={24}
        size={1}
        variant={BackgroundVariant.Dots}
      />
      <Controls />
      <MiniMap pannable zoomable nodeColor="#3f3f46" maskColor="rgba(0,0,0,0.6)" />
    </ReactFlow>
  );
}
