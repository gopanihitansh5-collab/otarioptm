"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MAX_RUNS,
  loadRunHistory,
  saveRunHistory,
  type RunRecord,
} from "@/lib/workflow/runHistory";

export function useRunHistory(): {
  runs: RunRecord[];
  recordRun: (record: RunRecord) => void;
  clearRuns: () => void;
} {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const runsRef = useRef<RunRecord[]>([]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const loaded = loadRunHistory();
      runsRef.current = loaded;
      setRuns(loaded);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const recordRun = useCallback((record: RunRecord) => {
    const next = [record, ...runsRef.current].slice(0, MAX_RUNS);
    runsRef.current = next;
    saveRunHistory(next);
    setRuns(next);
  }, []);

  const clearRuns = useCallback(() => {
    runsRef.current = [];
    saveRunHistory([]);
    setRuns([]);
  }, []);

  return { runs, recordRun, clearRuns };
}
