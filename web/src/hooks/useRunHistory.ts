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
    const loaded = loadRunHistory();
    // A run can be recorded before this effect runs. Merge instead of
    // overwriting so an early run is never lost.
    const pending = runsRef.current;
    const merged = [...pending, ...loaded]
      .filter((run, index, all) => all.findIndex((r) => r.id === run.id) === index)
      .slice(0, MAX_RUNS);
    runsRef.current = merged;
    setRuns(merged);
    if (pending.length > 0) saveRunHistory(merged);
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
