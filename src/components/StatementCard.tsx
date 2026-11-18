"use client";

import React from "react";
import { BookOpen, Compass, FileCheck2, Info } from "lucide-react";
import type {
  GroundedStatement,
  ResolvedCitation,
  StatementType,
} from "@/types/paper";

interface StatementListProps {
  statements: GroundedStatement[];
  citationMap: Record<string, ResolvedCitation>;
  onSelectCitation: (anchor: ResolvedCitation) => void;
  emptyText?: string;
}

function getBadgeStyle(type: StatementType): {
  label: string;
  className: string;
  Icon: React.ComponentType<{ className?: string }>;
} {
  switch (type) {
    case "author_claim":
      return {
        label: "Tác giả trình bày",
        className:
          "bg-emerald-50 text-emerald-800 border-emerald-200",
        Icon: FileCheck2,
      };
    case "ai_explanation":
      return {
        label: "Diễn giải của AI",
        className: "bg-sky-50 text-sky-800 border-sky-200",
        Icon: BookOpen,
      };
    case "methodological_note":
      return {
        label: "Nhận xét & Lưu ý phương pháp",
        className: "bg-indigo-50 text-indigo-800 border-indigo-200",
        Icon: Compass,
      };
    case "external_background":
      return {
        label: "Kiến thức nền ngoài bài báo",
        className: "bg-amber-50 text-amber-900 border-amber-200",
        Icon: Info,
      };
  }
}

export function StatementList({
  statements,
  citationMap,
  onSelectCitation,
  emptyText = "Không nêu trong bài báo.",
}: StatementListProps) {
  if (!statements || statements.length === 0) {
    return (
      <p className="text-sm italic text-slate-500">{emptyText}</p>
    );
  }

  return (
    <div className="space-y-2.5">
      {statements.map((st, idx) => {
        const { label, className, Icon } = getBadgeStyle(st.statementType);
        const anchors = st.citationIds
          .map((cid) => citationMap[cid])
          .filter(Boolean);

        return (
          <div
            key={idx}
            className="rounded-lg border border-slate-200/90 bg-white p-3.5 shadow-2xs transition-colors hover:border-slate-300"
          >
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${className}`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
              </span>

              {anchors.map((anchor) => {
                const dualPageLabel =
                  anchor.printedPage &&
                  anchor.printedPage !== String(anchor.pdfPage)
                    ? `PDF tr.${anchor.pdfPage} | Bài tr.${anchor.printedPage}`
                    : `PDF tr.${anchor.pdfPage}`;
                return (
                  <button
                    key={anchor.chunkId}
                    type="button"
                    onClick={() => onSelectCitation(anchor)}
                    title={`Bấm để mở đúng vị trí trên PDF gốc:\n"${anchor.snippet}"`}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-teal-200 bg-teal-50/80 px-2 py-0.5 text-xs font-medium text-teal-800 transition hover:border-teal-400 hover:bg-teal-100"
                  >
                    <span>↗ {dualPageLabel}</span>
                  </button>
                );
              })}
            </div>

            <p className="text-[15px] leading-relaxed text-slate-800">
              {st.textVi}
            </p>

            {st.externalSource && (
              <p className="mt-1.5 text-xs text-slate-600">
                <span className="font-medium">Nguồn đối chiếu ngoài bài:</span>{" "}
                {st.externalSource}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
