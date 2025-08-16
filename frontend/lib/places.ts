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
