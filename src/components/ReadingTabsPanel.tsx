"use client";

import React, { useState } from "react";
import {
  Cpu,
  Droplets,
  FlaskConical,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import { StatementList } from "./StatementCard";
import { VisualElementsPanel } from "./VisualElementsPanel";
import type {
  DeepSectionExplanation,
  DepthLevel,
  DetectedSection,
  ExplainedVisualElement,
  PaperAnalysisResult,
  ResolvedCitation,
} from "@/types/paper";

export type ReadingModeTab = "quick" | "full" | "deep" | "glossary";

interface ReadingTabsPanelProps {
  activeTab: ReadingModeTab;
  analysis: PaperAnalysisResult;
  sections: DetectedSection[];
  citationMap: Record<string, ResolvedCitation>;
  deepExplanations: Record<string, DeepSectionExplanation>;
  selectedSectionId: string;
  onSelectSectionId: (sectionId: string) => void;
  onRequestDeepRead: (sectionId: string, depth: DepthLevel) => Promise<void>;
  deepLoading: boolean;
  deepError: string | null;
  onSelectCitation: (anchor: ResolvedCitation) => void;
  onJumpToElement: (el: ExplainedVisualElement) => void;
  onJumpToPdfPage: (pdfPage: number) => void;
}

function SectionBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {children}
    </section>
  );
}

export function ReadingTabsPanel({
  activeTab,
  analysis,
  sections,
  citationMap,
  deepExplanations,
  selectedSectionId,
  onSelectSectionId,
  onRequestDeepRead,
  deepLoading,
  deepError,
  onSelectCitation,
  onJumpToElement,
  onJumpToPdfPage,
}: ReadingTabsPanelProps) {
  const [depth, setDepth] = useState<DepthLevel>("basic");
  const [glossaryFilter, setGlossaryFilter] = useState("");

  if (activeTab === "quick") {
    const q = analysis.quickRead;
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-teal-800">
            <span className="rounded-md bg-teal-100 px-2 py-0.5">
              {analysis.domainLabelVi}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-600">
              {analysis.fullAnalysis.paperInfo.venueAndYear}
            </span>
          </div>
          <h2 className="mt-1.5 text-lg font-bold leading-snug text-slate-900">
            {analysis.fullAnalysis.paperInfo.titleEn}
          </h2>
          <p className="mt-1 text-sm text-slate-700">
            {analysis.fullAnalysis.paperInfo.titleViExplanation}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {analysis.honestyDisclaimerVi}
          </p>
        </div>

        <SectionBlock title="1. Bài báo nghiên cứu vấn đề gì?">
          <StatementList
            statements={q.researchProblem}
            citationMap={citationMap}
            onSelectCitation={onSelectCitation}
          />
        </SectionBlock>

        <SectionBlock title="2. Vì sao vấn đề này quan trọng?">
          <StatementList
            statements={q.whyItMatters}
            citationMap={citationMap}
            onSelectCitation={onSelectCitation}
          />
        </SectionBlock>

        <SectionBlock title="3. Tác giả đã làm gì?">
          <StatementList
            statements={q.whatAuthorsDid}
            citationMap={citationMap}
            onSelectCitation={onSelectCitation}
          />
        </SectionBlock>

        <SectionBlock title="4. Kết quả nổi bật là gì?">
          <StatementList
            statements={q.keyFindings}
            citationMap={citationMap}
            onSelectCitation={onSelectCitation}
          />
        </SectionBlock>

        <SectionBlock title="5. Ý nghĩa chính và hạn chế cần nhớ là gì?">
          <StatementList
            statements={q.significanceAndLimitations}
            citationMap={citationMap}
            onSelectCitation={onSelectCitation}
          />
        </SectionBlock>
      </div>
    );
  }

  if (activeTab === "full") {
    const fa = analysis.fullAnalysis;
    const ds = fa.domainSpecific;

    return (
      <div className="space-y-7">
        {/* 1. Paper Info */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <h3 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
            1. Thông tin bài báo
          </h3>
          <p className="mt-1.5 text-base font-bold text-slate-900">
            {fa.paperInfo.titleEn}
          </p>
          <p className="mt-0.5 text-sm text-teal-900">
            {fa.paperInfo.titleViExplanation}
          </p>
          <dl className="mt-3 grid gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600 sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-slate-800">Tác giả:</dt>
              <dd>{fa.paperInfo.authors}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-800">
                Nơi công bố / Năm:
              </dt>
              <dd>{fa.paperInfo.venueAndYear}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-800">DOI / Định danh:</dt>
              <dd>{fa.paperInfo.doiOrIdentifier}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-800">Ghi chú trích xuất:</dt>
              <dd>{fa.paperInfo.publicationNoteVi}</dd>
            </div>
          </dl>
        </div>

        <SectionBlock title="2. Bối cảnh và khoảng trống nghiên cứu">
          <StatementList
            statements={fa.contextAndResearchGap}
            citationMap={citationMap}
            onSelectCitation={onSelectCitation}
          />
        </SectionBlock>

        <SectionBlock title="3. Mục tiêu, câu hỏi hoặc giả thuyết nghiên cứu">
          <StatementList
            statements={fa.objectivesQuestionsHypotheses}
            citationMap={citationMap}
            onSelectCitation={onSelectCitation}
          />
        </SectionBlock>

        <SectionBlock title="4. Dữ liệu và phương pháp tổng quát">
          <StatementList
            statements={fa.dataAndMethodsOverview}
            citationMap={citationMap}
            onSelectCitation={onSelectCitation}
          />
        </SectionBlock>

        {/* Domain-Adaptive Deep Block */}
        <div className="rounded-2xl border border-teal-200/90 bg-teal-50/35 p-4 sm:p-5 space-y-5">
          <div className="flex items-center gap-2 border-b border-teal-200/70 pb-3">
            {ds.domain === "AI_ML" ? (
              <Cpu className="h-5 w-5 text-teal-800" />
            ) : ds.domain === "HYDROPOWER_WATER" ? (
              <Droplets className="h-5 w-5 text-teal-800" />
            ) : (
              <FlaskConical className="h-5 w-5 text-teal-800" />
            )}
            <div>
              <h3 className="text-base font-bold text-teal-950">
                Phân tích chuyên biệt theo lĩnh vực: {analysis.domainLabelVi}
              </h3>
              <p className="text-xs text-teal-900/80">{analysis.domainReasonVi}</p>
            </div>
          </div>

          {ds.domain === "AI_ML" && (
            <>
              <SectionBlock title="4A. Bài toán & Dữ liệu huấn luyện / kiểm tra">
                <StatementList
                  statements={ds.problemAndData}
                  citationMap={citationMap}
                  onSelectCitation={onSelectCitation}
                />
              </SectionBlock>

              <SectionBlock title="4B. Kiến trúc Mô hình & Cách huấn luyện">
                <StatementList
                  statements={ds.modelAndTraining}
                  citationMap={citationMap}
                  onSelectCitation={onSelectCitation}
                />
              </SectionBlock>

              <SectionBlock title="4C. Giải thích các chỉ số đánh giá (Evaluation Metrics)">
                <div className="grid gap-3 sm:grid-cols-2">
                  {ds.evaluationMetrics.map((m, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 bg-white p-3.5 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="font-bold text-slate-900">
                          {m.metricName}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {m.citationIds
                            .map((id) => citationMap[id])
                            .filter(Boolean)
                            .map((anc) => (
                              <button
                                key={anc.chunkId}
                                type="button"
                                onClick={() => onSelectCitation(anc)}
                                className="cursor-pointer rounded border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-[11px] font-medium text-teal-800 hover:bg-teal-100"
                              >
                                ↗ PDF tr.{anc.pdfPage}
                              </button>
                            ))}
                        </div>
                      </div>
                      <p className="mt-1 text-slate-700">{m.meaningAndRoleVi}</p>
                      <p className="mt-1.5 text-xs font-medium text-teal-900">
                        Số liệu báo cáo: {m.reportedValues}
                      </p>
                    </div>
                  ))}
                </div>
              </SectionBlock>

              <SectionBlock title="4D. Phương pháp đối chứng (Baselines) & Điều kiện so sánh">
                <StatementList
                  statements={ds.baselinesAndComparisonConditions}
                  citationMap={citationMap}
                  onSelectCitation={onSelectCitation}
                />
              </SectionBlock>

              <SectionBlock title="4E. Nguy cơ rò rỉ dữ liệu (Data Leakage), Khả năng khái quát & Tái lập">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Kiểm tra rò rỉ dữ liệu
                  </p>
                  <StatementList
                    statements={
                      ds.generalizationLeakageAndReproducibility.dataLeakageCheck
                    }
                    citationMap={citationMap}
                    onSelectCitation={onSelectCitation}
                  />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Khả năng khái quát hóa
                  </p>
                  <StatementList
                    statements={
                      ds.generalizationLeakageAndReproducibility
                        .generalizationScope
                    }
                    citationMap={citationMap}
                    onSelectCitation={onSelectCitation}
                  />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Khả năng tái lập nghiên cứu (Reproducibility)
                  </p>
                  <StatementList
                    statements={
                      ds.generalizationLeakageAndReproducibility
                        .reproducibilityCheck
                    }
                    citationMap={citationMap}
                    onSelectCitation={onSelectCitation}
                  />
                </div>
              </SectionBlock>

              <SectionBlock title="4F. Cải thiện trên Benchmark vs. Hiệu quả ứng dụng thực tế">
                <StatementList
                  statements={ds.benchmarkVsRealWorld}
                  citationMap={citationMap}
                  onSelectCitation={onSelectCitation}
                />
              </SectionBlock>
            </>
          )}

          {ds.domain === "HYDROPOWER_WATER" && (
            <>
              <SectionBlock title="4A. Bối cảnh công trình, Lưu vực & Khoảng thời gian nghiên cứu">
                <StatementList
                  statements={ds.projectBasinAndTimeSeries}
                  citationMap={citationMap}
                  onSelectCitation={onSelectCitation}
                />
              </SectionBlock>

              <SectionBlock title="4B. Thủy văn, Vận hành hồ chứa, Phát điện, Tối ưu hóa & An toàn công trình">
                <StatementList
                  statements={ds.hydrologicalOperationOptimizationSafety}
                  citationMap={citationMap}
                  onSelectCitation={onSelectCitation}
                />
              </SectionBlock>

              <SectionBlock title="4C. Đơn vị kỹ thuật, Điều kiện biên, Giả định & Kịch bản">
                {ds.unitsBoundaryConditionsAssumptionsAndScenarios
                  .unitsAndQuantitiesPreserved.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {ds.unitsBoundaryConditionsAssumptionsAndScenarios.unitsAndQuantitiesPreserved.map(
                      (u, idx) => (
                        <span
                          key={idx}
                          className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800"
                        >
                          {u}
                        </span>
                      )
                    )}
                  </div>
                )}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Điều kiện biên & Ràng buộc vận hành
                  </p>
                  <StatementList
                    statements={
                      ds.unitsBoundaryConditionsAssumptionsAndScenarios
                        .boundaryConditionsAndConstraints
                    }
                    citationMap={citationMap}
                    onSelectCitation={onSelectCitation}
                  />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Giả định mô hình & Các kịch bản khảo sát
                  </p>
                  <StatementList
                    statements={
                      ds.unitsBoundaryConditionsAssumptionsAndScenarios
                        .assumptionsAndScenarios
                    }
                    citationMap={citationMap}
                    onSelectCitation={onSelectCitation}
                  />
                </div>
              </SectionBlock>

              <SectionBlock title="4D. Phân biệt Kết quả mô phỏng vs. Kiểm chứng thực tế">
                <StatementList
                  statements={ds.simulationVsFieldValidation}
                  citationMap={citationMap}
                  onSelectCitation={onSelectCitation}
                />
              </SectionBlock>

              <SectionBlock title="4E. Điều kiện & Giới hạn khi áp dụng sang lưu vực / công trình khác">
                <StatementList
                  statements={ds.transferabilityToOtherBasinsOrPlants}
                  citationMap={citationMap}
                  onSelectCitation={onSelectCitation}
                />
              </SectionBlock>
            </>
          )}

          {ds.domain === "OTHER_SCIENCE" && (
            <>
              <SectionBlock
                title={`4A. Thiết kế nghiên cứu (${ds.studyTypeLabelVi}) & Phép đo`}
              >
                <StatementList
                  statements={ds.researchDesignAndMeasurements}
                  citationMap={citationMap}
                  onSelectCitation={onSelectCitation}
                />
              </SectionBlock>
              <SectionBlock title="4B. Giả định & Điều kiện kiểm soát">
                <StatementList
                  statements={ds.assumptionsAndControlConditions}
                  citationMap={citationMap}
                  onSelectCitation={onSelectCitation}
                />
              </SectionBlock>
              <SectionBlock title="4C. Phạm vi suy luận & Giới hạn chuyển giao">
                <StatementList
                  statements={ds.scopeAndTransferabilityLimits}
                  citationMap={citationMap}
                  onSelectCitation={onSelectCitation}
                />
              </SectionBlock>
            </>
          )}
        </div>

        <SectionBlock title="5. Kết quả chính">
          <StatementList
            statements={fa.mainResults}
            citationMap={citationMap}
            onSelectCitation={onSelectCitation}
          />
        </SectionBlock>

        <SectionBlock title="6. Điểm mới và đóng góp">
          <StatementList
            statements={fa.noveltyAndContributions}
            citationMap={citationMap}
            onSelectCitation={onSelectCitation}
          />
        </SectionBlock>

        <SectionBlock title="7. Điểm mạnh và hạn chế">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-emerald-800">
                Điểm mạnh phương pháp / bằng chứng
              </h4>
              <StatementList
                statements={fa.strengths}
                citationMap={citationMap}
                onSelectCitation={onSelectCitation}
              />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-amber-800">
                Hạn chế cần lưu ý
              </h4>
              <StatementList
                statements={fa.limitations}
                citationMap={citationMap}
                onSelectCitation={onSelectCitation}
              />
            </div>
          </div>
        </SectionBlock>

        <SectionBlock title="8. Khả năng ứng dụng và điều kiện áp dụng">
          <StatementList
            statements={fa.applicabilityAndConditions}
            citationMap={citationMap}
            onSelectCitation={onSelectCitation}
          />
        </SectionBlock>

        <SectionBlock title="9. Những câu hỏi còn bỏ ngỏ">
          <StatementList
            statements={fa.openQuestions}
            citationMap={citationMap}
            onSelectCitation={onSelectCitation}
          />
        </SectionBlock>

        <SectionBlock title="10. Giải thích Bảng, Hình & Công thức chính">
          <VisualElementsPanel
            elements={analysis.visualElements}
            citationMap={citationMap}
            onJumpToElement={onJumpToElement}
          />
        </SectionBlock>
      </div>
    );
  }

  if (activeTab === "deep") {
    const activeSec =
      sections.find((s) => s.sectionId === selectedSectionId) ?? sections[0];
    const cacheKey = activeSec ? `${activeSec.sectionId}:${depth}` : "";
    const currentDeep = cacheKey ? deepExplanations[cacheKey] : undefined;

    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Chọn phần / mục của bài báo cần giải thích sâu:
              </label>
              <select
                value={activeSec?.sectionId ?? ""}
                onChange={(e) => onSelectSectionId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 focus:border-teal-600 focus:outline-none"
              >
                {sections.map((sec) => (
                  <option key={sec.sectionId} value={sec.sectionId}>
                    [PDF tr.{sec.startPdfPage}
                    {sec.endPdfPage > sec.startPdfPage
                      ? `–${sec.endPdfPage}`
                      : ""}
                    ] {sec.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Điều chỉnh độ chuyên sâu giải thích:
              </label>
              <div className="grid grid-cols-2 rounded-lg border border-slate-300 bg-slate-100 p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setDepth("basic")}
                  className={`cursor-pointer rounded-md py-1.5 transition ${
                    depth === "basic"
                      ? "bg-white text-teal-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Trực quan (Trái ngành)
                </button>
                <button
                  type="button"
                  onClick={() => setDepth("technical")}
                  className={`cursor-pointer rounded-md py-1.5 transition ${
                    depth === "technical"
                      ? "bg-white text-teal-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Chi tiết kỹ thuật
                </button>
              </div>
            </div>
          </div>

          {activeSec && !currentDeep && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3.5">
              <p className="text-xs text-slate-600">
                Hệ thống sẽ đọc trực tiếp văn bản và ảnh trang PDF{" "}
                <strong>
                  {activeSec.startPdfPage}
                  {activeSec.endPdfPage > activeSec.startPdfPage
                    ? `–${activeSec.endPdfPage}`
                    : ""}
                </strong>{" "}
                qua Gemini Vision để giải thích sâu mục này ở mức{" "}
                <strong>
                  {depth === "basic"
                    ? "Trực quan dễ hiểu"
                    : "Chi tiết kỹ thuật"}
                </strong>
                .
              </p>
              <button
                type="button"
                disabled={deepLoading}
                onClick={() => onRequestDeepRead(activeSec.sectionId, depth)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
              >
                {deepLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Đang phân tích sâu...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Giải thích mục này
                  </>
                )}
              </button>
            </div>
          )}

          {deepError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {deepError}
            </p>
          )}
        </div>

        {currentDeep && (
          <div className="space-y-6">
            <SectionBlock
              title={`Lập luận & Nội dung chính — ${currentDeep.sectionTitle}`}
            >
              <StatementList
                statements={currentDeep.keyArguments}
                citationMap={citationMap}
                onSelectCitation={onSelectCitation}
              />
            </SectionBlock>

            {currentDeep.termsAndConceptsClarified.length > 0 && (
              <SectionBlock title="Thuật ngữ & Ký hiệu làm rõ trong phần này">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {currentDeep.termsAndConceptsClarified.map((t, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
                    >
                      <p className="font-semibold text-teal-900">{t.termEn}</p>
                      <p className="mt-1 text-slate-700">{t.explanationVi}</p>
                    </div>
                  ))}
                </div>
              </SectionBlock>
            )}

            {currentDeep.tablesFiguresFormulasInSection.length > 0 && (
              <SectionBlock title="Bảng, Hình & Công thức trong mục này">
                <VisualElementsPanel
                  elements={currentDeep.tablesFiguresFormulasInSection}
                  citationMap={citationMap}
                  onJumpToElement={onJumpToElement}
                />
              </SectionBlock>
            )}

            <SectionBlock title="Điểm cần lưu ý khi đọc phản biện phần này">
              <StatementList
                statements={currentDeep.criticalReadingNotes}
                citationMap={citationMap}
                onSelectCitation={onSelectCitation}
              />
            </SectionBlock>
          </div>
        )}

        <SectionBlock title="Toàn bộ Bảng, Hình & Công thức đã nhận diện trong bài">
          <VisualElementsPanel
            elements={analysis.visualElements}
            citationMap={citationMap}
            onJumpToElement={onJumpToElement}
          />
        </SectionBlock>
      </div>
    );
  }

  // Glossary tab
  const filteredGlossary = analysis.glossary.filter((g) => {
    const q = glossaryFilter.trim().toLowerCase();
    if (!q) return true;
    return (
      g.termEn.toLowerCase().includes(q) ||
      g.termVi.toLowerCase().includes(q) ||
      g.explanationVi.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={glossaryFilter}
          onChange={(e) => setGlossaryFilter(e.target.value)}
          placeholder="Lọc thuật ngữ tiếng Anh hoặc tiếng Việt..."
          className="w-full rounded-xl border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-800 focus:border-teal-600 focus:outline-none"
        />
      </div>

      <div className="space-y-3">
        {filteredGlossary.map((g, idx) => {
          const anchor = g.citationId ? citationMap[g.citationId] : null;
          const pageLabel =
            g.printedPage && g.printedPage !== String(g.firstPdfPage)
              ? `PDF tr.${g.firstPdfPage} | Bài tr.${g.printedPage}`
              : `PDF tr.${g.firstPdfPage}`;
          return (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-900">{g.termEn}</span>
                  <span className="mx-2 text-slate-400">•</span>
                  <span className="font-semibold text-teal-800">{g.termVi}</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    anchor
                      ? onSelectCitation(anchor)
                      : onJumpToPdfPage(g.firstPdfPage)
                  }
                  className="cursor-pointer rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800 hover:bg-teal-100"
                >
                  ↗ {pageLabel}
                </button>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                {g.explanationVi}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                <span className="font-medium text-slate-600">
                  Ngữ cảnh trong bài:
                </span>{" "}
                {g.contextInPaperVi}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
