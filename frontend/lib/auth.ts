import type { AgeRange, Gender } from "./api";

export type Profile = { gender?: Gender; ageRange?: AgeRange };

export function loadProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("serendigo_profile");
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(p: Profile) {
  try { localStorage.setItem("serendigo_profile", JSON.stringify(p)); } catch {}
}

// 履歴POSTのための簡易トークン（無ければ null でOK）
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("serendigo_token");
}
