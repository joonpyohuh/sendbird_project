import type { RawFormInput } from "./types";

// Sample API content used by the "Load Sample API" button.
// Mirrors a realistic "Create a user" endpoint for a chat platform.
export const SAMPLE_RAW_NOTES = `Feature name: Create a user
Product area: Chat Platform API
Target reader: Backend developer
Use case: Create a user before starting a chat
Method: POST
Endpoint: /v3/users
Description: Creates a new user in the application.
Authentication: API token
Required headers:
Content-Type: application/json
Api-Token: {your_api_token}
Request body:
{
  "user_id": "junpyo",
  "nickname": "Junpyo",
  "profile_url": "https://example.com/profile.jpg"
}
Response:
{
  "user_id": "junpyo",
  "nickname": "Junpyo",
  "profile_url": "https://example.com/profile.jpg",
  "created_at": 1710000000
}
Errors:
400 Bad Request: missing required field
401 Unauthorized: missing or invalid API token
409 Conflict: user already exists
Operational notes:
Rate limit unknown
Pagination not applicable
Webhook behavior unknown`;

export const SAMPLE_FORM: RawFormInput = {
  rawNotes: SAMPLE_RAW_NOTES,
  featureName: "Create a user",
  endpointTitle: "Create a user",
  productArea: "Chat Platform API",
  targetReader: "backend",
  useCase: "Create a user before starting a chat",
  method: "POST",
  endpointUrl: "/v3/users",
  description: "Creates a new user in the application.",
  authType: "api_token",
  requiredHeaders: `Content-Type: application/json
Api-Token: {your_api_token}`,
  optionalHeaders: "",
  securityNote:
    "The Api-Token is a server-side secret and must never be exposed in client-side code.",
  pathParams: "",
  queryParams: "",
  requestBody: `{
  "user_id": "junpyo",
  "nickname": "Junpyo",
  "profile_url": "https://example.com/profile.jpg"
}`,
  exampleRequest: `POST /v3/users
Content-Type: application/json
Api-Token: {your_api_token}

{
  "user_id": "junpyo",
  "nickname": "Junpyo",
  "profile_url": "https://example.com/profile.jpg"
}`,
  successStatus: "200",
  responseBody: `{
  "user_id": "junpyo",
  "nickname": "Junpyo",
  "profile_url": "https://example.com/profile.jpg",
  "created_at": 1710000000
}`,
  exampleResponse: `{
  "user_id": "junpyo",
  "nickname": "Junpyo",
  "profile_url": "https://example.com/profile.jpg",
  "created_at": 1710000000
}`,
  errorCases: `400 Bad Request: missing required field
401 Unauthorized: missing or invalid API token
409 Conflict: user already exists`,
  rateLimit: "unknown",
  pagination: "not applicable",
  webhook: "unknown",
  retryBehavior: "",
  idempotency: "",
};

// Global Docs Mode: Korean source sample used by "Load Korean API Sample".
export const SAMPLE_KOREAN_SOURCE = `이 API는 유저를 생성할 때 사용합니다. API 토큰이 필요하고, user_id는 필수입니다. nickname은 선택값입니다. 같은 user_id가 이미 있으면 에러가 발생합니다. 이 API는 클라이언트에서 직접 호출하면 안 되고 서버에서 호출해야 합니다.`;

// Default Global Style Guide rules. The user can edit these in the panel, and
// the AI applies them during conversion and review.
export const DEFAULT_STYLE_GUIDE = `Use "API token", not "API key".
Use "request body", not "payload".
Use "response field", not "response value".
Use "create", not "make", for resource creation.
Use "retrieve", not "inquire", for fetching data.
Use "returns an error", not "an error occurs".
Use backticks for field names such as \`user_id\`.
Avoid "just" and "simply".
Prefer concise developer-facing English.
Do not invent technical facts.`;

export const EMPTY_FORM: RawFormInput = {
  rawNotes: "",
  featureName: "",
  endpointTitle: "",
  productArea: "",
  targetReader: "backend",
  useCase: "",
  method: "GET",
  endpointUrl: "",
  description: "",
  authType: "unknown",
  requiredHeaders: "",
  optionalHeaders: "",
  securityNote: "",
  pathParams: "",
  queryParams: "",
  requestBody: "",
  exampleRequest: "",
  successStatus: "",
  responseBody: "",
  exampleResponse: "",
  errorCases: "",
  rateLimit: "",
  pagination: "",
  webhook: "",
  retryBehavior: "",
  idempotency: "",
};
