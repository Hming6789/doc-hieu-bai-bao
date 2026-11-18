import * as mupdf from "mupdf";
import type { SessionPayload } from "../types/paper.ts";

export function buildSyntheticDemoPdfBuffer(): Buffer {
  const doc = new mupdf.PDFDocument();
  const fontRegular = doc.addSimpleFont(
    new mupdf.Font("Helvetica"),
    "Latin"
  );
  const fontBold = doc.addSimpleFont(
    new mupdf.Font("Helvetica-Bold"),
    "Latin"
  );

  const resources = () => {
    const fontDict = doc.newDictionary();
    fontDict.put("F1", fontRegular);
    fontDict.put("F2", fontBold);
    const resDict = doc.newDictionary();
    resDict.put("Font", fontDict);
    return resDict;
  };

  // Page 1 (Printed Page 411)
  const p1Stream = [
    "BT /F2 9 Tf 50 765 Td ([SYNTHETIC DEMO PDF FOR UI ILLUSTRATION ONLY - NOT A REAL PUBLISHED PAPER] | 411) Tj ET",
    "BT /F2 15 Tf 50 720 Td (Multi-Objective Reservoir Operation with Hybrid LSTM Inflow Forecasting) Tj ET",
    "BT /F1 10 Tf 50 698 Td (Illustrative Authors (Synthetic Demo Dataset - No Real DOI Assigned)) Tj ET",
    "BT /F2 12 Tf 50 660 Td (1. Introduction and Problem Context) Tj ET",
    "BT /F1 10 Tf 50 638 Td (Multipurpose hydropower reservoirs face conflicting goals between maximizing energy) Tj ET",
    "BT /F1 10 Tf 50 623 Td (generation (MWh) and attenuating downstream peak flood discharge (m3/s) during monsoon events.) Tj ET",
    "BT /F2 12 Tf 50 580 Td (2. Study Basin and Time-Series Data) Tj ET",
    "BT /F1 10 Tf 50 558 Td (Synthetic Basin X covers 1,420 km2 with active storage of 480 x 10^6 m3 and installed capacity) Tj ET",
    "BT /F1 10 Tf 50 543 Td (of 120 MW. Daily inflow observations span 2005-2020: calibration (2005-2015), validation (2016-2020).) Tj ET",
  ].join("\n");

  // Page 2 (Printed Page 412)
  const p2Stream = [
    "BT /F2 9 Tf 50 765 Td (412 | [SYNTHETIC DEMO PDF FOR UI ILLUSTRATION ONLY]) Tj ET",
    "BT /F2 12 Tf 50 720 Td (3. Methodology and Optimization Formulation) Tj ET",
    "BT /F1 10 Tf 50 695 Td (An LSTM inflow predictor feeds 7-day rolling forecasts into an NSGA-II reservoir optimizer.) Tj ET",
    "BT /F1 10 Tf 50 678 Td (Data normalization is fitted strictly on the 2005-2015 training split to avoid data leakage.) Tj ET",
    "BT /F2 11 Tf 50 635 Td (Equation (1): Hydropower Energy Objective) Tj ET",
    "BT /F1 10 Tf 70 612 Td (Maximize E = sum_{t=1}^{T} ( eta * rho * g * Q_turb(t) * H_net(t) * delta_t )) Tj ET",
    "BT /F1 10 Tf 50 588 Td (Subject to: Z_dead (65.0 m) <= Z(t) <= Z_flood_limit (88.5 m), Q_min_eco >= 18.0 m3/s.) Tj ET",
    "BT /F1 10 Tf 50 568 Td (Assumption: Constant turbine-generator efficiency eta = 0.88; channel routing lag neglected.) Tj ET",
  ].join("\n");

  // Page 3 (Printed Page 413)
  const p3Stream = [
    "BT /F2 9 Tf 50 765 Td ([SYNTHETIC DEMO PDF FOR UI ILLUSTRATION ONLY] | 413) Tj ET",
    "BT /F2 12 Tf 50 720 Td (4. Simulation Results vs. Historical Operation) Tj ET",
    "BT /F2 10 Tf 50 692 Td (Table 1 (Synthetic Demo): Validation Period (2016-2020) Comparison) Tj ET",
    "BT /F1 10 Tf 50 672 Td (Baseline Rule Curve: Annual Energy = 412.5 GWh, Peak Outflow = 2,150 m3/s, NSE = 0.78) Tj ET",
    "BT /F1 10 Tf 50 655 Td (Proposed LSTM + NSGA-II (Simulated): Annual Energy = 431.0 GWh (+4.5%), Peak Outflow = 1,890 m3/s) Tj ET",
    "BT /F2 12 Tf 50 605 Td (5. Limitations) Tj ET",
    "BT /F1 10 Tf 50 582 Td (Results represent retrospective simulation; real-time gate operation under extreme typhoons) Tj ET",
    "BT /F1 10 Tf 50 566 Td (beyond the 2005-2020 record remains untested. Figure 3 axis labels in appendix scan are blurry.) Tj ET",
  ].join("\n");

  doc.insertPage(-1, doc.addPage([0, 0, 600, 800], 0, resources(), p1Stream));
  doc.insertPage(-1, doc.addPage([0, 0, 600, 800], 0, resources(), p2Stream));
  doc.insertPage(-1, doc.addPage([0, 0, 600, 800], 0, resources(), p3Stream));

  const bytes = doc.saveToBuffer("compress").asUint8Array();
  return Buffer.from(bytes);
}

export function getDemoSessionPayload(): SessionPayload {
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 3600 * 1000);

  return {
    sessionId: "demo",
    fileName: "Demo_Minh_Hoa_Van_Hanh_Ho_Chua_AI.pdf",
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    status: "partial",
    isDemo: true,
    errorMessageVi: null,
    progress: {
      step: 4,
      stepLabelVi: "Hoàn tất minh họa",
      detailVi: "Đang hiển thị phiên dữ liệu mẫu giả định.",
      percent: 100,
    },
    pageMappings: [
      {
        pdfPage: 1,
        printedPage: "411",
        widthPt: 600,
        heightPt: 800,
        usedOcr: false,
        imageCount: 0,
        charCount: 480,
      },
      {
        pdfPage: 2,
        printedPage: "412",
        widthPt: 600,
        heightPt: 800,
        usedOcr: false,
        imageCount: 0,
        charCount: 510,
      },
      {
        pdfPage: 3,
        printedPage: "413",
        widthPt: 600,
        heightPt: 800,
        usedOcr: false,
        imageCount: 0,
        charCount: 495,
      },
    ],
    sections: [
      {
        sectionId: "DEMO-SEC-1",
        title: "1. Introduction & 2. Study Basin (Trang in 411)",
        startPdfPage: 1,
        endPdfPage: 1,
        printedPageStart: "411",
        chunkIds: ["D01-B01", "D01-B02"],
      },
      {
        sectionId: "DEMO-SEC-2",
        title: "3. Methodology and Optimization Formulation (Trang in 412)",
        startPdfPage: 2,
        endPdfPage: 2,
        printedPageStart: "412",
        chunkIds: ["D02-B01", "D02-B02"],
      },
      {
        sectionId: "DEMO-SEC-3",
        title: "4. Simulation Results & 5. Limitations (Trang in 413)",
        startPdfPage: 3,
        endPdfPage: 3,
        printedPageStart: "413",
        chunkIds: ["D03-B01", "D03-B02"],
      },
    ],
    extractionReport: {
      totalPages: 3,
      fileSizeBytes: 12400,
      textExtractedPages: [1, 2, 3],
      ocrProcessedPages: [],
      hasDistinctPrintedPages: true,
      missingPrintedPageGaps: [],
      warnings: [
        {
          id: "demo-warn-1",
          pdfPage: 3,
          printedPage: "413",
          elementLabel: "Figure 3 (Phụ lục mẫu)",
          severity: "warning",
          messageVi:
            "[Minh họa trạng thái cảnh báo] Tác giả ghi nhận Hình 3 ở bản quét phụ lục bị mờ nhãn trục — hệ thống đánh dấu không đọc rõ thay vì tự đoán số liệu.",
        },
      ],
      qualityStatus: "partial",
    },
    citationMap: {
      "D01-B01": {
        chunkId: "D01-B01",
        pdfPage: 1,
        printedPage: "411",
        sectionTitle: "1. Introduction and Problem Context",
        bbox: [0.07, 0.18, 0.92, 0.24],
        snippet:
          "Multipurpose hydropower reservoirs face conflicting goals between maximizing energy generation (MWh) and attenuating downstream peak flood discharge (m3/s)...",
      },
      "D01-B02": {
        chunkId: "D01-B02",
        pdfPage: 1,
        printedPage: "411",
        sectionTitle: "2. Study Basin and Time-Series Data",
        bbox: [0.07, 0.28, 0.93, 0.34],
        snippet:
          "Synthetic Basin X covers 1,420 km2 with active storage of 480 x 10^6 m3 and installed capacity of 120 MW. Daily inflow observations span 2005-2020...",
      },
      "D02-B01": {
        chunkId: "D02-B01",
        pdfPage: 2,
        printedPage: "412",
        sectionTitle: "3. Methodology and Optimization Formulation",
        bbox: [0.07, 0.11, 0.92, 0.18],
        snippet:
          "An LSTM inflow predictor feeds 7-day rolling forecasts into an NSGA-II reservoir optimizer. Data normalization is fitted strictly on the 2005-2015 training split...",
      },
      "D02-B02": {
        chunkId: "D02-B02",
        pdfPage: 2,
        printedPage: "412",
        sectionTitle: "Equation (1): Hydropower Energy Objective",
        bbox: [0.07, 0.19, 0.93, 0.31],
        snippet:
          "Maximize E = sum_{t=1}^{T} ( eta * rho * g * Q_turb(t) * H_net(t) * delta_t ). Subject to: Z_dead (65.0 m) <= Z(t) <= Z_flood_limit (88.5 m), Q_min_eco >= 18.0 m3/s.",
      },
      "D03-B01": {
        chunkId: "D03-B01",
        pdfPage: 3,
        printedPage: "413",
        sectionTitle: "4. Simulation Results vs. Historical Operation",
        bbox: [0.07, 0.12, 0.94, 0.2],
        snippet:
          "Table 1 (Synthetic Demo): Baseline Rule Curve: Annual Energy = 412.5 GWh, Peak Outflow = 2,150 m3/s... Proposed LSTM + NSGA-II (Simulated): Annual Energy = 431.0 GWh (+4.5%), Peak Outflow = 1,890 m3/s.",
      },
      "D03-B02": {
        chunkId: "D03-B02",
        pdfPage: 3,
        printedPage: "413",
        sectionTitle: "5. Limitations",
        bbox: [0.07, 0.24, 0.92, 0.31],
        snippet:
          "Results represent retrospective simulation; real-time gate operation under extreme typhoons beyond the 2005-2020 record remains untested.",
      },
    },
    analysis: {
      domain: "HYDROPOWER_WATER",
      domainLabelVi: "Thủy điện & Vận hành hồ chứa (kết hợp dự báo AI)",
      domainReasonVi:
        "Tài liệu mẫu minh họa bài toán liên ngành điển hình của nhóm: tối ưu vận hành hồ chứa đa mục tiêu kết hợp mô hình học sâu dự báo dòng chảy đến.",
      honestyDisclaimerVi:
        "ĐÂY LÀ DỮ LIỆU MẪU GIẢ ĐỊNH ĐỂ MINH HỌA GIAO DIỆN. Mọi con số dưới đây thuộc tệp PDF mẫu 3 trang bên trái, hoàn toàn không phải số liệu công trình thật.",
      quickRead: {
        researchProblem: [
          {
            statementType: "author_claim",
            textVi:
              "Giải quyết mâu thuẫn vận hành hồ chứa đa mục tiêu (multi-objective reservoir operation) giữa tối đa hóa sản lượng điện phát (MWh) và cắt giảm lưu lượng đỉnh lũ hạ du (m³/s) trong mùa mưa lũ.",
            citationIds: ["D01-B01"],
          },
        ],
        whyItMatters: [
          {
            statementType: "ai_explanation",
            textVi:
              "Nếu giữ mực nước cao để lợi cột nước phát điện thì dung tích phòng lũ giảm; ngược lại hạ thấp mực nước sớm sẽ làm hụt sản lượng điện mùa kiệt.",
            citationIds: ["D01-B01"],
          },
        ],
        whatAuthorsDid: [
          {
            statementType: "author_claim",
            textVi:
              "Kết hợp mạng bộ nhớ dài–ngắn (LSTM - Long Short-Term Memory) dự báo dòng chảy đến 7 ngày cuốn chiếu với thuật toán di truyền đa mục tiêu NSGA-II trên lưu vực giả định X (1.420 km², công suất 120 MW).",
            citationIds: ["D01-B02", "D02-B01"],
          },
        ],
        keyFindings: [
          {
            statementType: "author_claim",
            textVi:
              "Trong giai đoạn kiểm định 2016–2020 (mô phỏng), phương pháp đề xuất đạt sản lượng điện năm 431,0 GWh (+4,5%) và hạ đỉnh xả lũ từ 2.150 m³/s xuống 1.890 m³/s so với đường cong quy trình cơ sở (baseline rule curve).",
            citationIds: ["D03-B01"],
          },
        ],
        significanceAndLimitations: [
          {
            statementType: "methodological_note",
            textVi:
              "Kết quả đạt được là mô phỏng hồi cứu (retrospective simulation) với giả định hiệu suất tổ máy hằng số η = 0,88 và bỏ qua thời gian truyền lũ lòng sông; chưa kiểm chứng vận hành cửa van thời gian thực trong mưa bão vượt chuỗi 2005–2020.",
            citationIds: ["D02-B02", "D03-B02"],
          },
        ],
      },
      fullAnalysis: {
        paperInfo: {
          titleEn:
            "Multi-Objective Reservoir Operation with Hybrid LSTM Inflow Forecasting (Synthetic Demo)",
          titleViExplanation:
            "Vận hành hồ chứa đa mục tiêu kết hợp dự báo dòng chảy đến bằng mô hình lai ghép LSTM (Bản mẫu minh họa giao diện)",
          authors: "Nhóm tác giả giả định (Dữ liệu mẫu minh họa)",
          venueAndYear: "Tài liệu PDF mẫu nội bộ (Không có tạp chí thật)",
          doiOrIdentifier: "Không có DOI (Tài liệu mẫu minh họa)",
          publicationNoteVi:
            "Tệp PDF được sinh tự động nhằm minh họa cách bấm dẫn chứng đối chiếu trang tệp PDF (1–3) và trang in (411–413).",
        },
        contextAndResearchGap: [
          {
            statementType: "author_claim",
            textVi:
              "Vận hành theo đường cong quy trình tĩnh truyền thống khó thích ứng linh hoạt với biến động dòng chảy mùa lũ.",
            citationIds: ["D01-B01", "D03-B01"],
          },
        ],
        objectivesQuestionsHypotheses: [
          {
            statementType: "author_claim",
            textVi:
              "Cải thiện đồng thời sản lượng điện hàng năm và an toàn cắt lũ hạ du thông qua liên kết dự báo dòng chảy 7 ngày với tối ưu đa mục tiêu.",
            citationIds: ["D01-B01", "D02-B01"],
          },
        ],
        dataAndMethodsOverview: [
          {
            statementType: "author_claim",
            textVi:
              "Chuỗi số liệu dòng chảy ngày giai đoạn 2005–2020 được tách theo thời gian: hiệu chỉnh/huấn luyện 2005–2015 và kiểm định 2016–2020; tham số chuẩn hóa dữ liệu chỉ khớp trên tập 2005–2015 để tránh rò rỉ dữ liệu (data leakage).",
            citationIds: ["D01-B02", "D02-B01"],
          },
        ],
        domainSpecific: {
          domain: "HYDROPOWER_WATER",
          projectBasinAndTimeSeries: [
            {
              statementType: "author_claim",
              textVi:
                "Lưu vực giả định X có diện tích 1.420 km², dung tích hữu ích (active storage) 480 × 10⁶ m³, công suất lắp máy 120 MW; bước thời gian tính toán theo ngày trong 16 năm (2005–2020).",
              citationIds: ["D01-B02"],
            },
          ],
          hydrologicalOperationOptimizationSafety: [
            {
              statementType: "ai_explanation",
              textVi:
                "Hệ thống nối tiếp hai khâu: dự báo thủy văn ngắn hạn 7 ngày bằng LSTM và tối ưu lịch xả qua tuabin/tràn bằng NSGA-II nhằm tìm tập nghiệm thỏa hiệp Pareto giữa phát điện và giảm đỉnh lũ.",
              citationIds: ["D02-B01", "D02-B02"],
            },
          ],
          unitsBoundaryConditionsAssumptionsAndScenarios: {
            unitsAndQuantitiesPreserved: [
              "Diện tích lưu vực: 1,420 km²",
              "Dung tích hữu ích: 480 × 10⁶ m³",
              "Công suất lắp máy: 120 MW",
              "Mực nước giới hạn: 65.0 m – 88.5 m",
              "Lưu lượng sinh thái tối thiểu: ≥ 18.0 m³/s",
            ],
            boundaryConditionsAndConstraints: [
              {
                statementType: "author_claim",
                textVi:
                  "Ràng buộc mực nước hồ duy trì giữa mực nước chết Z_dead = 65,0 m và mực nước hạn chế lũ Z_flood_limit = 88,5 m; lưu lượng xả môi trường tối thiểu hạ du Q_min_eco ≥ 18,0 m³/s.",
                citationIds: ["D02-B02"],
              },
            ],
            assumptionsAndScenarios: [
              {
                statementType: "author_claim",
                textVi:
                  "Giả định hiệu suất tổ máy cố định η = 0,88 và bỏ qua độ trễ truyền lũ trên sông hạ du.",
                citationIds: ["D02-B02"],
              },
              {
                statementType: "methodological_note",
                textVi:
                  "Giả định η = 0,88 không phản ánh sự suy giảm hiệu suất tuabin khi cột nước H_net biến thiên mạnh trong mùa lũ xả lớn.",
                citationIds: ["D02-B02"],
              },
            ],
          },
          simulationVsFieldValidation: [
            {
              statementType: "methodological_note",
              textVi:
                "Toàn bộ mức tăng +4,5% điện lượng (431,0 GWh) và mức giảm đỉnh lũ xuống 1.890 m³/s là kết quả mô phỏng tính toán trên chuỗi lịch sử 2016–2020, không phải số liệu vận hành đóng mở cửa van thực tế tại nhà máy.",
              citationIds: ["D03-B01", "D03-B02"],
            },
          ],
          transferabilityToOtherBasinsOrPlants: [
            {
              statementType: "methodological_note",
              textVi:
                "Khi chuyển sang hồ chứa khác (đặc biệt các lưu vực sông miền Trung dốc ngắn, lũ lên nhanh theo giờ), bước thời gian tính toán theo ngày (daily resolution) trong bài mẫu này sẽ quá thô cho bài toán cắt lũ an toàn đập — cần chuỗi số liệu giờ (hourly) và tính cả diễn toán truyền lũ hạ du.",
              citationIds: ["D01-B02", "D02-B02"],
            },
          ],
        },
        mainResults: [
          {
            statementType: "author_claim",
            textVi:
              "So với vận hành theo đường cong quy trình cơ sở (412,5 GWh; đỉnh xả 2.150 m³/s; NSE = 0,78), mô hình lai ghép đạt 431,0 GWh (+4,5%) và đỉnh xả 1.890 m³/s trong kỳ kiểm định 2016–2020.",
            citationIds: ["D03-B01"],
          },
        ],
        noveltyAndContributions: [
          {
            statementType: "ai_explanation",
            textVi:
              "Minh họa quy trình ghép nối dự báo chuỗi thời gian (có kiểm soát rò rỉ dữ liệu theo mốc thời gian) với bài toán tối ưu vận hành hồ chứa có ràng buộc vật lý.",
            citationIds: ["D02-B01", "D02-B02"],
          },
        ],
        strengths: [
          {
            statementType: "methodological_note",
            textVi:
              "Chia tập huấn luyện (2005–2015) và kiểm định (2016–2020) đúng thứ tự thời gian, chuẩn hóa dữ liệu chỉ trên tập huấn luyện.",
            citationIds: ["D02-B01"],
          },
        ],
        limitations: [
          {
            statementType: "author_claim",
            textVi:
              "Chưa kiểm định trong điều kiện bão lũ cực đoan vượt chuỗi quan trắc 2005–2020.",
            citationIds: ["D03-B02"],
          },
        ],
        applicabilityAndConditions: [
          {
            statementType: "methodological_note",
            textVi:
              "Đòi hỏi chuỗi quan trắc dòng chảy đến liên tục tối thiểu nhiều năm, đường đặc tính lòng hồ Z–V và quy trình vận hành thực tế của công trình.",
            citationIds: ["D01-B02", "D02-B02"],
          },
        ],
        openQuestions: [
          {
            statementType: "methodological_note",
            textVi:
              "Độ nhạy của phương án xả tối ưu khi dự báo LSTM sai lệch lớn ở đỉnh lũ đột xuất chưa được định lượng bằng khoảng bất định.",
            citationIds: ["D02-B01", "D03-B02"],
          },
        ],
      },
      visualElements: [
        {
          elementId: "DEMO-EQ-1",
          kind: "equation",
          label: "Equation (1) — Hàm mục tiêu điện năng",
          pdfPage: 2,
          printedPage: "412",
          bbox: [0.07, 0.19, 0.93, 0.31],
          readable: true,
          unreadableReasonVi: null,
          howToReadVi:
            "Tổng sản lượng điện E tính tích lũy qua T bước thời gian, tỷ lệ thuận với lưu lượng qua tuabin Q_turb(t) và cột nước tĩnh hiệu dụng H_net(t).",
          contentSummaryVi:
            "Biểu diễn hàm mục tiêu tối đa hóa tổng điện năng phát của nhà máy thủy điện trong kỳ điều tiết.",
          roleInArgumentVi:
            "Là một trong hai hàm mục tiêu cốt lõi đưa vào bộ tối ưu đa mục tiêu NSGA-II.",
          formulaDetails: {
            latex:
              "E = \\sum_{t=1}^{T} \\eta \\cdot \\rho \\cdot g \\cdot Q_{\\text{turb}}(t) \\cdot H_{\\text{net}}(t) \\cdot \\Delta t",
            variables: [
              {
                symbol: "\\eta",
                meaningVi: "Hiệu suất tổng hợp tuabin – máy phát",
                unitOrDimension: "Không thứ nguyên (giả định 0,88)",
              },
              {
                symbol: "\\rho, g",
                meaningVi: "Khối lượng riêng của nước và gia tốc trọng trường",
                unitOrDimension: "kg/m³ và m/s²",
              },
              {
                symbol: "Q_{\\text{turb}}(t)",
                meaningVi: "Lưu lượng nước qua tuabin ở bước thời gian t",
                unitOrDimension: "m³/s",
              },
              {
                symbol: "H_{\\text{net}}(t)",
                meaningVi: "Cột nước phát điện hiệu dụng sau khi trừ tổn thất",
                unitOrDimension: "m",
              },
            ],
            assumptionsVi:
              "Bài mẫu giả định η = 0,88 không đổi theo cột nước và tải tổ máy.",
          },
          citationIds: ["D02-B02"],
        },
        {
          elementId: "DEMO-TBL-1",
          kind: "table",
          label: "Table 1 — So sánh giai đoạn kiểm định (2016–2020)",
          pdfPage: 3,
          printedPage: "413",
          bbox: [0.07, 0.12, 0.94, 0.2],
          readable: true,
          unreadableReasonVi: null,
          howToReadVi:
            "Đối chiếu từng hàng phương pháp (Rule Curve cơ sở vs. LSTM + NSGA-II) theo 2 chỉ tiêu đối nghịch: Điện lượng năm (càng cao càng tốt) và Đỉnh xả lũ (càng thấp càng an toàn cho hạ du).",
          contentSummaryVi:
            "Phương án mô phỏng đề xuất đạt 431,0 GWh (+4,5%) và đỉnh xả 1.890 m³/s so với 412,5 GWh và 2.150 m³/s của quy trình cơ sở.",
          roleInArgumentVi:
            "Cung cấp bằng chứng định lượng chính cho kết luận của bài mẫu.",
          formulaDetails: null,
          citationIds: ["D03-B01"],
        },
        {
          elementId: "DEMO-FIG-3",
          kind: "figure",
          label: "Figure 3 — Biểu đồ quét phụ lục (Minh họa cảnh báo mờ)",
          pdfPage: 3,
          printedPage: "413",
          bbox: [0.07, 0.24, 0.92, 0.31],
          readable: false,
          unreadableReasonVi:
            "Nhãn trục tung và chú giải của Hình 3 trong bản scan bị nhòe không đọc rõ đơn vị; hệ thống không tự tái tạo số liệu.",
          howToReadVi: "Vui lòng đối chiếu trực tiếp trang PDF gốc.",
          contentSummaryVi: "Không suy đoán nội dung do ảnh gốc bị mờ.",
          roleInArgumentVi: "Minh họa cách hệ thống trung thực đánh dấu phần tử không đọc được.",
          formulaDetails: null,
          citationIds: ["D03-B02"],
        },
      ],
      glossary: [
        {
          termEn: "Multi-objective reservoir operation",
          termVi: "Vận hành hồ chứa đa mục tiêu",
          explanationVi:
            "Bài toán tìm lịch tích – xả nước thỏa mãn đồng thời nhiều mục tiêu thường xung đột nhau như phát điện, cắt lũ hạ du và cấp nước sinh thái.",
          contextInPaperVi: "Bài toán trung tâm được đặt ra ở Mục 1.",
          firstPdfPage: 1,
          printedPage: "411",
          citationId: "D01-B01",
        },
        {
          termEn: "Data leakage",
          termVi: "Rò rỉ dữ liệu",
          explanationVi:
            "Lỗi phương pháp khi thông tin từ tập kiểm tra (test/validation) vô tình lọt vào quá trình huấn luyện hoặc chuẩn hóa dữ liệu, làm kết quả đánh giá cao giả tạo.",
          contextInPaperVi:
            "Tác giả nêu chỉ khớp bộ chuẩn hóa trên giai đoạn 2005–2015 để tránh rò rỉ sang giai đoạn 2016–2020.",
          firstPdfPage: 2,
          printedPage: "412",
          citationId: "D02-B01",
        },
        {
          termEn: "Nash–Sutcliffe Efficiency (NSE)",
          termVi: "Hệ số hiệu quả mô hình Nash–Sutcliffe",
          explanationVi:
            "Chỉ số chuẩn trong thủy văn đánh giá mức độ khớp giữa chuỗi dòng chảy dự báo/mô phỏng và thực đo (tiến gần 1 là rất tốt; bằng 0 tương đương lấy giá trị trung bình).",
          contextInPaperVi: "Dùng đánh giá chất lượng dự báo dòng chảy ở Bảng 1.",
          firstPdfPage: 3,
          printedPage: "413",
          citationId: "D03-B01",
        },
      ],
      suggestedQuestions: [
        "Đóng góp mới của bài này là gì?",
        "Phương pháp có những giả định nào?",
        "Kết quả có đủ hỗ trợ kết luận không?",
        "Giải thích Công thức (1) và đơn vị các biến.",
        "Cần những dữ liệu nào để tái lập nghiên cứu?",
        "Có thể áp dụng phương pháp này trong trường hợp nào?",
      ],
    },
    deepExplanations: {},
    chatHistory: [],
  };
}
