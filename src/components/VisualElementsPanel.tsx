"use client";

import React from "react";
import { AlertTriangle, Calculator, ImageIcon, Table2 } from "lucide-react";
import { MathFormula } from "./MathFormula";
import type {
  ExplainedVisualElement,
  ResolvedCitation,
} from "@/types/paper";

interface VisualElementsPanelProps {
  elements: ExplainedVisualElement[];
  citationMap: Record<string, ResolvedCitation>;
  onJumpToElement: (el: ExplainedVisualElement) => void;
}

export function VisualElementsPanel({
  elements,
  onJumpToElement,
}: VisualElementsPanelProps) {
  if (!elements || elements.length === 0) {
    return (
      <p className="text-sm italic text-slate-500">
        Chưa ghi nhận bảng, hình hoặc công thức đánh số riêng biệt.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {elements.map((el) => {
        const pageTag =
          el.printedPage && el.printedPage !== String(el.pdfPage)
            ? `PDF tr.${el.pdfPage} | Bài tr.${el.printedPage}`
            : `PDF tr.${el.pdfPage}`;

        const KindIcon =
          el.kind === "table"
            ? Table2
            : el.kind === "equation"
            ? Calculator
            : ImageIcon;

        return (
          <div
            key={el.elementId}
            className={`rounded-xl border p-4 shadow-2xs ${
              el.readable
                ? "border-slate-200 bg-white"
                : "border-amber-300 bg-amber-50/50"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <KindIcon className="h-4 w-4" />
                </span>
                <h4 className="font-semibold text-slate-900">{el.label}</h4>
              </div>

              <button
                type="button"
                onClick={() => onJumpToElement(el)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 hover:border-teal-400 hover:bg-teal-100"
              >
                ↗ Đối chiếu tại {pageTag}
              </button>
            </div>

            {!el.readable ? (
              <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-100/60 p-3 text-sm text-amber-950">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <div>
                  <p className="font-semibold">
                    Nội dung gốc mờ hoặc thiếu ký tự — Hệ thống không tự suy
                    đoán số liệu
                  </p>
                  <p className="mt-0.5 text-amber-900">
                    {el.unreadableReasonVi ||
                      "Vui lòng bấm nút đối chiếu để kiểm tra trực tiếp hình ảnh trên tệp PDF gốc."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-2.5 text-sm leading-relaxed text-slate-700">
                {el.formulaDetails && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <MathFormula latex={el.formulaDetails.latex} />
                    {el.formulaDetails.variables.length > 0 && (
                      <div className="mt-2.5 overflow-x-auto">
                        <table className="w-full border-collapse text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500">
                              <th className="py-1.5 pr-3 font-medium">
                                Biến / Ký hiệu
                              </th>
                              <th className="py-1.5 pr-3 font-medium">
                                Ý nghĩa trong bài
                              </th>
                              <th className="py-1.5 font-medium">
                                Đơn vị / Thứ nguyên
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/70">
                            {el.formulaDetails.variables.map((v, vIdx) => (
                              <tr key={vIdx}>
                                <td className="py-1.5 pr-3 font-mono font-semibold text-teal-900">
                                  <MathFormula
                                    latex={v.symbol}
                                    displayMode={false}
                                  />
                                </td>
                                <td className="py-1.5 pr-3 text-slate-800">
                                  {v.meaningVi}
                                </td>
                                <td className="py-1.5 text-slate-600">
                                  {v.unitOrDimension}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {el.formulaDetails.assumptionsVi && (
                      <p className="mt-2 border-t border-slate-200 pt-2 text-xs text-slate-600">
                        <span className="font-semibold text-slate-700">
                          Giả định công thức:
                        </span>{" "}
                        {el.formulaDetails.assumptionsVi}
                      </p>
                    )}
                  </div>
                )}

                <p>
                  <span className="font-semibold text-slate-900">
                    Cách đọc:{" "}
                  </span>
                  {el.howToReadVi}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">
                    Nội dung thể hiện:{" "}
                  </span>
                  {el.contentSummaryVi}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">
                    Vai trò trong lập luận:{" "}
                  </span>
                  {el.roleInArgumentVi}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
