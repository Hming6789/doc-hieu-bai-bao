import type {
  GroundedStatement,
  ResolvedCitation,
  SessionPayload,
  StatementType,
} from "../types/paper.ts";

export interface ExportSelectionOptions {
  includeQuickRead: boolean;
  includeFullAnalysis: boolean;
  includeVisualElements: boolean;
  includeGlossary: boolean;
  includeChatHistory: boolean;
}

export const DEFAULT_EXPORT_OPTIONS: ExportSelectionOptions = {
  includeQuickRead: true,
  includeFullAnalysis: true,
  includeVisualElements: true,
  includeGlossary: true,
  includeChatHistory: true,
};

export function statementBadgeLabel(type: StatementType): string {
  switch (type) {
    case "author_claim":
      return "[Tác giả trình bày]";
    case "ai_explanation":
      return "[Diễn giải của AI]";
    case "methodological_note":
      return "[Nhận xét & Lưu ý phương pháp]";
    case "external_background":
      return "[Kiến thức nền ngoài bài báo]";
  }
}

export function formatCitationShortTag(
  citationIds: string[],
  citationMap: Record<string, ResolvedCitation>
): string {
  const tags: string[] = [];
  const seenPages = new Set<string>();

  for (const cid of citationIds) {
    const anchor = citationMap[cid];
    if (!anchor) continue;
    const label =
      anchor.printedPage && anchor.printedPage !== String(anchor.pdfPage)
        ? `PDF tr.${anchor.pdfPage} | Bài tr.${anchor.printedPage}`
        : `PDF tr.${anchor.pdfPage}`;
    if (!seenPages.has(label)) {
      seenPages.add(label);
      tags.push(`[${label}]`);
    }
  }
  return tags.join(" ");
}

function stripMarkdownSyntaxForZalo(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\$\$([^$]+)\$\$/g, "$1")
    .trim();
}

function renderStatementsZalo(
  items: GroundedStatement[],
  citationMap: Record<string, ResolvedCitation>
): string {
  if (!items || items.length === 0) return "  • Không nêu trong bài báo.";
  return items
    .map((st) => {
      const badge = statementBadgeLabel(st.statementType);
      const cite = formatCitationShortTag(st.citationIds, citationMap);
      const ext = st.externalSource ? ` (Nguồn: ${st.externalSource})` : "";
      const clean = stripMarkdownSyntaxForZalo(st.textVi);
      return `  • ${badge} ${clean}${cite ? ` ${cite}` : ""}${ext}`;
    })
    .join("\n");
}

export function formatForZalo(
  session: SessionPayload,
  opts: ExportSelectionOptions = DEFAULT_EXPORT_OPTIONS
): string {
  const analysis = session.analysis;
  if (!analysis) {
    return `📄 TÀI LIỆU: ${session.fileName}\nTrạng thái: Chưa hoàn tất phân tích.`;
  }

  const lines: string[] = [];
  if (session.isDemo) {
    lines.push("⚠️ [DỮ LIỆU MẪU MINH HỌA GIAO DIỆN — KHÔNG PHẢI BÀI BÁO THẬT]");
  }

  const info = analysis.fullAnalysis.paperInfo;
  lines.push(`📄 BÀI BÁO: ${stripMarkdownSyntaxForZalo(info.titleEn)}`);
  lines.push(
    `🇻🇳 Ý nghĩa tiêu đề: ${stripMarkdownSyntaxForZalo(info.titleViExplanation)}`
  );
  lines.push(
    `🏷️ Lĩnh vực: ${analysis.domainLabelVi} | Tác giả: ${stripMarkdownSyntaxForZalo(
      info.authors
    )}`
  );
  lines.push(
    `📚 Công bố: ${stripMarkdownSyntaxForZalo(info.venueAndYear)}${
      info.doiOrIdentifier ? ` (${info.doiOrIdentifier})` : ""
    }`
  );

  if (
    session.extractionReport &&
    session.extractionReport.warnings.length > 0
  ) {
    lines.push(
      `⚠️ Lưu ý trích xuất PDF: Có ${session.extractionReport.warnings.length} mục cảnh báo độ rõ/thiếu trang — cần đối chiếu trực tiếp PDF gốc.`
    );
  }

  if (opts.includeQuickRead) {
    lines.push("");
    lines.push("══════════════════════");
    lines.push("📌 1. HIỂU NHANH NỘI DUNG");
    lines.push("══════════════════════");
    lines.push("🔹 Vấn đề nghiên cứu:");
    lines.push(
      renderStatementsZalo(
        analysis.quickRead.researchProblem,
        session.citationMap
      )
    );
    lines.push("🔹 Vì sao quan trọng:");
    lines.push(
      renderStatementsZalo(analysis.quickRead.whyItMatters, session.citationMap)
    );
    lines.push("🔹 Tác giả đã làm gì:");
    lines.push(
      renderStatementsZalo(
        analysis.quickRead.whatAuthorsDid,
        session.citationMap
      )
    );
    lines.push("🔹 Kết quả nổi bật:");
    lines.push(
      renderStatementsZalo(analysis.quickRead.keyFindings, session.citationMap)
    );
    lines.push("🔹 Ý nghĩa & Hạn chế cần nhớ:");
    lines.push(
      renderStatementsZalo(
        analysis.quickRead.significanceAndLimitations,
        session.citationMap
      )
    );
  }

  if (opts.includeFullAnalysis) {
    const fa = analysis.fullAnalysis;
    lines.push("");
    lines.push("══════════════════════");
    lines.push("📌 2. PHÂN TÍCH CHUYÊN SÂU");
    lines.push("══════════════════════");

    lines.push("🔹 Bối cảnh & Khoảng trống nghiên cứu:");
    lines.push(
      renderStatementsZalo(fa.contextAndResearchGap, session.citationMap)
    );

    lines.push("🔹 Mục tiêu / Giả thuyết:");
    lines.push(
      renderStatementsZalo(
        fa.objectivesQuestionsHypotheses,
        session.citationMap
      )
    );

    lines.push("🔹 Dữ liệu & Phương pháp:");
    lines.push(
      renderStatementsZalo(fa.dataAndMethodsOverview, session.citationMap)
    );

    const ds = fa.domainSpecific;
    if (ds.domain === "AI_ML") {
      lines.push("🔹 Đánh giá chuyên sâu AI / Học máy:");
      lines.push(renderStatementsZalo(ds.problemAndData, session.citationMap));
      lines.push(
        renderStatementsZalo(ds.modelAndTraining, session.citationMap)
      );
      for (const m of ds.evaluationMetrics) {
        const cite = formatCitationShortTag(m.citationIds, session.citationMap);
        lines.push(
          `  • Chỉ số ${m.metricName}: ${stripMarkdownSyntaxForZalo(
            m.meaningAndRoleVi
          )} -> Kết quả: ${stripMarkdownSyntaxForZalo(m.reportedValues)} ${cite}`
        );
      }
      lines.push("🔹 Đối chứng & Rủi ro rò rỉ dữ liệu / Tái lập:");
      lines.push(
        renderStatementsZalo(
          ds.baselinesAndComparisonConditions,
          session.citationMap
        )
      );
      lines.push(
        renderStatementsZalo(
          ds.generalizationLeakageAndReproducibility.dataLeakageCheck,
          session.citationMap
        )
      );
      lines.push(
        renderStatementsZalo(
          ds.generalizationLeakageAndReproducibility.reproducibilityCheck,
          session.citationMap
        )
      );
      lines.push("🔹 Khác biệt giữa Benchmark & Ứng dụng thực tế:");
      lines.push(
        renderStatementsZalo(ds.benchmarkVsRealWorld, session.citationMap)
      );
    } else if (ds.domain === "HYDROPOWER_WATER") {
      lines.push("🔹 Đặc trưng Công trình, Lưu vực & Chuỗi số liệu:");
      lines.push(
        renderStatementsZalo(ds.projectBasinAndTimeSeries, session.citationMap)
      );
      lines.push("🔹 Thủy văn, Vận hành hồ chứa, Tối ưu & An toàn:");
      lines.push(
        renderStatementsZalo(
          ds.hydrologicalOperationOptimizationSafety,
          session.citationMap
        )
      );
      lines.push("🔹 Điều kiện biên, Giả định & Kịch bản:");
      lines.push(
        renderStatementsZalo(
          ds.unitsBoundaryConditionsAssumptionsAndScenarios
            .boundaryConditionsAndConstraints,
          session.citationMap
        )
      );
      lines.push(
        renderStatementsZalo(
          ds.unitsBoundaryConditionsAssumptionsAndScenarios
            .assumptionsAndScenarios,
          session.citationMap
        )
      );
      lines.push("🔹 Mô phỏng vs. Kiểm chứng thực tế:");
      lines.push(
        renderStatementsZalo(
          ds.simulationVsFieldValidation,
          session.citationMap
        )
      );
      lines.push("🔹 Điều kiện áp dụng sang lưu vực / công trình khác:");
      lines.push(
        renderStatementsZalo(
          ds.transferabilityToOtherBasinsOrPlants,
          session.citationMap
        )
      );
    } else {
      lines.push(`🔹 Thiết kế nghiên cứu (${ds.studyTypeLabelVi}):`);
      lines.push(
        renderStatementsZalo(
          ds.researchDesignAndMeasurements,
          session.citationMap
        )
      );
      lines.push(
        renderStatementsZalo(
          ds.assumptionsAndControlConditions,
          session.citationMap
        )
      );
      lines.push(
        renderStatementsZalo(
          ds.scopeAndTransferabilityLimits,
          session.citationMap
        )
      );
    }

    lines.push("🔹 Kết quả chính & Đóng góp:");
    lines.push(renderStatementsZalo(fa.mainResults, session.citationMap));
    lines.push(
      renderStatementsZalo(fa.noveltyAndContributions, session.citationMap)
    );

    lines.push("🔹 Điểm mạnh & Hạn chế:");
    lines.push(renderStatementsZalo(fa.strengths, session.citationMap));
    lines.push(renderStatementsZalo(fa.limitations, session.citationMap));

    lines.push("🔹 Câu hỏi bỏ ngỏ:");
    lines.push(renderStatementsZalo(fa.openQuestions, session.citationMap));
  }

  if (opts.includeVisualElements && analysis.visualElements.length > 0) {
    lines.push("");
    lines.push("══════════════════════");
    lines.push("📌 3. BẢNG, HÌNH & CÔNG THỨC CHÍNH");
    lines.push("══════════════════════");
    for (const el of analysis.visualElements) {
      const pageTag =
        el.printedPage && el.printedPage !== String(el.pdfPage)
          ? `[PDF tr.${el.pdfPage} | Bài tr.${el.printedPage}]`
          : `[PDF tr.${el.pdfPage}]`;
      if (!el.readable) {
        lines.push(
          `🔸 ${el.label} ${pageTag}: ⚠️ Nội dung gốc mờ/khó đọc (${
            el.unreadableReasonVi || "cần xem trực tiếp PDF gốc"
          }).`
        );
      } else {
        lines.push(
          `🔸 ${el.label} ${pageTag}: ${stripMarkdownSyntaxForZalo(
            el.contentSummaryVi
          )} | Vai trò: ${stripMarkdownSyntaxForZalo(el.roleInArgumentVi)}`
        );
      }
    }
  }

  if (opts.includeGlossary && analysis.glossary.length > 0) {
    lines.push("");
    lines.push("══════════════════════");
    lines.push("📌 4. THUẬT NGỮ QUAN TRỌNG");
    lines.push("══════════════════════");
    for (const g of analysis.glossary) {
      lines.push(
        `  ▪ ${g.termEn} (${g.termVi}): ${stripMarkdownSyntaxForZalo(
          g.explanationVi
        )} [PDF tr.${g.firstPdfPage}]`
      );
    }
  }

  if (opts.includeChatHistory && session.chatHistory.length > 0) {
    lines.push("");
    lines.push("══════════════════════");
    lines.push("📌 5. GHI CHÚ HỎI ĐÁP TRONG PHIÊN");
    lines.push("══════════════════════");
    for (const turn of session.chatHistory) {
      lines.push(`❓ Hỏi: ${turn.questionVi}`);
      lines.push(
        renderStatementsZalo(turn.answer.inPaperAnswers, session.citationMap)
      );
      if (turn.answer.notInPaperNoticeVi) {
        lines.push(
          `  • [Không nêu trong bài báo] ${stripMarkdownSyntaxForZalo(
            turn.answer.notInPaperNoticeVi
          )}`
        );
      }
      if (turn.answer.externalKnowledgeBox) {
        lines.push(
          `  • [Kiến thức nền ngoài bài] ${stripMarkdownSyntaxForZalo(
            turn.answer.externalKnowledgeBox.explanationVi
          )} (Nguồn: ${turn.answer.externalKnowledgeBox.verifiableSources.join(
            "; "
          )})`
        );
      }
    }
  }

  lines.push("");
  lines.push(
    "ℹ️ Lưu ý: Vui lòng đối chiếu số trang PDF gốc trước khi trích dẫn chính thức."
  );

  return lines.join("\n");
}

function renderStatementsMarkdown(
  items: GroundedStatement[],
  citationMap: Record<string, ResolvedCitation>
): string {
  if (!items || items.length === 0) return "- *Không nêu trong bài báo.*";
  return items
    .map((st) => {
      const badge = `**${statementBadgeLabel(st.statementType)}**`;
      const cite = formatCitationShortTag(st.citationIds, citationMap);
      const ext = st.externalSource ? ` *(Nguồn: ${st.externalSource})*` : "";
      return `- ${badge} ${st.textVi}${cite ? ` \`${cite}\`` : ""}${ext}`;
    })
    .join("\n");
}

export function formatAsMarkdown(
  session: SessionPayload,
  opts: ExportSelectionOptions = DEFAULT_EXPORT_OPTIONS
): string {
  const analysis = session.analysis;
  if (!analysis) {
    return `# ${session.fileName}\n\n*Chưa hoàn tất phân tích.*`;
  }

  const info = analysis.fullAnalysis.paperInfo;
  const md: string[] = [];

  if (session.isDemo) {
    md.push(
      `> **CẢNH BÁO:** Đây là **dữ liệu mẫu minh họa giao diện**, không phải kết quả từ bài báo thật.\n`
    );
  }

  md.push(`# Phân tích Bài báo: ${info.titleEn}`);
  md.push(`- **Giải thích tiêu đề:** ${info.titleViExplanation}`);
  md.push(`- **Tác giả:** ${info.authors}`);
  md.push(`- **Nơi công bố / Năm:** ${info.venueAndYear}`);
  md.push(`- **Định danh / DOI:** ${info.doiOrIdentifier}`);
  md.push(`- **Lĩnh vực nhận diện:** ${analysis.domainLabelVi}`);
  md.push(`- **Tệp gốc:** \`${session.fileName}\``);
  md.push("");
  md.push(`> **Lưu ý kiểm chứng:** ${analysis.honestyDisclaimerVi}`);

  if (
    session.extractionReport &&
    session.extractionReport.warnings.length > 0
  ) {
    md.push("");
    md.push(`## Cảnh báo trích xuất PDF / OCR`);
    for (const w of session.extractionReport.warnings) {
      md.push(`- **[Trang PDF ${w.pdfPage}]** ${w.messageVi}`);
    }
  }

  if (opts.includeQuickRead) {
    md.push("");
    md.push(`## 1. Hiểu nhanh (5 câu hỏi cốt lõi)`);
    md.push(`### 1.1. Bài báo nghiên cứu vấn đề gì?`);
    md.push(
      renderStatementsMarkdown(
        analysis.quickRead.researchProblem,
        session.citationMap
      )
    );
    md.push(`### 1.2. Vì sao vấn đề này quan trọng?`);
    md.push(
      renderStatementsMarkdown(
        analysis.quickRead.whyItMatters,
        session.citationMap
      )
    );
    md.push(`### 1.3. Tác giả đã làm gì?`);
    md.push(
      renderStatementsMarkdown(
        analysis.quickRead.whatAuthorsDid,
        session.citationMap
      )
    );
    md.push(`### 1.4. Kết quả nổi bật là gì?`);
    md.push(
      renderStatementsMarkdown(
        analysis.quickRead.keyFindings,
        session.citationMap
      )
    );
    md.push(`### 1.5. Ý nghĩa chính và hạn chế cần nhớ`);
    md.push(
      renderStatementsMarkdown(
        analysis.quickRead.significanceAndLimitations,
        session.citationMap
      )
    );
  }

  if (opts.includeFullAnalysis) {
    const fa = analysis.fullAnalysis;
    md.push("");
    md.push(`## 2. Phân tích đầy đủ`);
    md.push(`### 2.1. Bối cảnh và khoảng trống nghiên cứu`);
    md.push(
      renderStatementsMarkdown(fa.contextAndResearchGap, session.citationMap)
    );
    md.push(`### 2.2. Mục tiêu, câu hỏi hoặc giả thuyết`);
    md.push(
      renderStatementsMarkdown(
        fa.objectivesQuestionsHypotheses,
        session.citationMap
      )
    );
    md.push(`### 2.3. Dữ liệu và phương pháp tổng quát`);
    md.push(
      renderStatementsMarkdown(fa.dataAndMethodsOverview, session.citationMap)
    );

    const ds = fa.domainSpecific;
    md.push(`### 2.4. Phân tích chuyên sâu theo lĩnh vực (${analysis.domainLabelVi})`);
    if (ds.domain === "AI_ML") {
      md.push(`#### Bài toán & Dữ liệu`);
      md.push(renderStatementsMarkdown(ds.problemAndData, session.citationMap));
      md.push(`#### Mô hình & Huấn luyện`);
      md.push(
        renderStatementsMarkdown(ds.modelAndTraining, session.citationMap)
      );
      md.push(`#### Chỉ số đánh giá`);
      for (const m of ds.evaluationMetrics) {
        const cite = formatCitationShortTag(m.citationIds, session.citationMap);
        md.push(
          `- **${m.metricName}**: ${m.meaningAndRoleVi} — *Giá trị báo cáo:* ${
            m.reportedValues
          } ${cite ? `\`${cite}\`` : ""}`
        );
      }
      md.push(`#### Phương pháp đối chứng & Điều kiện so sánh`);
      md.push(
        renderStatementsMarkdown(
          ds.baselinesAndComparisonConditions,
          session.citationMap
        )
      );
      md.push(`#### Khả năng khái quát, Nguy cơ rò rỉ dữ liệu & Tái lập`);
      md.push(
        renderStatementsMarkdown(
          ds.generalizationLeakageAndReproducibility.dataLeakageCheck,
          session.citationMap
        )
      );
      md.push(
        renderStatementsMarkdown(
          ds.generalizationLeakageAndReproducibility.generalizationScope,
          session.citationMap
        )
      );
      md.push(
        renderStatementsMarkdown(
          ds.generalizationLeakageAndReproducibility.reproducibilityCheck,
          session.citationMap
        )
      );
      md.push(`#### Thử nghiệm Benchmark vs. Hiệu quả ứng dụng thực tế`);
      md.push(
        renderStatementsMarkdown(ds.benchmarkVsRealWorld, session.citationMap)
      );
    } else if (ds.domain === "HYDROPOWER_WATER") {
      md.push(`#### Bối cảnh công trình, Lưu vực & Chuỗi thời gian`);
      md.push(
        renderStatementsMarkdown(
          ds.projectBasinAndTimeSeries,
          session.citationMap
        )
      );
      md.push(`#### Thủy văn, Vận hành hồ chứa, Phát điện, Tối ưu & An toàn`);
      md.push(
        renderStatementsMarkdown(
          ds.hydrologicalOperationOptimizationSafety,
          session.citationMap
        )
      );
      md.push(`#### Đơn vị, Điều kiện biên, Giả định & Kịch bản`);
      if (
        ds.unitsBoundaryConditionsAssumptionsAndScenarios
          .unitsAndQuantitiesPreserved.length > 0
      ) {
        md.push(
          `- **Đại lượng & đơn vị giữ nguyên:** ${ds.unitsBoundaryConditionsAssumptionsAndScenarios.unitsAndQuantitiesPreserved.join(
            ", "
          )}`
        );
      }
      md.push(
        renderStatementsMarkdown(
          ds.unitsBoundaryConditionsAssumptionsAndScenarios
            .boundaryConditionsAndConstraints,
          session.citationMap
        )
      );
      md.push(
        renderStatementsMarkdown(
          ds.unitsBoundaryConditionsAssumptionsAndScenarios
            .assumptionsAndScenarios,
          session.citationMap
        )
      );
      md.push(`#### Kết quả mô phỏng vs. Kiểm chứng thực tế`);
      md.push(
        renderStatementsMarkdown(
          ds.simulationVsFieldValidation,
          session.citationMap
        )
      );
      md.push(`#### Điều kiện & Giới hạn khi áp dụng sang lưu vực/công trình khác`);
      md.push(
        renderStatementsMarkdown(
          ds.transferabilityToOtherBasinsOrPlants,
          session.citationMap
        )
      );
    } else {
      md.push(`#### Thiết kế nghiên cứu (${ds.studyTypeLabelVi}) & Phép đo`);
      md.push(
        renderStatementsMarkdown(
          ds.researchDesignAndMeasurements,
          session.citationMap
        )
      );
      md.push(`#### Giả định & Điều kiện kiểm soát`);
      md.push(
        renderStatementsMarkdown(
          ds.assumptionsAndControlConditions,
          session.citationMap
        )
      );
      md.push(`#### Phạm vi áp dụng & Giới hạn`);
      md.push(
        renderStatementsMarkdown(
          ds.scopeAndTransferabilityLimits,
          session.citationMap
        )
      );
    }

    md.push(`### 2.5. Kết quả chính`);
    md.push(renderStatementsMarkdown(fa.mainResults, session.citationMap));
    md.push(`### 2.6. Điểm mới và đóng góp`);
    md.push(
      renderStatementsMarkdown(fa.noveltyAndContributions, session.citationMap)
    );
    md.push(`### 2.7. Điểm mạnh và hạn chế`);
    md.push(`**Điểm mạnh:**`);
    md.push(renderStatementsMarkdown(fa.strengths, session.citationMap));
    md.push(`**Hạn chế:**`);
    md.push(renderStatementsMarkdown(fa.limitations, session.citationMap));
    md.push(`### 2.8. Khả năng ứng dụng và điều kiện áp dụng`);
    md.push(
      renderStatementsMarkdown(
        fa.applicabilityAndConditions,
        session.citationMap
      )
    );
    md.push(`### 2.9. Những câu hỏi còn bỏ ngỏ`);
    md.push(renderStatementsMarkdown(fa.openQuestions, session.citationMap));
  }

  if (opts.includeVisualElements && analysis.visualElements.length > 0) {
    md.push("");
    md.push(`## 3. Giải thích Bảng, Hình & Công thức`);
    for (const el of analysis.visualElements) {
      const pageLabel =
        el.printedPage && el.printedPage !== String(el.pdfPage)
          ? `PDF tr.${el.pdfPage} | Bài tr.${el.printedPage}`
          : `PDF tr.${el.pdfPage}`;
      md.push(`### ${el.label} (\`${pageLabel}\`)`);
      if (!el.readable) {
        md.push(
          `- **Cảnh báo không đọc rõ:** ${
            el.unreadableReasonVi ||
            "Nội dung gốc mờ/thiếu ký tự, không tự tái tạo số liệu."
          }`
        );
      } else {
        md.push(`- **Cách đọc:** ${el.howToReadVi}`);
        md.push(`- **Nội dung thể hiện:** ${el.contentSummaryVi}`);
        md.push(`- **Vai trò trong lập luận:** ${el.roleInArgumentVi}`);
        if (el.formulaDetails) {
          md.push(`\n$$\n${el.formulaDetails.latex}\n$$\n`);
          for (const v of el.formulaDetails.variables) {
            md.push(
              `  - \`${v.symbol}\`: ${v.meaningVi} *(Đơn vị: ${v.unitOrDimension})*`
            );
          }
          md.push(
            `- **Giả định công thức:** ${el.formulaDetails.assumptionsVi}`
          );
        }
      }
    }
  }

  if (opts.includeGlossary && analysis.glossary.length > 0) {
    md.push("");
    md.push(`## 4. Bảng thuật ngữ chuyên ngành`);
    md.push(`| Thuật ngữ tiếng Anh | Nghĩa tiếng Việt | Giải thích & Ngữ cảnh | Trang PDF |`);
    md.push(`| :--- | :--- | :--- | :--- |`);
    for (const g of analysis.glossary) {
      md.push(
        `| **${g.termEn}** | ${g.termVi} | ${g.explanationVi} *(${g.contextInPaperVi})* | tr.${g.firstPdfPage} |`
      );
    }
  }

  if (opts.includeChatHistory && session.chatHistory.length > 0) {
    md.push("");
    md.push(`## 5. Lịch sử Hỏi đáp trong phiên`);
    for (const turn of session.chatHistory) {
      md.push(`### Hỏi: ${turn.questionVi}`);
      md.push(
        renderStatementsMarkdown(turn.answer.inPaperAnswers, session.citationMap)
      );
      if (turn.answer.notInPaperNoticeVi) {
        md.push(
          `- **[Thông tin không có trong bài báo]:** ${turn.answer.notInPaperNoticeVi}`
        );
      }
      if (turn.answer.externalKnowledgeBox) {
        md.push(
          `> **Kiến thức nền ngoài bài báo:** ${
            turn.answer.externalKnowledgeBox.explanationVi
          }\n> *Nguồn kiểm tra:* ${turn.answer.externalKnowledgeBox.verifiableSources.join(
            "; "
          )}`
        );
      }
    }
  }

  return md.join("\n");
}
