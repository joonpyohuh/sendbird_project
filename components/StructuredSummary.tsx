"use client";

import type { ApiDocProject, FieldItem } from "@/lib/types";
import { MethodBadge, Pill } from "./Badges";
import { getAuthLabel, getReaderLabel } from "@/lib/i18n/helpers";
import { useAppPreferences } from "@/components/shell/AppPreferencesProvider";
import EmptyState from "./EmptyState";

function FieldList({ fields }: { fields: FieldItem[] }) {
  const { t } = useAppPreferences();

  if (fields.length === 0) {
    return <p className="text-xs text-slate-400">—</p>;
  }
  return (
    <ul className="space-y-1.5">
      {fields.map((f, i) => (
        <li key={`${f.name}-${i}`} className="text-xs text-slate-600">
          <span className="font-mono font-medium text-slate-800">
            {f.name || t("summary.unnamed")}
          </span>
          {f.type && <span className="text-slate-400"> : {f.type}</span>}
          {f.required ? (
            <span className="ml-1 text-rose-500">*{t("summary.required")}</span>
          ) : f.required === false ? (
            <span className="ml-1 text-slate-400">{t("summary.optional")}</span>
          ) : null}
          {f.description && (
            <span className="block text-slate-500">{f.description}</span>
          )}
          {f.constraints && (
            <span className="block text-[11px] text-slate-400">
              {t("summary.constraints")}: {f.constraints}
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
  const { t } = useAppPreferences();

  if (!project) {
    return (
      <EmptyState
        title={t("summary.emptyTitle")}
        description={t("summary.emptyDesc")}
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

  const ops = [
    { label: t("summary.rateLimit"), value: operationalNotes.rateLimit },
    { label: t("summary.pagination"), value: operationalNotes.pagination },
    { label: t("summary.webhook"), value: operationalNotes.webhook },
    { label: t("summary.retryBehavior"), value: operationalNotes.retryBehavior },
    { label: t("summary.idempotency"), value: operationalNotes.idempotency },
  ].filter((item) => item.value && item.value.trim());

  return (
    <div className="space-y-3">
      <Block title={t("summary.endpoint")}>
        <h3 className="text-sm font-semibold text-slate-900">
          {project.title || t("summary.untitled")}
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
          <Row label={t("summary.targetReader")}>
            <Pill>{getReaderLabel(t, project.targetReader)}</Pill>
          </Row>
          <Row label={t("summary.authType")}>
            <Pill>{getAuthLabel(t, auth.type)}</Pill>
          </Row>
          {project.productArea && (
            <Row label={t("summary.productArea")}>{project.productArea}</Row>
          )}
          {project.useCase && (
            <Row label={t("summary.useCase")}>{project.useCase}</Row>
          )}
        </dl>
      </Block>

      <div className="grid gap-3 sm:grid-cols-2">
        <Block title={t("summary.requiredFields")}>
          <FieldList fields={requiredFields} />
        </Block>
        <Block title={t("summary.optionalFields")}>
          <FieldList fields={optionalFields} />
        </Block>
      </div>

      <Block title={t("summary.successResponse")}>
        <p className="text-xs text-slate-600">
          {t("summary.status")}:{" "}
          <span className="font-mono font-medium text-slate-800">
            {response.successStatus ?? "unknown"}
          </span>
        </p>
        <div className="mt-2">
          <FieldList fields={response.fields} />
        </div>
      </Block>

      <Block title={t("summary.errorCodes")}>
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
                    {t("summary.fix")}: {e.howToFix}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title={t("summary.operationalNotes")}>
        {ops.length === 0 ? (
          <p className="text-xs text-slate-400">—</p>
        ) : (
          <dl className="divide-y divide-slate-100">
            {ops.map(({ label, value }) => (
              <Row key={label} label={label}>
                {value}
              </Row>
            ))}
          </dl>
        )}
      </Block>
    </div>
  );
}
