const API = import.meta.env.VITE_API_URL || "";

let token: string | null = localStorage.getItem("auth_token");

export function getToken() {
  return token;
}

export function setToken(t: string | null) {
  token = t;
  if (t) localStorage.setItem("auth_token", t);
  else localStorage.removeItem("auth_token");
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string>) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (init?.body && typeof init.body === "string") headers["Content-Type"] = "application/json";

  const res = await fetch(`${API}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// --- Auth ---

export interface AuthUser {
  id: string;
  email: string | null;
  display_name: string | null;
  picture_url: string | null;
  tenant_id: string;
}

/** URL the browser navigates to in order to start a WorkOS AuthKit sign-in. */
export function workosLoginUrl(): string {
  return `${API}/api/auth/workos/start`;
}

export function getMe() {
  return request<{ user: AuthUser | null }>("/api/auth/me");
}

export async function logout() {
  try {
    await request<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
  } finally {
    setToken(null);
  }
}

// --- Trademarks ---

export interface BaselineConfig {
  identity_match?: { min_score?: number; min_confidence?: "LOW" | "MEDIUM" | "HIGH" };
  style_fidelity?: { min_similarity?: number; warn_below?: number };
  canonical_proximity?: { k?: number; min_proximity?: number; calibration_percentile?: string };
}

export interface Trademark {
  id: string;
  name: string;
  description: string | null;
  image_count: number;
  indexed_count: number;
  centroid_dino: number[] | null;
  centroid_clip: number[] | null;
  guidelines: string | null;
  baseline_config: BaselineConfig | null;
  created_at: string;
}

export interface TrademarkImage {
  id: string;
  trademark_id: string;
  storage_path: string;
  url: string;
  status: string;
  created_at: string;
}

export function listTrademarks() {
  return request<{ trademarks: Trademark[] }>("/api/trademarks");
}

export function listPublicTrademarks() {
  return request<{ trademarks: Trademark[] }>("/api/trademarks/public");
}

export function createTrademark(
  name: string,
  description?: string,
  guidelines?: string,
) {
  return request<{ trademark: Trademark }>("/api/trademarks", {
    method: "POST",
    body: JSON.stringify({ name, description, guidelines }),
  });
}

export function getTrademark(id: string) {
  return request<{ trademark: Trademark; images: TrademarkImage[] }>(`/api/trademarks/${id}`);
}

export function deleteTrademark(id: string) {
  return request<{ ok: boolean }>(`/api/trademarks/${id}`, { method: "DELETE" });
}

export function updateTrademark(
  id: string,
  patch: {
    name?: string;
    description?: string;
    guidelines?: string | null;
    baseline_config?: BaselineConfig | null;
  }
) {
  return request<{ trademark: Trademark }>(`/api/trademarks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function uploadTrademarkImages(trademarkId: string, files: File[]) {
  const form = new FormData();
  for (const f of files) form.append("images", f);

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}/api/trademarks/${trademarkId}/images`, {
    method: "POST",
    headers,
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json() as Promise<{ job_id: string; images_uploaded: number }>;
}

export function deleteTrademarkImage(trademarkId: string, imageId: string) {
  return request<{ ok: boolean }>(`/api/trademarks/${trademarkId}/images/${imageId}`, { method: "DELETE" });
}

// --- Detection ---

export interface Detection {
  ip: string;
  score: number;
  semantic_score: number;
  structural_score: number;
  bbox: [number, number, number, number]; // x, y, w, h
  confidence: string;
  method?: "visual" | "text" | "template" | "sift";
  text_found?: string;
}

export interface Job {
  id: string;
  type: string;
  status: string;
  payload: Record<string, unknown>;
  result: { detections?: Detection[] } | null;
  error: string | null;
}

export async function submitDetection(file: File, trademarkId?: string) {
  const form = new FormData();
  form.append("image", file);
  if (trademarkId) form.append("trademark_id", trademarkId);

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}/api/detect`, {
    method: "POST",
    headers,
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json() as Promise<{ job_id: string; status: string }>;
}

export function getJob(id: string) {
  return request<Job>(`/api/jobs/${id}`);
}

// --- Rule graphs ---

export type PrimitiveName =
  | "identity_match"
  | "style_fidelity"
  | "palette"
  | "ocr_contains"
  | "manual_check"
  | "canonical_proximity"
  | "vlm_check";

export type RuleSeverity = "fail" | "fail_hard" | "note";

export interface Rule {
  id?: string;
  name: string;
  description?: string;
  primitive: PrimitiveName;
  config: Record<string, unknown>;
  on_fail: RuleSeverity;
}

export interface RuleGraphContent {
  schema_version: 1;
  rules: Rule[];
}

export interface RuleGraphResponse {
  trademark_id: string;
  version: string;
  content: RuleGraphContent;
  created_at: string;
}

export function getRuleGraph(trademarkId: string) {
  return request<{ rule_graph: RuleGraphResponse | null }>(`/api/rule-graphs/${trademarkId}`);
}

export function putRuleGraph(trademarkId: string, content: RuleGraphContent, version?: string) {
  return request<{ rule_graph: RuleGraphResponse }>(`/api/rule-graphs/${trademarkId}`, {
    method: "PUT",
    body: JSON.stringify({ content, version }),
  });
}

// --- Submissions (licensee pre-flight checks) ---

export type Verdict = "pass" | "pass_w_note" | "fail" | "fail_hard";

/**
 * One reference image surfaced by canonical_proximity's evidence so the report
 * card can show "closest references" thumbnails. The API decorates each entry
 * with a presigned `image_url` before returning the submission payload.
 */
export interface CanonicalRefMatch {
  similarity: number;
  image_id: string | null;
  storage_path: string | null;
  image_url?: string;
}

export interface RuleResult {
  rule_id: string;
  rule_name: string;
  primitive: PrimitiveName;
  state: "pass" | "fail" | "uncertain";
  observed: Record<string, unknown>;
  evidence?: Record<string, unknown>;
  on_fail: RuleSeverity;
}

export interface PrimitiveResultsBlob {
  rule_results: RuleResult[];
  verdict: Verdict;
}

export interface Submission {
  id: string;
  verdict: Verdict | null;
  review_requested: boolean;
  created_at: string;
  evaluated_at: string | null;
  submitter_email: string | null;
  submitter_note: string | null;
  image_url: string;
  primitive_results: PrimitiveResultsBlob | null;
}

export interface SubmissionResponse {
  submission: Submission;
  trademark: { id: string; name: string } | null;
  job: { id: string; status: string; error: string | null } | null;
}

export async function createSubmission(
  trademarkId: string,
  file: File,
  submitterEmail?: string,
  submitterNote?: string
) {
  const form = new FormData();
  form.append("image", file);
  form.append("trademark_id", trademarkId);
  if (submitterEmail) form.append("submitter_email", submitterEmail);
  if (submitterNote) form.append("submitter_note", submitterNote);

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}/api/submissions`, {
    method: "POST",
    headers,
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json() as Promise<{ submission_id: string; job_id: string; status: string }>;
}

export function getSubmission(id: string) {
  return request<SubmissionResponse>(`/api/submissions/${id}`);
}

export function requestSubmissionReview(id: string) {
  return request<{ ok: boolean }>(`/api/submissions/${id}/request-review`, {
    method: "POST",
  });
}

// --- Review queue ---

export interface ReviewQueueItem {
  id: string;
  trademark: { id: string; name: string } | null;
  verdict: Verdict | null;
  submitter_email: string | null;
  submitter_note: string | null;
  created_at: string;
  evaluated_at: string | null;
  image_url: string;
  primitive_results: PrimitiveResultsBlob | null;
}

export function listReviewQueue() {
  return request<{ submissions: ReviewQueueItem[] }>(`/api/reviews/queue`);
}

export type ReviewAction = "override_to_pass" | "uphold_fail" | "note";

// --- Cases (persistent scan-pipeline output) ---

export type CaseReviewStatus = "pending" | "confirmed" | "dismissed";
export type CasePipelineStage =
  | "detect"
  | "identity"
  | "style"
  | "canonical"
  | "vlm"
  | "complete";

export interface Case {
  id: string;
  tenant_id: string;
  account_id: string;
  trademark_id: string;
  job_id: string | null;
  storage_path: string;
  source_url: string | null;
  score: number;
  pipeline_stage: CasePipelineStage;
  primitive_results: PrimitiveResultsBlob | null;
  review_status: CaseReviewStatus;
  created_at: string;
  updated_at: string;
  // Annotated by /api/cases routes:
  image_url?: string;
  trademark?: { id: string; name: string } | null;
}

export interface CaseComment {
  id: string;
  case_id: string;
  body: string;
  created_at: string;
  author: {
    id: string;
    display_name: string | null;
    picture_url: string | null;
  };
}

export interface CaseDetailResponse {
  case: Case;
  trademark: { id: string; name: string; description: string | null } | null;
  reference_images: Array<{ id: string; image_url: string }>;
  comments: CaseComment[];
}

export interface ListCasesFilter {
  source_url?: string;
  trademark_id?: string;
  status?: CaseReviewStatus;
  job_id?: string;
  limit?: number;
}

export function listCases(filter: ListCasesFilter = {}) {
  const params = new URLSearchParams();
  if (filter.source_url) params.set("source_url", filter.source_url);
  if (filter.trademark_id) params.set("trademark_id", filter.trademark_id);
  if (filter.status) params.set("status", filter.status);
  if (filter.job_id) params.set("job_id", filter.job_id);
  if (filter.limit !== undefined) params.set("limit", String(filter.limit));
  const qs = params.toString();
  return request<{ cases: Case[] }>(`/api/cases${qs ? `?${qs}` : ""}`);
}

export function getCase(id: string) {
  return request<CaseDetailResponse>(`/api/cases/${id}`);
}

export function updateCase(
  id: string,
  patch: { review_status: CaseReviewStatus }
) {
  return request<{ case: Case }>(`/api/cases/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteCase(id: string) {
  return request<{ ok: boolean }>(`/api/cases/${id}`, { method: "DELETE" });
}

// --- Case comments ---

export function listCaseComments(caseId: string) {
  return request<{ comments: CaseComment[] }>(`/api/cases/${caseId}/comments`);
}

export function postCaseComment(caseId: string, body: string) {
  return request<{ comment: CaseComment }>(`/api/cases/${caseId}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export function deleteCaseComment(caseId: string, commentId: string) {
  return request<{ ok: boolean }>(`/api/cases/${caseId}/comments/${commentId}`, {
    method: "DELETE",
  });
}

/**
 * Kick off a scan job. Two mutually-exclusive image sources (file XOR URL) and
 * two scope modes (own = tenant's IPs, all = every public IP, top match only).
 */
export async function submitScan(opts: {
  file?: File;
  imageUrl?: string;
  mode?: "own" | "all";
}) {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  if (opts.file) {
    const form = new FormData();
    form.append("image", opts.file);
    if (opts.mode) form.append("mode", opts.mode);
    const res = await fetch(`${API}/api/detect`, { method: "POST", headers, body: form });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    return res.json() as Promise<{ job_id: string; status: string }>;
  }

  return request<{ job_id: string; status: string }>(`/api/detect`, {
    method: "POST",
    body: JSON.stringify({ image_url: opts.imageUrl, mode: opts.mode ?? "own" }),
  });
}

export function postReview(submissionId: string, action: ReviewAction, note?: string) {
  return request<{ review: { id: string } }>(`/api/reviews/${submissionId}`, {
    method: "POST",
    body: JSON.stringify({ action, note }),
  });
}
