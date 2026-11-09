"use client";

import { useState } from "react";

export const NodeBudgetMeter = () => {
  const [spent, setSpent] = useState("0.000");
  const [cap, setCap] = useState("100.000");
  const [progress, setProgress] = useState(0);
  const [color, setColor] = useState("green");

  const updateBudget = (data: { spent: string; cap: string }) => {
    setSpent(data.spent);
    setCap(data.cap);
    const p = Math.min(100, (parseFloat(data.spent) / parseFloat(data.cap)) * 100);
    setProgress(p);
    if (p > 90) setColor("red");
    else if (p > 70) setColor("orange");
    else setColor("green");
  };

  // Subscribe to WebSocket updates
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/api/v1/activity");
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      updateBudget({ spent: data.spent || "0.000", cap: data.cap || "100.000" });
    };

    return () => ws.close();
  }, []);

  return null;
};