import type { Category, Mode } from "./api";

export function colorNameByCategory(cat: Category) {
  return cat === "local" ? "red" : cat === "gourmet" ? "green" : "blue";
}
export function fmtDistance(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`;
}
export function fmtEta(min: number, mode: Mode) {
  return `${mode === "walk" ? "徒歩" : "車"} 約${min}分`;
}

// 追加：input文字列から予測候補（main_text）を取得する (からちゃん追記)
export async function fetchPredictions(input: string, limit: number = 3) {
  const res = await fetch(`/api/predictions?input=${encodeURIComponent(input)}&limit=${limit}`);
  const data = await res.json();

  return data.items.map((item: any) => ({
    label: item.structured_formatting.main_text,  // 表示ラベルに使う名前
    placeId: item.place_id                         // DB保存などに使うID
  }));
}
