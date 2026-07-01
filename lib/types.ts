// Core domain types for API Doc Workspace.
// These types are shared between the client UI and the server AI route.

export type TargetReader =
  | "beginner"
  | "frontend"
  | "backend"
  | "technical_writer";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type Priority = "high" | "medium" | "low";

export type QuestionStatus = "open" | "answered" | "applied";

export type AuthType = "api_token" | "bearer_token" | "none" | "unknown";

export type FieldItem = {
  name: string;
  type?: string;
  required?: boolean;
  description?: string;
  constraints?: string;
  example?: string;
};

export type HeaderItem = {
  name: string;
  required?: boolean;
  description?: string;
  example?: string;
};

export type ErrorItem = {
  statusCode?: number;
  errorName?: string;
  cause?: string;
  howToFix?: string;
  example?: string;
};

export type EngineerQuestion = {
  id: string;
  question: string;
  reason: string;
  priority: Priority;
  status: QuestionStatus;
  owner?: string;
  answer?: string;
  appliedToDocs?: boolean;
};

export type MissingInfoItem = {
  item: string;
  reason: string;
  priority: Priority;
  suggestedQuestion?: string;
};

export type ReviewIssueCategory =
  | "clarity"
  | "consistency"
  | "terminology"
  | "security"
  | "missing_example"
  | "client_server_confusion"
  | "accuracy"
  | "structure";

export type ReviewIssue = {
  category: ReviewIssueCategory;
  issue: string;
  suggestion: string;
  severity: Priority;
};

export type ApiDocProject = {
  id: string;
  title: string;
  productArea?: string;
  targetReader: TargetReader;
  useCase?: string;
  rawNotes?: string;
  endpoint: {
    method: HttpMethod;
    url: string;
    description: string;
  };
  auth: {
    type: AuthType;
    requiredHeaders: HeaderItem[];
    optionalHeaders: HeaderItem[];
    securityNotes: string[];
  };
  request: {
    pathParams: FieldItem[];
    queryParams: FieldItem[];
    bodyFields: FieldItem[];
    example: string;
  };
  response: {
    successStatus?: number;
    fields: FieldItem[];
    example: string;
  };
  errors: ErrorItem[];
  operationalNotes: {
    rateLimit?: string;
    pagination?: string;
    webhook?: string;
    retryBehavior?: string;
    idempotency?: string;
  };
  missingInfo: MissingInfoItem[];
  engineerQuestions: EngineerQuestion[];
  docDraftMarkdown: string;
  reviewIssues: ReviewIssue[];
  technicalEnglish?: TechnicalEnglishResult | null;
  /** Hash of form fields at last Analyze — used to detect stale cached results. */
  sourceFingerprint?: string;
};

// AI route contract -----------------------------------------------------------

export type AiAction =
  | "analyze"
  | "missing_info"
  | "engineer_questions"
  | "generate_doc"
  | "review_doc"
  | "technical_english_coach"
  | "global_docs_convert"
  | "language_quality_review"
  | "run_improvement_loop_iteration"
  | "run_improvement_loop_review"
  | "run_improvement_loop_patch";

// Technical English Coach --------------------------------------------------

export type TechnicalEnglishTargetStyle =
  | "api_reference"
  | "tutorial"
  | "release_note"
  | "engineer_question"
  | "error_explanation"
  | "ui_copy"
  | "faq";

export type TechnicalEnglishAlternative = {
  expression: string;
  nuance: string;
  whenToUse: string;
};

export type TechnicalEnglishIssue = {
  koreanExpression: string;
  literalEnglish?: string;
  recommendedEnglish: string;
  reason: string;
  alternatives: TechnicalEnglishAlternative[];
  caution?: string;
};

export type TechnicalEnglishTerminologyNote = {
  term: string;
  recommendedExpression: string;
  avoid?: string;
  reason: string;
};

export type TechnicalEnglishStyleCheck = {
  rule: string;
  status: "passed" | "needs_revision" | "not_applicable";
  comment: string;
};

export type TechnicalEnglishResult = {
  originalKorean: string;
  recommendedEnglish: string;
  expressionBreakdown: TechnicalEnglishIssue[];
  terminologyNotes: TechnicalEnglishTerminologyNote[];
  styleGuideChecks: TechnicalEnglishStyleCheck[];
  finalPolishedVersion: string;
};

export type TechnicalEnglishPayload = {
  koreanText: string;
  targetStyle: TechnicalEnglishTargetStyle;
  targetReader: TargetReader;
  styleGuide?: string;
  existingGlossary?: string[];
};

// Global Docs Mode ---------------------------------------------------------

export type LanguageCode = "ko" | "en";

export type GlobalDocsWorkflow =
  | "korean_source_to_english_docs"
  | "english_source_to_english_docs"
  | "korean_review_to_english_polish"
  | "bilingual_compare";

export type GlobalDocsConvertPayload = {
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  workflow: GlobalDocsWorkflow;
  sourceText: string;
  targetStyle: TechnicalEnglishTargetStyle;
  targetReader: TargetReader;
  styleGuide?: string;
  existingDraft?: string;
};

export type ExpressionMapping = {
  koreanExpression: string;
  recommendedEnglish: string;
  literalTranslation?: string;
  reason: string;
  alternatives: TechnicalEnglishAlternative[];
  caution?: string;
};

export type TerminologyNote = {
  koreanTerm: string;
  recommendedEnglish: string;
  avoid?: string;
  reason: string;
  exampleUsage: string;
};

export type LanguageQualityIssue = {
  issue: string;
  suggestion: string;
  reason: string;
  severity: Priority;
};

export type GlobalDocsResult = {
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  recommendedEnglish: string;
  finalPolishedVersion: string;
  expressionMappings: ExpressionMapping[];
  terminologyNotes: TerminologyNote[];
  styleGuideChecks: TechnicalEnglishStyleCheck[];
  languageQualityIssues: LanguageQualityIssue[];
};

export type LanguageQualityReviewPayload = {
  englishText: string;
  styleGuide?: string;
  targetStyle?: TechnicalEnglishTargetStyle;
  targetReader?: TargetReader;
};

// Documentation Improvement Loop -------------------------------------------

export type LoopMode = "conservative" | "balanced" | "aggressive";

export type QualityDimension =
  | "accuracy"
  | "completeness"
  | "clarity"
  | "style_guide"
  | "developer_readability"
  | "security"
  | "technical_english"
  | "structure";

export type QualityScores = {
  overall: number;
  accuracy: number;
  completeness: number;
  clarity: number;
  styleGuide: number;
  developerReadability: number;
  security: number;
  technicalEnglish: number;
  structure: number;
};

export type LoopIssue = {
  id: string;
  dimension: QualityDimension;
  issue: string;
  impact: Priority;
  suggestion: string;
  requiresEngineerInput: boolean;
};

export type LoopImprovement = {
  id: string;
  description: string;
  dimension: QualityDimension;
  before?: string;
  after?: string;
};

export type LoopEngineerQuestion = {
  id: string;
  question: string;
  reason: string;
  priority: Priority;
  relatedIssue?: string;
};

export type SectionPatch = {
  sectionTitle: string;
  action: "replace" | "insert_after" | "append" | "delete";
  targetSection?: string;
  markdown: string;
  reason: string;
};

export type PatchPlan = {
  summary: string;
  sectionsToPatch: string[];
  estimatedImpact: Priority;
};

export type TokenSavingLoopIteration = {
  iterationNumber: number;
  inputDraft?: string;
  outputDraft?: string;
  scores: QualityScores;
  issues: LoopIssue[];
  patchPlan: PatchPlan;
  patches: SectionPatch[];
  engineerQuestions: LoopEngineerQuestion[];
  stopRecommended: boolean;
  stopReason?: string;
};

export type LoopIteration = {
  iterationNumber: number;
  inputDraft: string;
  outputDraft: string;
  scores: QualityScores;
  issues: LoopIssue[];
  improvements: LoopImprovement[];
  engineerQuestions: LoopEngineerQuestion[];
  summary: string;
  stopRecommended: boolean;
  stopReason?: string;
  patchPlan?: PatchPlan;
  patches?: SectionPatch[];
};

export type ImprovementLoopSettings = {
  targetScore: number;
  maxIterations: number;
  hardMaxIterations: number;
  mode: LoopMode;
  stopWhenMissingFacts: boolean;
  applyStyleGuide: boolean;
  includeTechnicalEnglishReview: boolean;
  includeSecurityReview: boolean;
  tokenSavingMode: boolean;
  allowFullRewrite: boolean;
};

export type ImprovementLoopResult = {
  status: "idle" | "running" | "completed" | "stopped" | "failed";
  settings: ImprovementLoopSettings;
  iterations: TokenSavingLoopIteration[];
  bestDraft: string;
  baselineScores?: QualityScores;
  bestScores?: QualityScores;
  finalScore?: number;
  stopReason?: string;
  blockingQuestions: LoopEngineerQuestion[];
};

export type ImprovementLoopReviewPayload = {
  currentDraft: string;
  apiProjectSummary: Record<string, unknown>;
  styleGuide?: string;
  targetReader: TargetReader;
  settings: ImprovementLoopSettings;
  iterationNumber: number;
  lastScore?: number;
  unresolvedIssues?: LoopIssue[];
};

export type ImprovementLoopPatchPayload = {
  currentDraft: string;
  apiProjectSummary: Record<string, unknown>;
  styleGuide?: string;
  targetReader: TargetReader;
  settings: ImprovementLoopSettings;
  iterationNumber: number;
  patchPlan: PatchPlan;
  issues: LoopIssue[];
  sectionsToPatch: string[];
};

export type ImprovementLoopIterationPayload = {
  currentDraft: string;
  apiProject: ApiDocProject;
  styleGuide?: string;
  targetReader: TargetReader;
  settings: ImprovementLoopSettings;
  iterationNumber: number;
  previousIterations?: LoopIteration[];
};

export type AiRequestBody = {
  action: AiAction;
  payload: unknown;
};

// Raw form input captured from the left column. This is the loosely-typed
// shape that the "Analyze API" step converts into a structured ApiDocProject.
export type RawFormInput = {
  rawNotes: string;
  featureName: string;
  endpointTitle: string;
  productArea: string;
  targetReader: TargetReader;
  useCase: string;
  method: HttpMethod;
  endpointUrl: string;
  description: string;
  authType: AuthType;
  requiredHeaders: string;
  optionalHeaders: string;
  securityNote: string;
  pathParams: string;
  queryParams: string;
  requestBody: string;
  exampleRequest: string;
  successStatus: string;
  responseBody: string;
  exampleResponse: string;
  errorCases: string;
  rateLimit: string;
  pagination: string;
  webhook: string;
  retryBehavior: string;
  idempotency: string;
};
