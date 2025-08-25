// lib/api.ts
import { DetourSuggestion } from "@/types";

// ===== API ベースURL =====
// 推奨: .env.local に NEXT_PUBLIC_API_BASE_URL を設定
export const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE ||
    "http://127.0.0.1:8000").replace(/\/+$/, "");

// ===== 型 =====
export type Mode = "walk" | "drive";
export type Category = "local" | "gourmet" | "event";
export type Dur = 15 | 30 | 45 | 60;
export type AgeRange =
  | "10s"
  | "20s"
  | "30s"
  | "40s"
  | "50s"
  | "60sPlus"
  | string;
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
  eta_min: number; // 分
  distance_m: number; // m
  category: Category;
  photo_url?: string;
};

export type RecommendResponse = { spots: Spot[] };

// フロントからバックに渡すパラメータ型
export type RecommendParams = {
  mode: Mode;
  duration: number; // 分
  category?: Category;
  exclude_ids?: string;
  seed?: number;
  radius_m?: number;
  lat: string;
  lng: string;
  local_only?: boolean;
};

// ===== detour_type ↔ category 変換 =====
function toDetourType(cat?: Category): "spot" | "food" | "event" | "souvenir" | null {
  switch (cat) {
    case "gourmet": return "food";
    case "event":   return "event";
    case "local":   return "spot";
    default:        return null;   // ← ここを null に
  }
}

function detourTypeToCategory(detourType: any): Category {
  const dt = String(detourType ?? "").toLowerCase();
  if (dt === "food") return "gourmet";
  if (dt === "event") return "event";
  return "local";
}

// ===== HTTP 基盤 =====
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

function joinUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

async function request<T>(
  method: HttpMethod,
  path: string,
  token?: string,
  body?: any,
  init?: RequestInit
): Promise<T> {
  const url = API_BASE ? joinUrl(path) : path;
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
  return (await res.json()) as T;
}

const apiGetRaw = <T>(
  path: string,
  token?: string,
  init?: RequestInit
) => request<T>("GET", path, token, undefined, init);
const apiPostRaw = <T>(
  path: string,
  body: any,
  token?: string,
  init?: RequestInit
) => request<T>("POST", path, token, body, init);

// ===== Spot 正規化 =====
export function normalizeSpot(raw: any): Spot {
  // ★ 追加：サーバの photo_url / image_url、camelCase でも拾う
  const photo =
    raw.photo_url ??
    raw.image_url ??
    raw.photoUrl ??
    raw.imageUrl;

  const distance_m =
    typeof raw.distance_m === "number"
      ? raw.distance_m
      : typeof raw.distance_km === "number"
      ? Math.round(raw.distance_km * 1000)
      : Number(raw.distance ?? 0);

  const eta_min =
    typeof raw.eta_min === "number"
      ? raw.eta_min
      : typeof raw.duration_min === "number"
      ? raw.duration_min
      : 0;

      // ★ detour_type / detourType 両方を考慮
  const detourTypeRaw = raw.detour_type ?? raw.detourType;
  const category: Category =
    raw.category != null
      ? (raw.category as Category)
      : detourTypeToCategory(detourTypeRaw);

  return {
    id: String(raw.id ?? raw.spot_id ?? ""),
    name: String(raw.name ?? raw.title ?? ""),
    genre: String(raw.genre ?? raw.type ?? ""),
    desc: String(raw.desc ?? raw.description ?? ""),
    lat: Number(raw.lat ?? raw.latitude ?? 0),
    lng: Number(raw.lng ?? raw.longitude ?? 0),
    eta_min,
    distance_m,
    category,
        // ★ 追加
    photo_url: typeof photo === "string" ? photo : undefined,
  };
}

// DetourSuggestion → Spot 変換（互換用）
function toSpot(s: DetourSuggestion): Spot {
  const etaText = (s as any).eta_text as string | undefined;
  const minMatch = etaText?.match(/(\d+)\s*分/);
  const meterMatch = etaText?.match(/(\d+)\s*m/);
  const etaMinFromText = minMatch ? Number(minMatch[1]) : undefined;
  const distMFromText = meterMatch ? Number(meterMatch[1]) : undefined;

  return {
    id: String(s.id),
    name: s.name,
    genre: (s as any).genre ?? "",
    desc: (s as any).desc ?? (s as any).description ?? "",
    lat: (s as any).lat,
    lng: (s as any).lng,
    eta_min:
      (s as any).eta_min ??
      (s as any).duration_min ??
      etaMinFromText ??
      0,
    distance_m:
      (s as any).distance_m ??
      (typeof (s as any).distance_km === "number"
        ? Math.round((s as any).distance_km * 1000)
        : typeof (s as any).distance === "number"
        ? Number((s as any).distance)
        : distMFromText ?? 0),
    category: ((s as any).category ?? "local") as Category,
  };
}

// ===== recommendSpots: GET /detour/search =====
export async function recommendSpots(
  params: RecommendParams
): Promise<{ spots: DetourSuggestion[] }> {
  const detour_type = toDetourType(params.category);

  // 🔎 ここで中身を確認（コンソールに出ます）
  //console.log("[recommendSpots] params.category =", params.category);
  //console.log("[recommendSpots] detour_type     =", detour_type);


  const q = new URLSearchParams({
    lat: params.lat,
    lng: params.lng,
    mode: params.mode,
    minutes: String(params.duration),
    local_only: String(params.local_only ?? false),
  });

  // ★ truthy のときだけセット
  if (detour_type) q.set("detour_type", detour_type);

  if (params.seed != null) q.set("seed", String(params.seed));
  if (detour_type !== "event" && params.radius_m != null) {
    q.set("radius_m", String(params.radius_m));
  }
  if (params.exclude_ids) {
    for (const id of params.exclude_ids
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)) {
      q.append("exclude_ids", id);
    }
  }

    // ★ ここを追加：距離のみ表示を強制
  q.set("distance_only", "true");

  const url = `${API_BASE}/detour/search?${q.toString()}`;
  //console.log("[recommendSpots] GET", url); // ← 送っている最終URLを出力

  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
  }
  const data = (await res.json()) as DetourSuggestion[];
  return { spots: data };
}

// ===== 共通 GET / POST =====
export const apiGet = <T>(
  path: string,
  token?: string,
  init?: RequestInit
) => apiGetRaw<T>(path, token, init);
export const apiPost = <T>(
  path: string,
  body: any,
  token?: string,
  init?: RequestInit
) => apiPostRaw<T>(path, body, token, init);

// ===== 履歴作成 API =====
export type CreateGuideHistoryInput = {
  guide_type: "detour" | "talk";
  title: string;
  subtitle?: string;
  description?: string;
  started_at: string;
  duration_min?: number;
  spots_count?: number;
  spots?: Array<{ id: string; name: string; category: Category }>;
  params?: any;
};
export type CreateGuideHistoryResponse = { id: number };

export function createGuideHistory(
  payload: CreateGuideHistoryInput,
  token?: string
) {
  return apiPost<CreateGuideHistoryResponse>("/guide-history", payload, token);
}

// ===== ユーザ登録 API =====
export type RegisterUserInput = {
  email: string;
  password: string;
  name: string;
  gender: string;
  age_group: string;
};

export function registerUser(payload: RegisterUserInput) {
  return apiPost("/register", payload);
}
