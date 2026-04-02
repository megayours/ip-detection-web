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

export interface Trademark {
  id: string;
  name: string;
  description: string | null;
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
  created_at: string;
}

export function listTrademarks() {
  return request<{ trademarks: Trademark[] }>("/api/trademarks");
}

export function listPublicTrademarks() {
  return request<{ trademarks: Trademark[] }>("/api/trademarks/public");
}

export function createTrademark(name: string, description?: string) {
  return request<{ trademark: Trademark }>("/api/trademarks", {
    method: "POST",
    body: JSON.stringify({ name, description }),
  });
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
  dino_score: number;
  clip_score: number;
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
