"use client";

import { useState } from "react";

export const NodeExport = () => {
  const [isSaved, setIsSaved] = useState(false);

  const saveWorkflow = () => {
    const data = {
      nodes: [],
      edges: [],
    };
    localStorage.setItem("otarioptm_workflow", JSON.stringify(data));
    setIsSaved(true);
  };

  const loadWorkflow = () => {
    const data = localStorage.getItem("otarioptm_workflow");
    if (data) {
      const parsed = JSON.parse(data);
      // Would dispatch to workflow state here
    }
  };

  return null;
};