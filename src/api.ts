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
  role?: "user" | "admin";
}

/** URL the browser navigates to in order to start a WorkOS AuthKit sign-in.
 *  Optional `returnTo` is a same-origin path the backend will echo back to
 *  the SPA as `?next=…` after the OAuth round-trip succeeds. */
export function workosLoginUrl(returnTo?: string): string {
  if (!returnTo) return `${API}/api/auth/workos/start`;
  return `${API}/api/auth/workos/start?return_to=${encodeURIComponent(returnTo)}`;
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
  /** Monitoring keywords proposed by the wizard's VLM step + user edits. */
  keywords: string[];
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
  return request<{ trademarks: Trademark[] }>("/api/ip");
}

export function listPublicTrademarks() {
  return request<{ trademarks: Trademark[] }>("/api/ip/public");
}

// --- Catalog browse (paginated + searchable) ---

export interface TrademarkCatalogItem {
  id: string;
  application_number: string;
  source: string;
  verbal_element: string | null;
  mark_kind: string | null;
  status: string | null;
  application_date: string | null;
  registration_date: string | null;
  nice_classes: number[];
  image_count: number;
  detail_url: string | null;
  image_url: string | null;
}

export interface DesignCatalogItem {
  id: string;
  registration_id: string;
  base_id: string;
  design_office: string | null;
  product_class: string | null;
  status: string | null;
  wipo_link: string | null;
  image_count: number;
  image_url: string | null;
}

export interface CatalogPage<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export function browseTrademarkCatalog(opts: { q?: string; limit?: number; offset?: number } = {}) {
  const p = new URLSearchParams();
  if (opts.q) p.set("q", opts.q);
  if (opts.limit !== undefined) p.set("limit", String(opts.limit));
  if (opts.offset !== undefined) p.set("offset", String(opts.offset));
  const qs = p.toString();
  return request<CatalogPage<TrademarkCatalogItem>>(`/api/ip/catalog/browse${qs ? `?${qs}` : ""}`);
}

export function browseDesignCatalog(opts: { q?: string; limit?: number; offset?: number } = {}) {
  const p = new URLSearchParams();
  if (opts.q) p.set("q", opts.q);
  if (opts.limit !== undefined) p.set("limit", String(opts.limit));
  if (opts.offset !== undefined) p.set("offset", String(opts.offset));
  const qs = p.toString();
  return request<CatalogPage<DesignCatalogItem>>(`/api/design-match/catalog/browse${qs ? `?${qs}` : ""}`);
}

/**
 * Step 1 of the IP-creation wizard. Just the name — description, keywords,
 * and guidelines are added through subsequent wizard steps via updateTrademark.
 */
export function createTrademark(name: string) {
  return request<{ trademark: Trademark }>("/api/ip", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function getTrademark(id: string) {
  return request<{ trademark: Trademark; images: TrademarkImage[] }>(`/api/ip/${id}`);
}

export function deleteTrademark(id: string) {
  return request<{ ok: boolean }>(`/api/ip/${id}`, { method: "DELETE" });
}

export function updateTrademark(
  id: string,
  patch: {
    name?: string;
    description?: string;
    guidelines?: string | null;
    baseline_config?: BaselineConfig | null;
    keywords?: string[];
  }
) {
  return request<{ trademark: Trademark }>(`/api/ip/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function uploadTrademarkImages(trademarkId: string, files: File[]) {
  const form = new FormData();
  for (const f of files) form.append("images", f);

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}/api/ip/${trademarkId}/images`, {
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
  return request<{ ok: boolean }>(`/api/ip/${trademarkId}/images/${imageId}`, { method: "DELETE" });
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
  | "vlm_check"
  | "vlm_infringement_check";

export type RuleSeverity = "fail" | "fail_hard" | "note";

export interface Rule {
  id?: string;
  name: string;
  description?: string;
  primitive: PrimitiveName;
  config: Record<string, unknown>;
  on_fail: RuleSeverity;
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

export interface MonitorEvidence {
  result_id: string;
  run_id: string;
  page_url: string;
  image_url: string | null;
  domain: string;
  keyword: string | null;
  similarity_score: number;
  inliers: number | null;
  vlm_verdict: string | null;
  vlm_confidence: number | null;
  vlm_reasoning: string | null;
  match_bucket: string;
  matched_ref_storage_path: string | null;
  matched_ref_image_url: string | null;
  run_created_at: string;
}

export type LicenseStatus = "likely_licensed" | "likely_unlicensed" | "unclear";
export type InfringementType =
  | "full_copy"
  | "derivative"
  | "different_class"
  | "unclear";
export type CreatorType = "individual" | "company" | "unknown";

export interface CaseEnrichment {
  case_id: string;
  seller_name: string | null;
  seller_profile_url: string | null;
  listing_title: string | null;
  price: string | null;
  location: string | null;
  description_summary: string | null;
  platform: string | null;
  notes: string | null;
  match_explanation: string | null;
  license_status: LicenseStatus | string | null;
  license_confidence: number | null;
  license_reasoning: string | null;
  infringement_type: InfringementType | string | null;
  infringement_reasoning: string | null;
  creator_type: CreatorType | string | null;
  error: string | null;
  enriched_at: string;
}

export interface CaseDetailResponse {
  case: Case;
  trademark: { id: string; name: string; description: string | null } | null;
  reference_images: Array<{ id: string; image_url: string }>;
  comments: CaseComment[];
  monitor_evidence?: MonitorEvidence | null;
  enrichment?: CaseEnrichment | null;
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

/** Cross-site match from monitor history — same image found on another
 *  monitored domain by an earlier monitor run. */
export interface CrossSiteInternalMatch {
  result_id: string;
  case_id: string | null;
  domain: string;
  page_url: string;
  image_url: string | null;
  similarity: number;
  seller_name: string | null;
  listing_title: string | null;
  review_status: string | null;
  created_at: string;
}

/** Cross-site match from the open web — found by Brave title search after
 *  enrichment, then SigLIP-similarity-scored against the case's image. */
export interface CrossSiteExternalMatch {
  id: string;
  case_id: string;
  source: string;
  page_url: string;
  image_url: string | null;
  title: string | null;
  similarity_score: number;
  created_at: string;
}

export function listCrossSiteMatches(
  caseId: string,
  opts: { threshold?: number; limit?: number } = {},
) {
  const params = new URLSearchParams();
  if (opts.threshold !== undefined) params.set("threshold", String(opts.threshold));
  if (opts.limit !== undefined) params.set("limit", String(opts.limit));
  const qs = params.toString();
  return request<{
    internal: CrossSiteInternalMatch[];
    external: CrossSiteExternalMatch[];
  }>(`/api/cases/${caseId}/cross-site${qs ? `?${qs}` : ""}`);
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

// --- Clearance (pre-publication IP screening) ---

export type ClearanceRegion =
  | "top-left" | "top-center" | "top-right"
  | "middle-left" | "center" | "middle-right"
  | "bottom-left" | "bottom-center" | "bottom-right"
  | "full-image";

export type ClearanceEvidence = "embedding" | "vlm";

export interface ClearanceMatch {
  ip_name: string;
  trademark_id: string;
  score: number;
  semantic_score: number;
  structural_score: number;
  confidence: string;
  bbox: [number, number, number, number];
  region?: ClearanceRegion;          // coarse spatial cue from the VLM (3×3 grid)
  justification?: string;             // VLM's one-line rationale
  method: "visual" | "text" | "concept";
  closest_ref_url: string;
  reference_images: Array<{ id: string; image_url: string }>;
  in_catalog?: boolean;
  // Hybrid-mode signal: which pipelines found this match. ["embedding","vlm"]
  // means both agreed; missing/empty means single-pipeline mode (legacy).
  evidence?: ClearanceEvidence[];
}

export interface ClearanceResult {
  status: "pending" | "complete" | "failed";
  error?: string;
  query_image_url?: string;
  image_width?: number;
  image_height?: number;
  matches?: ClearanceMatch[];
}

/** Detector mode override. Omit to take the server's default (hybrid in prod).
 * "v2" disables the VLM stage — the "Max mode" toggle off-state. */
export type ClearanceMode = "hybrid" | "v2";

export async function submitClearance(file: File, opts?: { mode?: ClearanceMode }) {
  const form = new FormData();
  form.append("image", file);
  if (opts?.mode) form.append("mode", opts.mode);

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}/api/clearance`, { method: "POST", headers, body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json() as Promise<{ job_id: string }>;
}

export function getClearanceResult(jobId: string) {
  return request<ClearanceResult>(`/api/clearance/${jobId}`);
}

// --- Visual Match (visual similarity vs designs + pop-culture + EUIPO trademarks) ---

export type GiantbombEntityType =
  | "character" | "concept" | "person" | "location" | "thing" | "franchise" | "game";

export interface VisualMatchRightHolder {
  role?: string;             // 'applicant' | 'holder' | 'developer' | 'publisher' | 'studio' | …
  name?: string;
  identifier?: string;       // e.g. EUIPO applicant id
  office?: string;           // EUIPO office code
}

interface VisualMatchCommon {
  id: string;
  preview_url: string;            // signed URL to the catalog entry's R2 image
  score: number;                  // displayed confidence; VLM-blended cosine 0..1
  cosine_score?: number;          // raw retrieval signal
  whole_cos?: number;             // whole-image cosine (informational)
  inliers?: number;               // DALF RANSAC inliers — ≥2 = structurally verified
  bbox?: [number, number, number, number];   // best-tile region (x, y, w, h)
  vlm_verdict?: "present" | "absent" | "unclear";
  vlm_confidence?: number;
  vlm_reasoning?: string;
  // Which signal paths contributed to this match. Values:
  //   'embedding'  — visual cosine hit
  //   'ocr-text'   — easyocr read literal text in the query image
  //   'vlm-detect' — VLM identified the IP from visual content (no text)
  evidence?: string[];
  // Literal text that easyocr read from the query image (when 'ocr-text'
  // fired).
  ocr_text?: string;
  // IP name the VLM identified in the query image (when 'vlm-detect'
  // fired). Distinct from ocr_text because no text is actually visible.
  detected_name?: string;
  // Feedback kNN nudges (informational badge in the Details panel).
  feedback_boost?: number;
  feedback_demote?: number;
  // Right-holders enrichment from ip-diver (server-side via
  // scripts/enrich_right_holders.py). `right_holder` is the display
  // string (first holder's name); `right_holders` is the full structured
  // list. Both undefined when the row hasn't been enriched.
  right_holder?: string | null;
  right_holders?: VisualMatchRightHolder[];
}

export interface VisualDesignMatch extends VisualMatchCommon {
  source: "design";
  registration_id: string;        // e.g. "015093157-0009"
  base_id?: string;               // e.g. "015093157" — used to group sibling design views
  product_class: string | null;   // e.g. "Logos", "Graphic symbols"
  status: string | null;
  design_office: string | null;
  wipo_link: string | null;
}

export interface VisualPopMatch extends VisualMatchCommon {
  source: "pop";
  giantbomb_id: string;
  source_id: string;
  entity_type: GiantbombEntityType | string;
  name: string;
  aliases: string[];
  summary: string | null;
  source_url: string | null;
}

// EUIPO bulk trademark, surfaced via the unified visual-match endpoint
// alongside designs + pop-culture entities. Same DINOv3 embedding space
// so it falls out of the same shortlist with no extra retrieval pass.
export interface VisualTrademarkMatch extends VisualMatchCommon {
  source: "trademark";
  application_number: string;
  verbal_element: string | null;
  mark_kind: string | null;
  mark_feature?: string | null;
  nice_classes?: number[];
  detail_url: string | null;
}

export type VisualMatch = VisualDesignMatch | VisualPopMatch | VisualTrademarkMatch;

export interface VisualMatchResult {
  status: "pending" | "complete" | "failed";
  error?: string;
  query_image_url?: string;
  image_width?: number;
  image_height?: number;
  matches?: VisualMatch[];
  weak_matches?: VisualMatch[];
}

export async function submitVisualMatch(file: File) {
  const form = new FormData();
  form.append("image", file);

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}/api/visual-match`, { method: "POST", headers, body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json() as Promise<{ job_id: string }>;
}

export function getVisualMatchResult(jobId: string) {
  return request<VisualMatchResult>(`/api/visual-match/${jobId}`);
}

// --- Visual Match supervised feedback ---

export type VisualMatchVerdict = "confirmed" | "rejected";

export interface VisualMatchFeedbackEntry {
  match_id: string;
  verdict: VisualMatchVerdict;
  created_at: string;
}

export function submitVisualMatchFeedback(
  jobId: string,
  matchId: string,
  verdict: VisualMatchVerdict,
) {
  return request<{
    feedback_id: string;
    verdict: VisualMatchVerdict;
    total_confirmed: number;
    total_rejected: number;
  }>(`/api/visual-match/${jobId}/feedback`, {
    method: "POST",
    body: JSON.stringify({ match_id: matchId, verdict }),
  });
}

export function getVisualMatchFeedback(jobId: string) {
  return request<{ feedback: VisualMatchFeedbackEntry[] }>(
    `/api/visual-match/${jobId}/feedback`,
  );
}

// --- Giantbomb catalog browse (standalone Pop-Culture catalog page) ---
//
// The visual-similarity match flow lives on /api/visual-match; the
// catalog-browse + categories endpoints stay on /api/giantbomb-match
// because they're pop-culture-specific.

/** Indexed entity types + counts. UI uses this to drive chip availability. */
export interface GiantbombCategory {
  entity_type: string;
  count: number;
}
export function getGiantbombCategories() {
  return request<{ categories: GiantbombCategory[] }>("/api/giantbomb-match/categories");
}

export interface GiantbombCatalogItem {
  id: string;
  giantbomb_id: string;
  source_id: string;
  entity_type: string;
  name: string;
  aliases: string[];
  summary: string | null;
  source_url: string | null;
  image_count: number;
  image_url: string | null;
}
export function browseGiantbombCatalog(opts: {
  q?: string;
  entityType?: string;
  limit: number;
  offset: number;
}) {
  const qs = new URLSearchParams();
  if (opts.q) qs.set("q", opts.q);
  if (opts.entityType) qs.set("entity_type", opts.entityType);
  qs.set("limit", String(opts.limit));
  qs.set("offset", String(opts.offset));
  return request<{
    items: GiantbombCatalogItem[];
    total: number;
    limit: number;
    offset: number;
    entity_type: string | null;
    q: string;
  }>(`/api/giantbomb-match/catalog/browse?${qs.toString()}`);
}

// --- Admin (unified cross-source IP catalog management) ---

export interface AdminIpSummary {
  id: string;
  source: string;
  name: string | null;
  entity_type: string | null;
  image_count: number;
  indexed_count: number;
  centroid_ready: boolean;
  has_caption: boolean;
  updated_at: string;
}

export interface AdminIpImage {
  key: string;
  url: string;
  image_id: string | null;
  status: string;
  indexed: boolean;
}

export interface AdminIpDetail {
  id: string;
  source: string;
  name: string | null;
  description: string | null;
  guidelines: string | null;
  entity_type: string | null;
  aliases: string[];
  caption_text: string | null;
  caption_model: string | null;
  centroid_ready: boolean;
  tenant_id: string | null;
  images: AdminIpImage[];
  created_at: string;
  updated_at: string;
}

/** Catalog sources the admin can filter by. */
export const ADMIN_SOURCES = [
  "tenant_trademark",
  "euipo_trademark",
  "wipo_design",
  "giantbomb",
  "anilist",
] as const;
export type AdminSource = (typeof ADMIN_SOURCES)[number];

export function searchAdminIps(opts: {
  source?: string;
  q?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const qs = new URLSearchParams();
  if (opts.source) qs.set("source", opts.source);
  if (opts.q) qs.set("q", opts.q);
  if (opts.limit != null) qs.set("limit", String(opts.limit));
  if (opts.offset != null) qs.set("offset", String(opts.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request<{ ips: AdminIpSummary[]; total: number; limit: number; offset: number }>(
    `/api/admin/ips${suffix}`
  );
}

export function getAdminIp(id: string) {
  return request<AdminIpDetail>(`/api/admin/ips/${encodeURIComponent(id)}`);
}

export function patchAdminIp(
  id: string,
  patch: { description?: string | null; guidelines?: string | null; caption_text?: string | null }
) {
  return request<{ id: string; caption_reembed_job_id: string | null }>(
    `/api/admin/ips/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(patch) }
  );
}

export function deleteAdminIp(id: string) {
  return request<{ ok: boolean; deleted_uploads: number }>(
    `/api/admin/ips/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
}

export async function uploadAdminImages(id: string, files: File[]) {
  const form = new FormData();
  for (const f of files) form.append("images", f);

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}/api/admin/ips/${encodeURIComponent(id)}/images`, {
    method: "POST",
    headers,
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json() as Promise<{ uploaded: number; job_id: string }>;
}

export function deleteAdminImage(id: string, imageId: string) {
  return request<{ ok: boolean }>(
    `/api/admin/ips/${encodeURIComponent(id)}/images/${encodeURIComponent(imageId)}`,
    { method: "DELETE" }
  );
}

// --- Brand monitoring (scrape target sites for IP infringements) ---

export type MonitoringFrequency = "daily" | "weekly";

export interface MonitoredDomain {
  id: string;
  tenant_id: string;
  domain: string;
  /** Linked IP — keywords for the scrape come from the IP, not this row. */
  ip_catalog_id: string | null;
  /** Convenience fields surfaced by GET /api/monitoring/domains (JOINed). */
  ip_name: string | null;
  ip_keywords: string[] | null;
  recipe: Record<string, unknown> | null;
  recipe_updated_at: string | null;
  last_run_at: string | null;
  enabled: boolean;
  zero_yield_streak: number;
  created_at: string;
}

export interface ReverseSearchRun {
  id: string;
  tenant_id: string;
  trademark_id: string | null;
  domain_id: string | null;
  keyword: string | null;
  job_id: string | null;
  status: string;
  images_searched: number;
  results_found: number;
  results_after_filter: number;
  cases_created: number;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface MonitoringSettings {
  monitoring_enabled: boolean;
  monitoring_frequency: MonitoringFrequency | string;
}

export function listMonitoredDomains() {
  return request<{ domains: MonitoredDomain[] }>("/api/monitoring/domains");
}

export function createMonitoredDomain(domain: string, ip_catalog_id: string) {
  return request<{ domain: MonitoredDomain }>("/api/monitoring/domains", {
    method: "POST",
    body: JSON.stringify({ domain, ip_catalog_id }),
  });
}

export function updateMonitoredDomain(
  id: string,
  patch: {
    ip_catalog_id?: string;
    enabled?: boolean;
    recipe?: Record<string, unknown> | null;
  },
) {
  return request<{ domain: MonitoredDomain | null }>(`/api/monitoring/domains/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteMonitoredDomain(id: string) {
  return request<{ ok: boolean }>(`/api/monitoring/domains/${id}`, {
    method: "DELETE",
  });
}

export function listMonitoringRuns(opts: { domain_id?: string; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (opts.domain_id) params.set("domain_id", opts.domain_id);
  if (opts.limit !== undefined) params.set("limit", String(opts.limit));
  const qs = params.toString();
  return request<{ runs: ReverseSearchRun[] }>(
    `/api/monitoring/runs${qs ? `?${qs}` : ""}`,
  );
}

export function triggerMonitoringRun(domainId: string, keyword?: string) {
  return request<{ jobs: Array<{ id: string; type: string; status: string }> }>(
    "/api/monitoring/runs",
    {
      method: "POST",
      body: JSON.stringify({ domain_id: domainId, keyword }),
    },
  );
}

export function getMonitoringSettings() {
  return request<{ settings: MonitoringSettings | null }>("/api/monitoring/settings");
}

export function updateMonitoringSettings(patch: {
  enabled?: boolean;
  frequency?: MonitoringFrequency;
}) {
  return request<{ settings: MonitoringSettings | null }>("/api/monitoring/settings", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export interface MonitoringPreset {
  key: string;
  label: string;
  recipe: Record<string, unknown>;
}

export function listMonitoringPresets() {
  return request<{ presets: MonitoringPreset[] }>("/api/monitoring/presets");
}

// --- API keys ---

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export function listApiKeys() {
  return request<{ keys: ApiKey[] }>("/api/api-keys");
}

export function createApiKey(name: string) {
  return request<{ key: ApiKey; token: string }>("/api/api-keys", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function revokeApiKey(id: string) {
  return request<{ ok: boolean }>(`/api/api-keys/${id}`, {
    method: "DELETE",
  });
}

// --- IP Reviews (guided legal-grade workflow) ---

export type IpReviewMode = "clearance" | "monitoring";
export type IpReviewStatus = "processing" | "complete" | "failed";
export type IpReviewDecision = "cleared" | "not_cleared";

export type RightsType = "copyright" | "trademark" | "design" | "publicity";
export type RiskBand = "high" | "medium" | "low" | "clear";

export interface IpReviewSegment {
  risk_band: RiskBand;
  top_score: number;
  match_ids: string[];
}

export interface IpReviewMatch {
  id: string;
  ip_name: string;
  trademark_id: string | null;
  catalog_source: string;
  rights_types: RightsType[];
  scores: {
    visual_similarity: number;
    structural_inliers: number;
    ocr_match: number;
    calibrator_combined: number;
  };
  region: string | null;
  bbox: number[] | null;
  in_scope_territories: string[];
  category_overlap: boolean;
  evidence: string[];
  justification: string | null;
  closest_ref: string | null;
  reference_images: { id: string; image_url: string }[];
  // "lookalike" for entries in IpReviewResult.lookalikes — visually close but
  // a distinct IP per the VLM.
  relationship?: "lookalike";
}

export interface IpReviewResult {
  asset_image_path: string;
  image_width: number;
  image_height: number;
  segments: Record<RightsType, IpReviewSegment>;
  matches: IpReviewMatch[];
  // Visually-similar-but-distinct IPs (e.g. Wooloo for a Lamball query),
  // surfaced as a secondary band separate from the exact-IP `matches`.
  lookalikes?: IpReviewMatch[];
  verdict_lines: string[];
  scope_disclosure: string[];
  context_echo: Record<string, unknown>;
}

export interface IpReview {
  id: string;
  tenant_id: string;
  account_id: string;
  job_id: string | null;
  mode: IpReviewMode;
  title: string;
  status: IpReviewStatus;
  asset_image_path: string;
  asset_name: string | null;
  asset_type: string | null;
  intended_use: string | null;
  territories: string[];
  product_categories: string[];
  asset_placement: string | null;
  inspiration_board_paths: string[];
  notes: string | null;
  result: IpReviewResult | null;
  decision: IpReviewDecision | null;
  decision_rationale: string | null;
  decided_by_account_id: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
  // Monitoring-mode fields (NULL/empty for clearance mode):
  monitored_ip_catalog_id: string | null;
  approved_licensees: string[];
  monitored_platforms: string[];
  // Annotated on response:
  asset_image_url?: string;
  inspiration_image_urls?: string[];
  monitored_ip?: { id: string; name: string } | null;
  monitoring_run_in_progress?: boolean;
  findings?: IpReviewFinding[];
  match_decisions?: IpReviewMatchDecision[];
  // Inbox counts — populated by GET /api/ip-reviews list responses.
  // Clearance: flagged matches awaiting a locked decision.
  // Monitoring: undismissed, non-licensee findings.
  flagged_match_count?: number;
  open_findings_count?: number;
}

export type IpReviewMatchDecisionValue = "flag" | "dismiss";

export type AnnotationShape =
  | { kind: "pen"; points: [number, number][]; color: string; width: number }
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number; color: string; width: number }
  | { kind: "arrow"; x1: number; y1: number; x2: number; y2: number; color: string; width: number }
  | { kind: "text"; x: number; y: number; text: string; color: string; size: number };

export interface IpReviewMatchDecision {
  review_id: string;
  match_id: string;
  decision: IpReviewMatchDecisionValue;
  note: string | null;
  annotations: AnnotationShape[] | null;
  decided_by_account_id: string | null;
  decided_at: string;
}

/**
 * Inbox classification: does this review need lawyer attention?
 *
 * - `processing` / `failed` always need attention (regardless of mode).
 * - Clearance: needs attention until a `decision` is locked.
 * - Monitoring: needs attention while at least one open finding remains
 *   (open = not dismissed, not an approved-licensee hit). Worker-set
 *   `open_findings_count` comes from the list endpoint.
 *
 * Shared between Clearance.tsx (inbox sections) and Nav.tsx (top-bar
 * attention badge) — keep them in sync by exporting from one place.
 */
export function needsAttention(r: IpReview): boolean {
  if (r.status === "processing") return true;
  if (r.status === "failed") return true;
  if (r.mode === "clearance") return !r.decision;
  if (r.mode === "monitoring") return (r.open_findings_count ?? 0) > 0;
  return false;
}

export function setIpReviewMatchDecision(
  reviewId: string,
  matchId: string,
  patch: {
    decision: IpReviewMatchDecisionValue | null;
    note: string | null;
    annotations?: AnnotationShape[] | null;
  },
) {
  return request<{ decision: IpReviewMatchDecision | null }>(
    `/api/ip-reviews/${reviewId}/matches/${matchId}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  );
}

export interface IpReviewFinding {
  result_id: string;
  run_id: string;
  domain_id: string | null;
  domain: string;
  page_url: string;
  image_url: string | null;
  similarity_score: number | null;
  inliers: number | null;
  vlm_verdict: string | null;
  vlm_confidence: number | null;
  vlm_reasoning: string | null;
  status: string;
  case_id: string | null;
  enforcement_priority: number;
  found_at: string;
  dismissed_at: string | null;
  availability: string | null;
  dismissal_reason: string | null;
  last_checked_at: string | null;
  source_method: string | null;
  seller_name: string | null;
  seller_url: string | null;
  listing_title: string | null;
  price: string | null;
  location: string | null;
  description_summary: string | null;
  match_explanation: string | null;
  infringement_type: string | null;
  infringement_reasoning: string | null;
  license_status: string | null;
  screenshot_url: string | null;
  enrichment_error: string | null;
  // Present on tenant-wide findings (GET /api/monitoring/findings) so a
  // multi-IP board can key per-finding actions off the finding's own IP and
  // render an IP chip. Absent on per-IP findings (the IP is implied).
  ip_id?: string;
  ip_name?: string | null;
}

export interface IpReviewContext {
  title: string;
  mode?: IpReviewMode;
  asset_name?: string;
  asset_type?: string;
  intended_use?: string;
  territories?: string[];
  product_categories?: string[];
  asset_placement?: string;
  notes?: string;
}

export async function createIpReview(
  image: File,
  context: IpReviewContext,
  inspirationImages: File[] = []
) {
  const form = new FormData();
  form.append("image", image);
  form.append("title", context.title);
  if (context.mode) form.append("mode", context.mode);
  if (context.asset_name) form.append("asset_name", context.asset_name);
  if (context.asset_type) form.append("asset_type", context.asset_type);
  if (context.intended_use) form.append("intended_use", context.intended_use);
  if (context.asset_placement) form.append("asset_placement", context.asset_placement);
  if (context.notes) form.append("notes", context.notes);
  if (context.territories?.length) {
    form.append("territories", JSON.stringify(context.territories));
  }
  if (context.product_categories?.length) {
    form.append("product_categories", JSON.stringify(context.product_categories));
  }
  for (const f of inspirationImages) form.append("inspiration", f);

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}/api/ip-reviews`, { method: "POST", headers, body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json() as Promise<{ id: string }>;
}

export function listIpReviews(filter: { mode?: IpReviewMode; decision?: IpReviewDecision; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (filter.mode) params.set("mode", filter.mode);
  if (filter.decision) params.set("decision", filter.decision);
  if (filter.limit !== undefined) params.set("limit", String(filter.limit));
  const qs = params.toString();
  return request<{ reviews: IpReview[] }>(`/api/ip-reviews${qs ? `?${qs}` : ""}`);
}

export async function getIpReview(id: string) {
  const { review } = await request<{ review: IpReview }>(`/api/ip-reviews/${id}`);
  // Defensive: if any annotations row leaked through as a JSON-encoded
  // string (legacy data from before the storage fix), parse it here so
  // consumers can always rely on it being an array | null.
  if (review.match_decisions) {
    for (const d of review.match_decisions) {
      if (typeof d.annotations === "string") {
        try {
          d.annotations = JSON.parse(d.annotations) as AnnotationShape[];
        } catch {
          d.annotations = null;
        }
      }
    }
  }
  return { review };
}

export interface MonitorAuditCandidate {
  id: string;
  kind: "candidate";
  source_method: string | null;
  url: string | null;
  image_url: string | null;
  top_ip: string | null;
  similarity_score: number | null;
  inliers: number | null;
  vlm_verdict: string | null;
  vlm_confidence: number | null;
  vlm_reasoning: string | null;
  disposition: string | null;
  created_at: string;
}

export interface MonitorAuditPage {
  id: string;
  kind: "page";
  source_method: string | null;
  url: string | null;
  http_status: number | null;
  blocked: boolean | null;
  harvested_count: number | null;
  disposition: string | null;
  screenshot_url: string | null;
  created_at: string;
}

export interface MonitorAuditRun {
  run_id: string;
  domain: string;
  keyword: string | null;
  status: string;
  error: string | null;
  results_found: number | null;
  cases_created: number | null;
  started_at: string | null;
  completed_at: string | null;
  pages: MonitorAuditPage[];
  candidates: MonitorAuditCandidate[];
}

export async function getIpMonitoringAudit(ipId: string) {
  return request<{ runs: MonitorAuditRun[] }>(`/api/ip/${ipId}/monitoring/audit`);
}

export interface IpLicense {
  id: string;
  ip_catalog_id: string;
  domain: string;
  seller_name: string | null;
  seller_url: string | null;
  created_at: string;
}

export async function listIpLicenses(ipId: string) {
  return request<{ licenses: IpLicense[] }>(`/api/ip/${ipId}/licenses`);
}

export async function addIpLicense(
  ipId: string,
  input: { domain: string; seller_name?: string | null; seller_url?: string | null },
) {
  return request<{ license: IpLicense; dismissed: number }>(`/api/ip/${ipId}/licenses`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteIpLicense(ipId: string, licenseId: string) {
  return request<{ ok: true }>(`/api/ip/${ipId}/licenses/${licenseId}`, { method: "DELETE" });
}

export function updateIpReviewDecision(
  id: string,
  patch: { decision: IpReviewDecision | null; decision_rationale: string | null }
) {
  return request<{ review: IpReview }>(`/api/ip-reviews/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteIpReview(id: string) {
  return request<{ ok: boolean }>(`/api/ip-reviews/${id}`, { method: "DELETE" });
}

/**
 * Fetch the clearance-review PDF with the bearer token attached and open
 * it in a new tab. Same workaround as the per-finding takedown packet —
 * anchor navigation can't carry the Authorization header.
 */
export async function openIpReviewReport(id: string): Promise<void> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}/api/ip-reviews/${id}/report.pdf`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// --- IP-scoped monitoring (platforms + findings live under the IP) ---

/** Platforms (monitored domains) wired to a single IP. */
export function listIpMonitoringPlatforms(ipId: string) {
  return request<{ platforms: MonitoredDomain[] }>(
    `/api/ip/${ipId}/monitoring/platforms`,
  );
}

/** Add a platform by bare host or full URL — the backend normalises it. */
export function addIpMonitoringPlatform(ipId: string, domain: string) {
  return request<{ platform: MonitoredDomain; jobs_enqueued: number }>(
    `/api/ip/${ipId}/monitoring/platforms`,
    { method: "POST", body: JSON.stringify({ domain }) },
  );
}

export function setIpMonitoringPlatformEnabled(
  ipId: string,
  domainId: string,
  enabled: boolean,
) {
  return request<{ platform: MonitoredDomain }>(
    `/api/ip/${ipId}/monitoring/platforms/${domainId}`,
    { method: "PATCH", body: JSON.stringify({ enabled }) },
  );
}

export function removeIpMonitoringPlatform(ipId: string, domainId: string) {
  return request<{ ok: boolean }>(
    `/api/ip/${ipId}/monitoring/platforms/${domainId}`,
    { method: "DELETE" },
  );
}

/** "Refresh now" — fans out one run per linked platform server-side. */
export function triggerIpMonitoringRun(ipId: string) {
  return request<{ jobs_enqueued: number }>(`/api/ip/${ipId}/monitoring/runs`, {
    method: "POST",
  });
}

export function listIpMonitoringFindings(
  ipId: string,
  opts: { include_dismissed?: boolean } = {},
) {
  const params = new URLSearchParams();
  if (opts.include_dismissed) params.set("include_dismissed", "true");
  const qs = params.toString();
  return request<{
    findings: IpReviewFinding[];
    monitoring_run_in_progress: boolean;
  }>(`/api/ip/${ipId}/monitoring/findings${qs ? `?${qs}` : ""}`);
}

export function dismissIpFinding(ipId: string, resultId: string) {
  return request<{ ok: boolean }>(
    `/api/ip/${ipId}/monitoring/findings/${resultId}/dismiss`,
    { method: "POST" },
  );
}

/**
 * Fetch a per-finding takedown packet with the bearer token attached and
 * open it in a new tab. Anchor `href` navigation doesn't carry the
 * Authorization header, so the request would 401 — instead we pull the
 * PDF as a Blob and hand the browser a blob: URL.
 */
export async function openIpFindingTakedownPacket(
  ipId: string,
  resultId: string,
): Promise<void> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(
    `${API}/api/ip/${ipId}/monitoring/findings/${resultId}/takedown-packet.pdf`,
    { headers },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  // Revoke after a beat — early revoke kills the open in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// --- Tenant-wide monitoring hub (across ALL monitored IPs) ---

/**
 * Every monitoring finding across the tenant, decorated with `ip_id` /
 * `ip_name` (and `screenshot_url`) so a global board can attribute and
 * action each finding by its own IP. Powers the /monitoring "Findings" tab.
 */
export function listMonitoringFindingsGlobal(
  opts: { include_dismissed?: boolean } = {},
) {
  const params = new URLSearchParams();
  if (opts.include_dismissed) params.set("include_dismissed", "true");
  params.set("limit", "1000");
  const qs = params.toString();
  return request<{ findings: IpReviewFinding[] }>(
    `/api/monitoring/findings${qs ? `?${qs}` : ""}`,
  );
}

/** One monitored IP plus the platforms wired to it. Powers the /monitoring
 *  "Monitored IPs" tab. */
export interface MonitoredIpSummary {
  ip_id: string;
  ip_name: string;
  keywords: string[] | null;
  platforms: {
    id: string;
    domain: string;
    enabled: boolean;
    last_run_at: string | null;
  }[];
}

export function listMonitoredIps() {
  return request<{ ips: MonitoredIpSummary[] }>("/api/monitoring/ips");
}

/** Count of unhandled findings tenant-wide — the nav notification badge. */
export function getMonitoringFindingsCount() {
  return request<{ count: number }>("/api/monitoring/findings/count");
}
