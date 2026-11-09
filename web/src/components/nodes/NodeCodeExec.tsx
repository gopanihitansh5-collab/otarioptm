"use client";

import { useState } from "react";

export const NodeCodeExec = () => {
  const [code, setCode] = useState("print('Hello, OtariOptm!');");
  const [output, setOutput] = useState<string>("> ");
  const [isRunning, setIsRunning] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  const TIMEOUT = 5000;

  const runCode = () => {
    setIsRunning(true);
    setTimedOut(false);
    setOutput("> " + code + "\n");

    const start = Date.now();
    const wrapper = `
      (function() {
        ${code}
      })();
    `;

    const timeout = setTimeout(() => {
      setTimedOut(true);
      setOutput("Execution timed out after 5s");
      setIsRunning(false);
    }, TIMEOUT);

    try {
      eval(wrapper);
    } catch (err: any) {
      setOutput(`Error: ${err.message}`);
    } finally {
      clearTimeout(timeout);
      setIsRunning(false);
    }
  };

  return null;
};