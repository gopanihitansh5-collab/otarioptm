import { NodeOnClickProps, ReactFlowExt, useReactFlow } from "reactflow";
import { useEffect } from "react";

export const Canvas = () => {
  const { getNodes, getEdges, onConnect, setNodePositions, fitView } = useReactFlow();

  useEffect(() => {
    fitView({ padding: 30 });
  }, [getNodes]);

  const handleConnect = ({ from, to }: { from: string; to: string }) => {
    onConnect({ from, to });
  };

  return null;
};