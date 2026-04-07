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
}

export function getRegisterOptions() {
  return request<any>("/api/auth/register/options", { method: "POST" });
}

export function verifyRegistration(response: any, challenge: string) {
  return request<{ token: string; user: AuthUser }>("/api/auth/register/verify", {
    method: "POST",
    body: JSON.stringify({ response, challenge }),
  });
}

export function getLoginOptions() {
  return request<any>("/api/auth/login/options", { method: "POST" });
}

export function verifyLogin(response: any, challenge: string) {
  return request<{ token: string; user: AuthUser }>("/api/auth/login/verify", {
    method: "POST",
    body: JSON.stringify({ response, challenge }),
  });
}

export function getMe() {
  return request<{ user: AuthUser | null }>("/api/auth/me");
}

// --- Trademarks ---

export type IpType = "character" | "mark";

export interface Trademark {
  id: string;
  name: string;
  description: string | null;
  ip_type: IpType;
  image_count: number;
  indexed_count: number;
  centroid_dino: number[] | null;
  centroid_clip: number[] | null;
  created_at: string;
}

export interface TrademarkImage {
  id: string;
  trademark_id: string;
  storage_path: string;
  url: string;
  status: string;
  pose_label: string | null;
  created_at: string;
}

export function listTrademarks() {
  return request<{ trademarks: Trademark[] }>("/api/trademarks");
}

export function listPublicTrademarks() {
  return request<{ trademarks: Trademark[] }>("/api/trademarks/public");
}

export function createTrademark(name: string, description?: string, ipType: IpType = "mark") {
  return request<{ trademark: Trademark }>("/api/trademarks", {
    method: "POST",
    body: JSON.stringify({ name, description, ip_type: ipType }),
  });
}

export function setImagePoseLabel(trademarkId: string, imageId: string, poseLabel: string | null) {
  return request<{ ok: boolean; pose_label: string | null }>(
    `/api/trademarks/${trademarkId}/images/${imageId}/pose`,
    {
      method: "PUT",
      body: JSON.stringify({ pose_label: poseLabel }),
    }
  );
}

export function getTrademark(id: string) {
  return request<{ trademark: Trademark; images: TrademarkImage[] }>(`/api/trademarks/${id}`);
}

export function deleteTrademark(id: string) {
  return request<{ ok: boolean }>(`/api/trademarks/${id}`, { method: "DELETE" });
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
  | "pose_class"
  | "manual_check";

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
  ip_type: IpType;
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
  trademark: { id: string; name: string; ip_type: IpType } | null;
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
  trademark: { id: string; name: string; ip_type: IpType } | null;
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

export function postReview(submissionId: string, action: ReviewAction, note?: string) {
  return request<{ review: { id: string } }>(`/api/reviews/${submissionId}`, {
    method: "POST",
    body: JSON.stringify({ action, note }),
  });
}
