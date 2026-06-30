import type { ApiDocProject } from "./types";

/**
 * Compact API project summary for token-efficient loop prompts.
 * Omits large examples and full iteration history.
 */
export function compactApiProjectSummary(
  project: ApiDocProject
): Record<string, unknown> {
  return {
    title: project.title,
    productArea: project.productArea,
    targetReader: project.targetReader,
    endpoint: project.endpoint,
    auth: {
      type: project.auth.type,
      requiredHeaders: project.auth.requiredHeaders.slice(0, 6),
      securityNotes: project.auth.securityNotes.slice(0, 3),
    },
    request: {
      pathParams: project.request.pathParams,
      queryParams: project.request.queryParams,
      bodyFields: project.request.bodyFields,
    },
    response: {
      successStatus: project.response.successStatus,
      fields: project.response.fields,
    },
    errors: project.errors.slice(0, 8),
    operationalNotes: project.operationalNotes,
    missingInfo: project.missingInfo.slice(0, 5).map((m) => m.item),
  };
}
