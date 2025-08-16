// lib/api.ts

// ===== 型 =====
export type Mode = "walk" | "drive";
export type Category = "local" | "gourmet" | "event";
export type Dur = 15 | 30 | 45 | 60;
export type AgeRange = "10s" | "20s" | "30s" | "40s" | "50s" | "60sPlus" | string;
export type Gender = "male" | "female" | "other" | string;

export type RecommendRequest = {
  mode: Mode;
  duration_min: Dur;
  category?: Category | null;
  user?: { gender?: Gender; age_range?: AgeRange } | null;
  exclude_ids?: string[];
  seed?: number;
  radius_m?: number;
};

export type Spot = {
  id: string;
  name: string;
  genre: string;
  desc: string;
  lat: number;
  lng: number;
  eta_min: number;     // 分
  distance_m: number;  // m
  category: Category;
};

export type RecommendResponse = { spots: Spot[] };

// ===== 環境変数 =====
// 推奨: .env.local に NEXT_PUBLIC_API_BASE_URL を設定（例: https://api.staging.serendigo.example）
export const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || "")
    .replace(/\/+$/, ""); // 末尾スラ除去

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

function joinUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;               // すでに絶対URL
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`; // BASE + 相対
}

async function request<T>(
  method: HttpMethod,
  path: string,
  token?: string,
  body?: any,
  init?: RequestInit
): Promise<T> {
  const url = API_BASE ? joinUrl(path) : path; // BASE未設定なら同一オリジン相対
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init?.headers as Record<string, string> | undefined),
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    ...init,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${text}`);
  }
  // 空ボディの可能性がなければ JSON で返す
  return (await res.json()) as T;
}

const apiGetRaw = <T>(path: string, token?: string, init?: RequestInit) =>
  request<T>("GET", path, token, undefined, init);
const apiPostRaw = <T>(path: string, body: any, token?: string, init?: RequestInit) =>
  request<T>("POST", path, token, body, init);

// ====== recommend: POST /detour/recommend ======
const RECOMMEND_EP = "/detour/recommend";

// サーバーのキー揺れを吸収
function normalizeSpot(raw: any): Spot {
  const meters =
    typeof raw.distance_m === "number"
      ? raw.distance_m
      : typeof raw.distance_km === "number"
      ? Math.round(raw.distance_km * 1000)
      : Number(raw.distance ?? 0);

  const cat = (raw.category ?? raw.cat) as Category;
  const category: Category = cat === "gourmet" ? "gourmet" : cat === "event" ? "event" : "local";

  return {
    id: String(raw.id ?? raw.spot_id ?? ""),
    name: String(raw.name ?? raw.title ?? ""),
    genre: String(raw.genre ?? raw.type ?? ""),
    desc: String(raw.desc ?? raw.description ?? ""),
    lat: Number(raw.lat ?? raw.latitude ?? 0),
    lng: Number(raw.lng ?? raw.longitude ?? 0),
    eta_min: Number(raw.eta_min ?? raw.eta ?? 0),
    distance_m: meters,
    category,
  };
}

export async function recommendSpots(payload: RecommendRequest, token?: string): Promise<RecommendResponse> {
  const raw = await apiPostRaw<any>(RECOMMEND_EP, payload, token);
  const list = Array.isArray(raw?.spots) ? raw.spots.map(normalizeSpot) : [];
  return { spots: list };
}

// ===== 共通 GET / POST（履歴でも使用） =====
export const apiGet = <T>(path: string, token?: string, init?: RequestInit) =>
  apiGetRaw<T>(path, token, init);
export const apiPost = <T>(path: string, body: any, token?: string, init?: RequestInit) =>
  apiPostRaw<T>(path, body, token, init);

// ===== 履歴作成 API: POST /guide-history =====
export type CreateGuideHistoryInput = {
  guide_type: "detour" | "talk";
  title: string;
  subtitle?: string;
  description?: string;
  started_at: string;           // ISO8601
  duration_min?: number;
  spots_count?: number;
  spots?: Array<{ id: string; name: string; category: Category }>;
  params?: any;
};
export type CreateGuideHistoryResponse = { id: number };

export function createGuideHistory(payload: CreateGuideHistoryInput, token?: string) {
  // 外部API前提。Next.js の /api ではなく、素の /guide-history にPOST
  return apiPost<CreateGuideHistoryResponse>("/guide-history", payload, token);
}
