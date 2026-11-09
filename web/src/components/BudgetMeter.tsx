import { useEffect, useState } from "react";

export const BudgetMeter = () => {
  const [spent, setSpent] = useState("0.000");
  const [remaining, setRemaining] = useState("0.000");
  const [cap, setCap] = useState("100.000");
  const [progress, setProgress] = useState(0);
  const [color, setColor] = useState("green");

  useEffect(() => {
    let mounted = true;
    const ws = new WebSocket("ws://localhost:8000/api/v1/activity");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (mounted) {
        setSpent(data.spent || "0.000");
        setRemaining(data.remaining || "0.000");
        setCap(data.cap || "100.000");
        const p = Math.min(100, (parseFloat(data.spent) / parseFloat(data.cap)) * 100);
        setProgress(p);
        if (p > 90) setColor("red");
        else if (p > 70) setColor("orange");
        else setColor("green");
      }
    };

    return () => {
      mounted = false;
      ws.close();
    };
  }, []);

  return null;
};