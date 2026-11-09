"use client";

import { useState, useEffect } from "react";
import { useApi } from "@/api/otariClient";
import { useWorkflowState } from "@/hooks/useWorkflowState";

export const NodeChat = () => {
  const { sendChat, getModels } = useApi();
  const { addNode, nodes } = useWorkflowState();
  const [model, setModel] = useState<string>("anthropic:claude-sonnet-4-6");
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([
    { role: "assistant", content: "Hello! I'm OtariOptm. How can I help you?" }
  ]);
  const [input, setInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [tokenCount, setTokenCount] = useState(0);
  const [cost, setCost] = useState(0);

  const availableModels = [
    "anthropic:claude-sonnet-4-6",
    "anthropic:claude-3-5-sonnet-4-0",
    "openai:gpt-4o",
    "openai:gpt-4o-mini",
    "google:gemini-1.5-pro",
  ];

  const handleSend = async () => {
    if (!input.trim() || isRunning) return;
    setIsRunning(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: input },
    ]);

    try {
      const response = await sendChat(messages.concat([{ role: "user", content: input }]), model);
      // Parse streamed response
      const content = response.message || response.text || JSON.stringify(response);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content },
      ]);
      setTokenCount((prev) => prev + (response.tokens || 0));
      setCost((prev) => prev + (response.cost || 0));
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Unknown error"}` },
      ]);
    } finally {
      setIsRunning(false);
      setInput("");
    }
  };

  return null;
};