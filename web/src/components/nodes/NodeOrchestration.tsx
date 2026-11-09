"use client";

import { useState } from "react";

export const NodeOrchestration = () => {
  const [steps, setSteps] = useState<Array<{ id: string; name: string; condition?: string; active: boolean }>>([]);
  const [newStep, setNewStep] = useState("");

  const addStep = () => {
    if (!newStep.trim()) return;
    const step = { id: Math.random().toString(36).substring(2, 9), name: newStep, active: true };
    setSteps((prev) => [...prev, step]);
    setNewStep("");
  };

  const removeStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  return null;
};