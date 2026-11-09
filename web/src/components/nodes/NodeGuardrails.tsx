"use client";

import { useState } from "react";

export const NodeGuardrails = () => {
  const [rules, setRules] = useState<Array<{ id: string; name: string; regex?: string }>>([
    { id: "1", name: "PII Detection", regex: "\\b\\d{3}-\\d{2}-\\d{4}\\b" },
    { id: "2", name: "Profanity Filter", regex: "\\b(damn|hell|shit)\\b" },
    { id: "3", name: "Custom Regex", regex: "" },
  ]);
  const [selectedRule, setSelectedRule] = useState(rules[0]);
  const [testInput, setTestInput] = useState("");
  const [result, setResult] = useState<{ passed: boolean; reason: string } | null>(null);

  const testRule = () => {
    const regex = selectedRule.regex || testInput;
    if (!regex) {
      setResult({ passed: true, reason: "No regex provided" });
      return;
    }
    const regexObj = new RegExp(regex, "i");
    const matches = regexObj.test(testInput);
    setResult({
      passed: !matches,
      reason: matches
        ? `Input contains disallowed content matching: ${regex}`
        : "Input passes guardrail",
    });
  };

  return null;
};