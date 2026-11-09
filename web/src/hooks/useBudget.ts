import { useEffect, useState } from "react";

export const useBudget = () => {
  const [spent, setSpent] = useState("0.000");
  const [remaining, setRemaining] = useState("0.000");
  const [cap, setCap] = useState("100.000");
  const [progress, setProgress] = useState(0);
  const [color, setColor] = useState("green");
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let mounted = true;
    const ws = new WebSocket("ws://localhost:8000/api/v1/activity");

    ws.onopen = () => {
      if (mounted) setIsConnected(true);
    };

    ws.onmessage = (event) => {
      if (!mounted) return;
      const data = JSON.parse(event.data);
      setSpent(data.spent || "0.000");
      setRemaining(data.remaining || "0.000");
      setCap(data.cap || "100.000");
      const p = Math.min(100, (parseFloat(data.spent) / parseFloat(data.cap)) * 100);
      setProgress(p);
      if (p > 90) setColor("red");
      else if (p > 70) setColor("orange");
      else setColor("green");
    };

    ws.onclose = () => {
      if (mounted) setIsConnected(false);
    };

    ws.onerror = () => {
      if (mounted) setIsConnected(false);
    };

    return () => {
      mounted = false;
      ws.close();
    };
  }, []);

  return { spent, remaining, cap, progress, color, isConnected };
};