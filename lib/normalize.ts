import type {
  ApiDocProject,
  AuthType,
  EngineerQuestion,
  ErrorItem,
  FieldItem,
  HeaderItem,
  HttpMethod,
  MissingInfoItem,
  Priority,
  RawFormInput,
  ReviewIssue,
  ReviewIssueCategory,
  TargetReader,
  TechnicalEnglishAlternative,
  TechnicalEnglishIssue,
  TechnicalEnglishResult,
  TechnicalEnglishStyleCheck,
  TechnicalEnglishTerminologyNote,
  ExpressionMapping,
  GlobalDocsResult,
  LanguageCode,
  LanguageQualityIssue,
  TerminologyNote,
  ImprovementLoopSettings,
  ImprovementLoopResult,
  LoopEngineerQuestion,
  LoopImprovement,
  LoopIssue,
  LoopIteration,
  LoopMode,
  PatchPlan,
  QualityDimension,
  QualityScores,
  SectionPatch,
  TokenSavingLoopIteration,
} from "./types";
import { EMPTY_FORM } from "./sample";

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

const FORM_FINGERPRINT_KEYS: (keyof RawFormInput)[] = [
  "rawNotes",
  "featureName",
  "method",
  "endpointUrl",
  "productArea",
  "targetReader",
  "useCase",
  "description",
  "authType",
  "pathParams",
  "queryParams",
  "requestBody",
  "exampleRequest",
  "successStatus",
  "responseBody",
  "exampleResponse",
  "errorCases",
  "rateLimit",
  "pagination",
  "webhook",
  "retryBehavior",
  "idempotency",
  "securityNote",
  "endpointTitle",
];

/** Stable fingerprint so we can tell when cached project results are out of date. */
export function computeFormFingerprint(form: RawFormInput): string {
  const payload: Record<string, string> = {};
  for (const key of FORM_FINGERPRINT_KEYS) {
    payload[key] = String(form[key] ?? "").trim();
  }
  return JSON.stringify(payload);
}

/**
 * When the writer replaces raw notes with a new API, drop stale structured fields
 * (e.g. leftover sample requestBody with "junpyo") that no longer match the notes.
 */
export function reconcileFormWithRawNotes(
  form: RawFormInput,
  newRawNotes: string
): RawFormInput {
  const notes = newRawNotes.trim();
  if (!notes) return { ...form, rawNotes: newRawNotes };

  const endpoint = form.endpointUrl.trim();
  const feature = form.featureName.trim();
  const structuredLikelyStale =
    (endpoint.length > 0 && !notes.includes(endpoint)) ||
    (feature.length > 0 &&
      !notes.toLowerCase().includes(feature.toLowerCase()));

  if (structuredLikelyStale) {
    return {
      ...EMPTY_FORM,
      rawNotes: notes,
      targetReader: form.targetReader,
    };
  }
  return { ...form, rawNotes: newRawNotes };
}

/** Analyze uses raw notes as the only source when present — not leftover form fields. */
export function buildAnalyzePayload(form: RawFormInput): Record<string, unknown> {
  const rawNotes = form.rawNotes.trim();
  if (rawNotes) {
    return {
      mode: "raw_notes_primary",
      rawNotes,
      targetReader: form.targetReader,
    };
  }
  return { mode: "structured_form", form };
}

/**
 * Attach authoritative raw notes to project payloads so doc generation cannot
 * drift back to cached sample examples.
 */
export function buildProjectAiPayload(
  project: ApiDocProject,
  form: RawFormInput
): Record<string, unknown> {
  const authoritativeRawNotes =
    form.rawNotes.trim() || project.rawNotes?.trim() || "";

  if (!authoritativeRawNotes) {
    return { project };
  }

  return {
    project: {
      ...project,
      rawNotes: authoritativeRawNotes,
      request: { ...project.request, example: "" },
      response: { ...project.response, example: "" },
    },
    authoritativeRawNotes,
  };
}

export function isProjectFresh(
  project: ApiDocProject | null,
  form: RawFormInput
): boolean {
  if (!project?.sourceFingerprint) return false;
  return project.sourceFingerprint === computeFormFingerprint(form);
}

const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const AUTH_TYPES: AuthType[] = ["api_token", "bearer_token", "none", "unknown"];
const READERS: TargetReader[] = [
  "beginner",
  "frontend",
  "backend",
  "technical_writer",
];
const PRIORITIES: Priority[] = ["high", "medium", "low"];
const CATEGORIES: ReviewIssueCategory[] = [
  "clarity",
  "consistency",
  "terminology",
  "security",
  "missing_example",
  "client_server_confusion",
  "accuracy",
  "structure",
];

function str(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return fallback;
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return undefined;
}

function bool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    if (["true", "yes", "required"].includes(v.toLowerCase())) return true;
    if (["false", "no", "optional"].includes(v.toLowerCase())) return false;
  }
  return undefined;
}

function oneOf<T extends string>(v: unknown, allowed: T[], fallback: T): T {
  if (typeof v === "string" && (allowed as string[]).includes(v)) {
    return v as T;
  }
  return fallback;
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function field(v: unknown): FieldItem {
  const o = rec(v);
  return {
    name: str(o.name),
    type: str(o.type),
    required: bool(o.required),
    description: str(o.description),
    constraints: str(o.constraints),
    example: str(o.example),
  };
}

function header(v: unknown): HeaderItem {
  const o = rec(v);
  return {
    name: str(o.name),
    required: bool(o.required),
    description: str(o.description),
    example: str(o.example),
  };
}

function errorItem(v: unknown): ErrorItem {
  const o = rec(v);
  return {
    statusCode: num(o.statusCode),
    errorName: str(o.errorName),
    cause: str(o.cause),
    howToFix: str(o.howToFix),
    example: str(o.example),
  };
}

export function normalizeMissingInfo(v: unknown): MissingInfoItem[] {
  return arr(v).map((raw) => {
    const o = rec(raw);
    return {
      item: str(o.item),
      reason: str(o.reason),
      priority: oneOf<Priority>(o.priority, PRIORITIES, "medium"),
      suggestedQuestion: str(o.suggestedQuestion),
    };
  });
}

export function normalizeEngineerQuestions(v: unknown): EngineerQuestion[] {
  return arr(v).map((raw) => {
    const o = rec(raw);
    return {
      id: uid("q"),
      question: str(o.question),
      reason: str(o.reason),
      priority: oneOf<Priority>(o.priority, PRIORITIES, "medium"),
      status: "open",
      owner: str(o.owner),
      answer: "",
      appliedToDocs: false,
    } satisfies EngineerQuestion;
  });
}

export function normalizeReviewIssues(v: unknown): ReviewIssue[] {
  return arr(v).map((raw) => {
    const o = rec(raw);
    return {
      category: oneOf<ReviewIssueCategory>(o.category, CATEGORIES, "clarity"),
      issue: str(o.issue),
      suggestion: str(o.suggestion),
      severity: oneOf<Priority>(o.severity, PRIORITIES, "medium"),
    };
  });
}

/**
 * Convert a (possibly messy) AI JSON object into a fully typed ApiDocProject.
 * Any existing engineer questions / draft are preserved by the caller.
 */
export function normalizeProject(
  v: unknown,
  fallbackId: string
): ApiDocProject {
  const o = rec(v);
  const endpoint = rec(o.endpoint);
  const auth = rec(o.auth);
  const request = rec(o.request);
  const response = rec(o.response);
  const ops = rec(o.operationalNotes);

  return {
    id: str(o.id, fallbackId) || fallbackId,
    title: str(o.title),
    productArea: str(o.productArea),
    targetReader: oneOf<TargetReader>(o.targetReader, READERS, "backend"),
    useCase: str(o.useCase),
    rawNotes: str(o.rawNotes),
    endpoint: {
      method: oneOf<HttpMethod>(endpoint.method, METHODS, "GET"),
      url: str(endpoint.url),
      description: str(endpoint.description),
    },
    auth: {
      type: oneOf<AuthType>(auth.type, AUTH_TYPES, "unknown"),
      requiredHeaders: arr(auth.requiredHeaders).map(header),
      optionalHeaders: arr(auth.optionalHeaders).map(header),
      securityNotes: arr(auth.securityNotes).map((s) => str(s)).filter(Boolean),
    },
    request: {
      pathParams: arr(request.pathParams).map(field),
      queryParams: arr(request.queryParams).map(field),
      bodyFields: arr(request.bodyFields).map(field),
      example: str(request.example),
    },
    response: {
      successStatus: num(response.successStatus),
      fields: arr(response.fields).map(field),
      example: str(response.example),
    },
    errors: arr(o.errors).map(errorItem),
    operationalNotes: {
      rateLimit: str(ops.rateLimit),
      pagination: str(ops.pagination),
      webhook: str(ops.webhook),
      retryBehavior: str(ops.retryBehavior),
      idempotency: str(ops.idempotency),
    },
    missingInfo: normalizeMissingInfo(o.missingInfo),
    engineerQuestions: [],
    docDraftMarkdown: "",
    reviewIssues: [],
  };
}

/**
 * Build a minimal local project directly from form input. Used as a fallback so
 * the middle column can show something even before "Analyze API" is run.
 */
export function projectFromForm(form: RawFormInput): ApiDocProject {
  return {
    id: uid("proj"),
    title: form.featureName || form.endpointTitle || "Untitled API",
    productArea: form.productArea,
    targetReader: form.targetReader,
    useCase: form.useCase,
    rawNotes: form.rawNotes,
    endpoint: {
      method: form.method,
      url: form.endpointUrl,
      description: form.description,
    },
    auth: {
      type: form.authType,
      requiredHeaders: [],
      optionalHeaders: [],
      securityNotes: form.securityNote ? [form.securityNote] : [],
    },
    request: {
      pathParams: [],
      queryParams: [],
      bodyFields: [],
      example: form.exampleRequest,
    },
    response: {
      successStatus: form.successStatus ? Number(form.successStatus) : undefined,
      fields: [],
      example: form.exampleResponse,
    },
    errors: [],
    operationalNotes: {
      rateLimit: form.rateLimit,
      pagination: form.pagination,
      webhook: form.webhook,
      retryBehavior: form.retryBehavior,
      idempotency: form.idempotency,
    },
    missingInfo: [],
    engineerQuestions: [],
    docDraftMarkdown: "",
    reviewIssues: [],
    technicalEnglish: null,
    sourceFingerprint: computeFormFingerprint(form),
  };
}

const STYLE_STATUSES: TechnicalEnglishStyleCheck["status"][] = [
  "passed",
  "needs_revision",
  "not_applicable",
];

function alternative(v: unknown): TechnicalEnglishAlternative {
  const o = rec(v);
  return {
    expression: str(o.expression),
    nuance: str(o.nuance),
    whenToUse: str(o.whenToUse),
  };
}

function englishIssue(v: unknown): TechnicalEnglishIssue {
  const o = rec(v);
  return {
    koreanExpression: str(o.koreanExpression),
    literalEnglish: str(o.literalEnglish),
    recommendedEnglish: str(o.recommendedEnglish),
    reason: str(o.reason),
    alternatives: arr(o.alternatives).map(alternative),
    caution: str(o.caution),
  };
}

function terminologyNote(v: unknown): TechnicalEnglishTerminologyNote {
  const o = rec(v);
  return {
    term: str(o.term),
    recommendedExpression: str(o.recommendedExpression),
    avoid: str(o.avoid),
    reason: str(o.reason),
  };
}

function styleCheck(v: unknown): TechnicalEnglishStyleCheck {
  const o = rec(v);
  return {
    rule: str(o.rule),
    status: oneOf(o.status, STYLE_STATUSES, "not_applicable"),
    comment: str(o.comment),
  };
}

/**
 * Convert a (possibly messy) AI JSON object into a typed TechnicalEnglishResult.
 * `fallbackKorean` is used when the model omits the echoed source text.
 */
export function normalizeTechnicalEnglish(
  v: unknown,
  fallbackKorean: string
): TechnicalEnglishResult {
  const o = rec(v);
  const recommended = str(o.recommendedEnglish);
  const polished = str(o.finalPolishedVersion) || recommended;
  return {
    originalKorean: str(o.originalKorean) || fallbackKorean,
    recommendedEnglish: recommended,
    expressionBreakdown: arr(o.expressionBreakdown).map(englishIssue),
    terminologyNotes: arr(o.terminologyNotes).map(terminologyNote),
    styleGuideChecks: arr(o.styleGuideChecks).map(styleCheck),
    finalPolishedVersion: polished,
  };
}

// Global Docs Mode normalizers ----------------------------------------------

const LANGUAGE_CODES: LanguageCode[] = ["ko", "en"];

function expressionMapping(v: unknown): ExpressionMapping {
  const o = rec(v);
  return {
    koreanExpression: str(o.koreanExpression),
    recommendedEnglish: str(o.recommendedEnglish),
    literalTranslation: str(o.literalTranslation),
    reason: str(o.reason),
    alternatives: arr(o.alternatives).map(alternative),
    caution: str(o.caution),
  };
}

function globalTerminologyNote(v: unknown): TerminologyNote {
  const o = rec(v);
  return {
    koreanTerm: str(o.koreanTerm),
    recommendedEnglish: str(o.recommendedEnglish),
    avoid: str(o.avoid),
    reason: str(o.reason),
    exampleUsage: str(o.exampleUsage),
  };
}

export function normalizeLanguageQualityIssues(
  v: unknown
): LanguageQualityIssue[] {
  return arr(v).map((raw) => {
    const o = rec(raw);
    return {
      issue: str(o.issue),
      suggestion: str(o.suggestion),
      reason: str(o.reason),
      severity: oneOf<Priority>(o.severity, PRIORITIES, "medium"),
    };
  });
}

/**
 * Convert a (possibly messy) AI JSON object into a typed GlobalDocsResult.
 */
export function normalizeGlobalDocsResult(
  v: unknown,
  fallback: { sourceLanguage: LanguageCode; targetLanguage: LanguageCode }
): GlobalDocsResult {
  const o = rec(v);
  const recommended = str(o.recommendedEnglish);
  const polished = str(o.finalPolishedVersion) || recommended;
  return {
    sourceLanguage: oneOf<LanguageCode>(
      o.sourceLanguage,
      LANGUAGE_CODES,
      fallback.sourceLanguage
    ),
    targetLanguage: oneOf<LanguageCode>(
      o.targetLanguage,
      LANGUAGE_CODES,
      fallback.targetLanguage
    ),
    recommendedEnglish: recommended,
    finalPolishedVersion: polished,
    expressionMappings: arr(o.expressionMappings).map(expressionMapping),
    terminologyNotes: arr(o.terminologyNotes).map(globalTerminologyNote),
    styleGuideChecks: arr(o.styleGuideChecks).map(styleCheck),
    languageQualityIssues: normalizeLanguageQualityIssues(
      o.languageQualityIssues
    ),
  };
}

// Documentation Improvement Loop normalizers --------------------------------

const LOOP_MODES: LoopMode[] = ["conservative", "balanced", "aggressive"];
const QUALITY_DIMENSIONS: QualityDimension[] = [
  "accuracy",
  "completeness",
  "clarity",
  "style_guide",
  "developer_readability",
  "security",
  "technical_english",
  "structure",
];

function clampScore(v: unknown): number {
  const n = num(v);
  if (n === undefined) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeQualityScores(v: unknown): QualityScores {
  const o = rec(v);
  const accuracy = clampScore(o.accuracy);
  const completeness = clampScore(o.completeness);
  const clarity = clampScore(o.clarity);
  const styleGuide = clampScore(o.styleGuide ?? o.style_guide);
  const developerReadability = clampScore(
    o.developerReadability ?? o.developer_readability
  );
  const security = clampScore(o.security);
  const technicalEnglish = clampScore(
    o.technicalEnglish ?? o.technical_english
  );
  const structure = clampScore(o.structure);
  const weightedOverall = Math.round(
    accuracy * 0.18 +
      completeness * 0.16 +
      clarity * 0.16 +
      styleGuide * 0.1 +
      developerReadability * 0.16 +
      security * 0.12 +
      technicalEnglish * 0.12 +
      structure * 0.1
  );
  const modelOverall = clampScore(o.overall);

  return {
    overall: Math.max(modelOverall, weightedOverall),
    accuracy,
    completeness,
    clarity,
    styleGuide,
    developerReadability,
    security,
    technicalEnglish,
    structure,
  };
}

function loopIssue(v: unknown): LoopIssue {
  const o = rec(v);
  return {
    id: str(o.id) || uid("loop_issue"),
    dimension: oneOf<QualityDimension>(o.dimension, QUALITY_DIMENSIONS, "clarity"),
    issue: str(o.issue),
    impact: oneOf<Priority>(o.impact, PRIORITIES, "medium"),
    suggestion: str(o.suggestion),
    requiresEngineerInput: bool(o.requiresEngineerInput) ?? false,
  };
}

function loopImprovement(v: unknown): LoopImprovement {
  const o = rec(v);
  return {
    id: str(o.id) || uid("loop_imp"),
    description: str(o.description),
    dimension: oneOf<QualityDimension>(o.dimension, QUALITY_DIMENSIONS, "clarity"),
    before: str(o.before),
    after: str(o.after),
  };
}

function loopEngineerQuestion(v: unknown): LoopEngineerQuestion {
  const o = rec(v);
  return {
    id: str(o.id) || uid("loop_q"),
    question: str(o.question),
    reason: str(o.reason),
    priority: oneOf<Priority>(o.priority, PRIORITIES, "medium"),
    relatedIssue: str(o.relatedIssue),
  };
}

export const DEFAULT_LOOP_SETTINGS: ImprovementLoopSettings = {
  targetScore: 88,
  maxIterations: 3,
  hardMaxIterations: 4,
  mode: "balanced",
  stopWhenMissingFacts: false,
  applyStyleGuide: true,
  includeTechnicalEnglishReview: true,
  includeSecurityReview: true,
  tokenSavingMode: true,
  allowFullRewrite: false,
};

export function createIdleLoopResult(
  settings: ImprovementLoopSettings = DEFAULT_LOOP_SETTINGS
): ImprovementLoopResult {
  return {
    status: "idle",
    settings,
    iterations: [],
    bestDraft: "",
    blockingQuestions: [],
  };
}

/**
 * Convert AI JSON into a typed LoopIteration for one improvement loop step.
 */
export function normalizeLoopIteration(
  v: unknown,
  fallback: {
    iterationNumber: number;
    inputDraft: string;
  }
): LoopIteration {
  const o = rec(v);
  const outputDraft = str(o.outputDraft) || fallback.inputDraft;
  return {
    iterationNumber: num(o.iterationNumber) ?? fallback.iterationNumber,
    inputDraft: str(o.inputDraft) || fallback.inputDraft,
    outputDraft,
    scores: normalizeQualityScores(o.scores),
    issues: arr(o.issues).map(loopIssue),
    improvements: arr(o.improvements).map(loopImprovement),
    engineerQuestions: arr(o.engineerQuestions).map(loopEngineerQuestion),
    summary: str(o.summary),
    stopRecommended: bool(o.stopRecommended) ?? false,
    stopReason: str(o.stopReason),
  };
}

const PATCH_ACTIONS: SectionPatch["action"][] = [
  "replace",
  "insert_after",
  "append",
  "delete",
];

function sectionPatch(v: unknown): SectionPatch {
  const o = rec(v);
  return {
    sectionTitle: str(o.sectionTitle),
    action: oneOf(o.action, PATCH_ACTIONS, "replace"),
    targetSection: str(o.targetSection) || undefined,
    markdown: str(o.markdown),
    reason: str(o.reason),
  };
}

function patchPlan(v: unknown): PatchPlan {
  const o = rec(v);
  return {
    summary: str(o.summary),
    sectionsToPatch: arr(o.sectionsToPatch).map((s) => str(s)).filter(Boolean),
    estimatedImpact: oneOf<Priority>(o.estimatedImpact, PRIORITIES, "medium"),
  };
}

/** Review pass: scores, issues, patch plan — no full draft rewrite. */
export function normalizeLoopReview(
  v: unknown,
  fallback: { iterationNumber: number }
): Omit<
  TokenSavingLoopIteration,
  "patches" | "inputDraft" | "outputDraft"
> {
  const o = rec(v);
  return {
    iterationNumber: num(o.iterationNumber) ?? fallback.iterationNumber,
    scores: normalizeQualityScores(o.scores),
    issues: arr(o.issues).map(loopIssue).slice(0, 5),
    patchPlan: patchPlan(o.patchPlan),
    engineerQuestions: arr(o.engineerQuestions)
      .map(loopEngineerQuestion)
      .slice(0, 5),
    stopRecommended: bool(o.stopRecommended) ?? false,
    stopReason: str(o.stopReason) || undefined,
  };
}

/** Patch pass: section patches only. */
export function normalizeLoopPatch(v: unknown): SectionPatch[] {
  const o = rec(v);
  return arr(o.patches).map(sectionPatch).slice(0, 3);
}

/** Issue signature for duplicate detection across iterations. */
export function loopIssueKey(issue: LoopIssue): string {
  return issue.issue.trim().toLowerCase();
}

/** True if any issue text appeared in a prior iteration. */
export function hasRepeatedIssue(
  issues: LoopIssue[],
  seenKeys: Set<string>
): boolean {
  return issues.some((iss) => {
    const key = loopIssueKey(iss);
    return key.length > 0 && seenKeys.has(key);
  });
}

export function registerIssueKeys(
  issues: LoopIssue[],
  seenKeys: Set<string>
): void {
  for (const iss of issues) {
    const key = loopIssueKey(iss);
    if (key) seenKeys.add(key);
  }
}
