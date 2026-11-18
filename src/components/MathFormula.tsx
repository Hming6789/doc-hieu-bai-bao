"use client";

import React, { useMemo } from "react";
import katex from "katex";

interface MathFormulaProps {
  latex: string;
  displayMode?: boolean;
}

export function MathFormula({ latex, displayMode = true }: MathFormulaProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        strict: false,
      });
    } catch {
      return null;
    }
  }, [latex, displayMode]);

  if (!html) {
    return (
      <code className="block overflow-x-auto rounded bg-slate-100 px-3 py-2 font-mono text-sm text-slate-800">
        {latex}
      </code>
    );
  }

  return (
    <div
      className="overflow-x-auto py-1 text-slate-900"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
