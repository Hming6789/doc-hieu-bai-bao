export type PaperDomain = "AI_ML" | "HYDROPOWER_WATER" | "OTHER_SCIENCE";

export type StatementType =
  | "author_claim"
  | "ai_explanation"
  | "methodological_note"
  | "external_background";

export type NormalizedBBox = [number, number, number, number]; // [x0, y0, x1, y1] in 0..1

export interface DocumentChunk {
  chunkId: string; // e.g., "P06-B04"
  pdfPage: number; // 1-based PDF page index
  printedPage: string | null; // Printed page label on the article if detected (e.g., "312")
  sectionTitle: string | null;
  bbox: NormalizedBBox;
  text: string;
  source: "pdf_text" | "vision_ocr";
}

export interface PageMapping {
  pdfPage: number;
  printedPage: string | null;
  widthPt: number;
  heightPt: number;
  usedOcr: boolean;
  imageCount: number;
  charCount: number;
}

export interface ExtractionWarning {
  id: string;
  pdfPage: number;
  printedPage: string | null;
  elementLabel?: string;
  severity: "warning" | "degraded";
  messageVi: string;
}

export interface DetectedSection {
  sectionId: string;
  title: string;
  startPdfPage: number;
  endPdfPage: number;
  printedPageStart: string | null;
  chunkIds: string[];
}

export interface ExtractionReport {
  totalPages: number;
  fileSizeBytes: number;
  textExtractedPages: number[];
  ocrProcessedPages: number[];
  hasDistinctPrintedPages: boolean;
  missingPrintedPageGaps: string[];
  warnings: ExtractionWarning[];
  qualityStatus: "complete" | "partial";
}

export interface ResolvedCitation {
  chunkId: string;
  pdfPage: number;
  printedPage: string | null;
  sectionTitle: string | null;
  bbox: NormalizedBBox;
  snippet: string;
}

export interface GroundedStatement {
  statementType: StatementType;
  textVi: string;
  citationIds: string[];
  externalSource?: string | null;
}

export interface QuickReadAnalysis {
  researchProblem: GroundedStatement[];
  whyItMatters: GroundedStatement[];
  whatAuthorsDid: GroundedStatement[];
  keyFindings: GroundedStatement[];
  significanceAndLimitations: GroundedStatement[];
}

export interface PaperMetadata {
  titleEn: string;
  titleViExplanation: string;
  authors: string;
  venueAndYear: string;
  doiOrIdentifier: string;
  publicationNoteVi: string;
}

export interface AiDomainAnalysis {
  domain: "AI_ML";
  problemAndData: GroundedStatement[];
  modelAndTraining: GroundedStatement[];
  evaluationMetrics: {
    metricName: string;
    meaningAndRoleVi: string;
    reportedValues: string;
    citationIds: string[];
  }[];
  baselinesAndComparisonConditions: GroundedStatement[];
  generalizationLeakageAndReproducibility: {
    dataLeakageCheck: GroundedStatement[];
    generalizationScope: GroundedStatement[];
    reproducibilityCheck: GroundedStatement[];
  };
  benchmarkVsRealWorld: GroundedStatement[];
}

export interface HydropowerDomainAnalysis {
  domain: "HYDROPOWER_WATER";
  projectBasinAndTimeSeries: GroundedStatement[];
  hydrologicalOperationOptimizationSafety: GroundedStatement[];
  unitsBoundaryConditionsAssumptionsAndScenarios: {
    unitsAndQuantitiesPreserved: string[];
    boundaryConditionsAndConstraints: GroundedStatement[];
    assumptionsAndScenarios: GroundedStatement[];
  };
  simulationVsFieldValidation: GroundedStatement[];
  transferabilityToOtherBasinsOrPlants: GroundedStatement[];
}

export interface OtherScienceDomainAnalysis {
  domain: "OTHER_SCIENCE";
  studyTypeLabelVi: string; // Thực nghiệm / Hiện trường / Mô hình toán học / Tổng quan...
  researchDesignAndMeasurements: GroundedStatement[];
  assumptionsAndControlConditions: GroundedStatement[];
  scopeAndTransferabilityLimits: GroundedStatement[];
}

export type DomainSpecificAnalysis =
  | AiDomainAnalysis
  | HydropowerDomainAnalysis
  | OtherScienceDomainAnalysis;

export interface FormulaVariable {
  symbol: string;
  meaningVi: string;
  unitOrDimension: string;
}

export interface ExplainedVisualElement {
  elementId: string;
  kind: "table" | "figure" | "equation";
  label: string; // e.g. "Table 2", "Figure 4", "Equation (3)"
  pdfPage: number;
  printedPage: string | null;
  bbox: NormalizedBBox | null;
  readable: boolean;
  unreadableReasonVi: string | null;
  howToReadVi: string;
  contentSummaryVi: string;
  roleInArgumentVi: string;
  formulaDetails: {
    latex: string;
    variables: FormulaVariable[];
    assumptionsVi: string;
  } | null;
  citationIds: string[];
}

export interface GlossaryItem {
  termEn: string;
  termVi: string;
  explanationVi: string;
  contextInPaperVi: string;
  firstPdfPage: number;
  printedPage: string | null;
  citationId: string | null;
}

export interface FullPaperAnalysis {
  paperInfo: PaperMetadata;
  contextAndResearchGap: GroundedStatement[];
  objectivesQuestionsHypotheses: GroundedStatement[];
  dataAndMethodsOverview: GroundedStatement[];
  domainSpecific: DomainSpecificAnalysis;
  mainResults: GroundedStatement[];
  noveltyAndContributions: GroundedStatement[];
  strengths: GroundedStatement[];
  limitations: GroundedStatement[];
  applicabilityAndConditions: GroundedStatement[];
  openQuestions: GroundedStatement[];
}

export type DepthLevel = "basic" | "technical";

export interface DeepSectionExplanation {
  sectionId: string;
  sectionTitle: string;
  depth: DepthLevel;
  generatedAt: string;
  keyArguments: GroundedStatement[];
  termsAndConceptsClarified: {
    termEn: string;
    explanationVi: string;
  }[];
  tablesFiguresFormulasInSection: ExplainedVisualElement[];
  criticalReadingNotes: GroundedStatement[];
}

export interface PaperAnalysisResult {
  domain: PaperDomain;
  domainLabelVi: string;
  domainReasonVi: string;
  honestyDisclaimerVi: string;
  quickRead: QuickReadAnalysis;
  fullAnalysis: FullPaperAnalysis;
  visualElements: ExplainedVisualElement[];
  glossary: GlossaryItem[];
  suggestedQuestions: string[];
}

export interface GroundedChatAnswer {
  inPaperAnswers: GroundedStatement[];
  notInPaperNoticeVi: string | null;
  externalKnowledgeBox: {
    explanationVi: string;
    verifiableSources: string[];
  } | null;
  followUpSuggestions: string[];
}

export interface ChatTurn {
  id: string;
  createdAt: string;
  questionVi: string;
  answer: GroundedChatAnswer;
}

export type SessionStatus = "processing" | "complete" | "partial" | "error";

export interface ProcessingProgress {
  step: 1 | 2 | 3 | 4;
  stepLabelVi: string;
  detailVi: string;
  percent: number;
}

export interface SessionPayload {
  sessionId: string;
  fileName: string;
  createdAt: string;
  expiresAt: string;
  status: SessionStatus;
  progress: ProcessingProgress;
  errorMessageVi: string | null;
  isDemo?: boolean;
  pageMappings: PageMapping[];
  sections: DetectedSection[];
  extractionReport: ExtractionReport | null;
  citationMap: Record<string, ResolvedCitation>;
  analysis: PaperAnalysisResult | null;
  deepExplanations: Record<string, DeepSectionExplanation>; // key: `${sectionId}:${depth}`
  chatHistory: ChatTurn[];
}

export interface LocalRecentSession {
  sessionId: string;
  sessionSecret: string;
  fileName: string;
  domainLabelVi?: string;
  createdAt: string;
  expiresAt: string;
}
