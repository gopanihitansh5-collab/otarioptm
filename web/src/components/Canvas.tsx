"use client";

import { useEffect, useState } from "react";
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

  // Follow the app theme (data-theme on <html>): the canvas, edges and
  // minimap flip between obsidian and the light lavender surface.
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const read = () =>
      setTheme(
        document.documentElement.dataset.theme === "light" ? "light" : "dark",
      );
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => obs.disconnect();
  }, []);
  const light = theme === "light";
  const edgeStroke = light ? "rgba(88, 71, 158, 0.55)" : "rgba(184, 169, 143, 0.55)";

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
      colorMode={theme}
      fitView
      fitViewOptions={{ padding: 0.25, maxZoom: 1.1 }}
      minZoom={0.25}
      maxZoom={2.5}
      className="h-full w-full"
      defaultEdgeOptions={{
        type: "smoothstep",
        animated,
        style: { stroke: edgeStroke, strokeWidth: 1.5 },
      }}
      onNodeClick={(_: unknown, node: { id: string }) => {
        if (!onNodeClick) return;
        const found = nodes.find((n) => n.id === node.id);
        if (found) onNodeClick(found);
      }}
      onPaneClick={onPaneClick}
    >
      <Background
        color={light ? "rgba(88, 71, 158, 0.14)" : "rgba(255,255,255,0.05)"}
        bgColor={light ? "#F6F5FC" : "#111110"}
        gap={24}
        size={1}
        variant={BackgroundVariant.Dots}
      />
      <Controls />
      <MiniMap
        pannable
        zoomable
        nodeColor={light ? "#DCD8ED" : "#34322D"}
        maskColor={light ? "rgba(240, 237, 247, 0.7)" : "rgba(9, 11, 13, 0.65)"}
      />
    </ReactFlow>
  );
}
