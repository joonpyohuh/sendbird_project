import type { ApiDocProject, FieldItem } from "@/lib/types";
import {
  AUTH_LABELS,
  MethodBadge,
  Pill,
  READER_LABELS,
} from "./Badges";
import EmptyState from "./EmptyState";

function FieldList({ fields }: { fields: FieldItem[] }) {
  if (fields.length === 0) {
    return <p className="text-xs text-slate-400">—</p>;
  }
  return (
    <ul className="space-y-1.5">
      {fields.map((f, i) => (
        <li key={`${f.name}-${i}`} className="text-xs text-slate-600">
          <span className="font-mono font-medium text-slate-800">
            {f.name || "(unnamed)"}
          </span>
          {f.type && <span className="text-slate-400"> : {f.type}</span>}
          {f.required ? (
            <span className="ml-1 text-rose-500">*required</span>
          ) : f.required === false ? (
            <span className="ml-1 text-slate-400">optional</span>
          ) : null}
          {f.description && (
            <span className="block text-slate-500">{f.description}</span>
          )}
          {f.constraints && (
            <span className="block text-[11px] text-slate-400">
              constraints: {f.constraints}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="col-span-2 text-xs text-slate-700">{children}</dd>
    </div>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h4>
      {children}
    </div>
  );
}

export default function StructuredSummary({
  project,
}: {
  project: ApiDocProject | null;
}) {
  if (!project) {
    return (
      <EmptyState
        title="아직 구조화된 요약이 없습니다"
        description="왼쪽에서 API 정보를 입력하고 'Analyze API'를 실행하면 여기에 정리된 요약이 표시됩니다."
      />
    );
  }

  const { endpoint, auth, request, response, errors, operationalNotes } =
    project;
  const requiredFields = [
    ...request.pathParams,
    ...request.queryParams,
    ...request.bodyFields,
  ].filter((f) => f.required);
  const optionalFields = [
    ...request.pathParams,
    ...request.queryParams,
    ...request.bodyFields,
  ].filter((f) => f.required === false);

  const ops = Object.entries({
    "Rate limit": operationalNotes.rateLimit,
    Pagination: operationalNotes.pagination,
    Webhook: operationalNotes.webhook,
    "Retry behavior": operationalNotes.retryBehavior,
    Idempotency: operationalNotes.idempotency,
  }).filter(([, v]) => v && v.trim());

  return (
    <div className="space-y-3">
      <Block title="Endpoint">
        <h3 className="text-sm font-semibold text-slate-900">
          {project.title || "Untitled API"}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <MethodBadge method={endpoint.method} />
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">
            {endpoint.url || "—"}
          </code>
        </div>
        {endpoint.description && (
          <p className="mt-2 text-xs text-slate-600">{endpoint.description}</p>
        )}
        <dl className="mt-2 divide-y divide-slate-100">
          <Row label="Target reader">
            <Pill>{READER_LABELS[project.targetReader]}</Pill>
          </Row>
          <Row label="Auth type">
            <Pill>{AUTH_LABELS[auth.type]}</Pill>
          </Row>
          {project.productArea && (
            <Row label="Product area">{project.productArea}</Row>
          )}
          {project.useCase && <Row label="Use case">{project.useCase}</Row>}
        </dl>
      </Block>

      <div className="grid gap-3 sm:grid-cols-2">
        <Block title="Required fields">
          <FieldList fields={requiredFields} />
        </Block>
        <Block title="Optional fields">
          <FieldList fields={optionalFields} />
        </Block>
      </div>

      <Block title="Success response">
        <p className="text-xs text-slate-600">
          Status:{" "}
          <span className="font-mono font-medium text-slate-800">
            {response.successStatus ?? "unknown"}
          </span>
        </p>
        <div className="mt-2">
          <FieldList fields={response.fields} />
        </div>
      </Block>

      <Block title="Error codes">
        {errors.length === 0 ? (
          <p className="text-xs text-slate-400">—</p>
        ) : (
          <ul className="space-y-1.5">
            {errors.map((e, i) => (
              <li key={i} className="text-xs">
                <span className="font-mono font-medium text-rose-600">
                  {e.statusCode ?? "?"}
                </span>{" "}
                <span className="text-slate-700">{e.errorName}</span>
                {e.cause && (
                  <span className="block text-slate-500">{e.cause}</span>
                )}
                {e.howToFix && (
                  <span className="block text-[11px] text-slate-400">
                    fix: {e.howToFix}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title="Operational notes">
        {ops.length === 0 ? (
          <p className="text-xs text-slate-400">—</p>
        ) : (
          <dl className="divide-y divide-slate-100">
            {ops.map(([k, v]) => (
              <Row key={k} label={k}>
                {v}
              </Row>
            ))}
          </dl>
        )}
      </Block>
    </div>
  );
}
