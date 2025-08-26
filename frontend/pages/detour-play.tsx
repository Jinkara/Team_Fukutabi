// pages/detour-play.tsx
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Layout from "../components/Layout";
import styles from "../styles/DetourPlay.module.css";

import {
  // recommendSpots,  // ← 使わない
  type Spot,
  type Category,
  type Mode,
  type Dur,
  normalizeSpot,
} from "../lib/api";
import { loadProfile } from "../lib/auth";
import { colorNameByCategory, fmtDistance, fmtEta } from "../lib/places";

import { MapContainer, TileLayer, Marker, Popup, Circle, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const AnyMapContainer =
  MapContainer as unknown as React.ComponentType<Record<string, any>>;
const AnyCircle =
  Circle as unknown as React.ComponentType<Record<string, any>>;
const AnyCircleMarker =
  CircleMarker as unknown as React.ComponentType<Record<string, any>>;

const createColoredIcon = (color: "red" | "green" | "blue") =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

const iconByCategory: Record<string, L.Icon> = {
  local: createColoredIcon("red"),
  gourmet: createColoredIcon("green"),
  event: createColoredIcon("blue"),
};

// === 変換: フロントの category → バックの detour_type ===
const toDetourType = (category: string): "food" | "event" | "spot" | "souvenir" => {
  const c = (category || "").toLowerCase();
  if (c === "gourmet" || c === "food") return "food";
  if (c === "event") return "event";
  if (c === "local" || c === "attraction" || c === "sight" || c === "local_spot") return "spot";
  return "souvenir";
};

export default function DetourPlay() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  const mode: Mode | null = useMemo(() => {
    const m = String(router.query.mode || "");
    return m === "walk" || m === "drive" ? (m as Mode) : null;
  }, [router.query.mode]);

  const duration: Dur | null = useMemo(() => {
    const d = parseInt(String(router.query.duration || ""), 10);
    return [15, 30, 45, 60].includes(d) ? (d as Dur) : null;
  }, [router.query.duration]);

  const selectedCategory: Category | null = useMemo(() => {
    const c = String(router.query.category || "");
    return c === "local" || c === "gourmet" || c === "event"
      ? (c as Category)
      : null;
  }, [router.query.category]);

  const profile = useMemo(() => loadProfile(), []);

  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [excludeIds, setExcludeIds] = useState<string[]>([]);
  const baseRadiusRef = useRef<number>(1200);
  const [radius, setRadius] = useState<number>(baseRadiusRef.current);

  const [attempts, setAttempts] = useState(0);
  const nextWillWiden = !spots || spots.length < 3 || attempts % 2 === 1;

  const initialCenter: [number, number] = [
    Number(router.query.lat ?? 35.681236),
    Number(router.query.lng ?? 139.767125),
  ];
  const [mapCenter, setMapCenter] = useState<[number, number]>(initialCenter);
  const centeredOnceRef = useRef(false);

  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [userAccuracy, setUserAccuracy] = useState<number | null>(null);
  const AnyMarker =
    Marker as unknown as React.ComponentType<Record<string, any>>;

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserPos({ lat, lng });
        setUserAccuracy(pos.coords.accuracy ?? null);
        if (!centeredOnceRef.current) {
          setMapCenter([lat, lng]);
          centeredOnceRef.current = true;
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserPos({ lat, lng });
        setUserAccuracy(pos.coords.accuracy ?? null);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

    return () => {
      if (navigator.geolocation && id) {
        navigator.geolocation.clearWatch(id);
      }
    };
  }, []);

  const speak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ja-JP";
      window.speechSynthesis.speak(u);
    } catch {}
  };

  console.log("[detour-play] selectedCategory =", selectedCategory);

  // ---- ここが肝心：API を minutes / detour_type で叩く ----
  async function fetchOnce(opts?: { widen?: boolean }) {
    if (!mode || !duration) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const detourType = toDetourType(selectedCategory ?? "gourmet"); // 'gourmet'→'food' 等に変換
      const url = new URL("https://app-002-gen10-step3-2-py-oshima9.azurewebsites.net/detour/search");
      url.searchParams.set("mode", mode);                         // 'drive' | 'walk'
      url.searchParams.set("minutes", String(duration));          // ★ duration → minutes
      url.searchParams.set("detour_type", detourType);            // ★ category → detour_type
      url.searchParams.set("lat", String(router.query.lat ?? "35.681236"));
      url.searchParams.set("lng", String(router.query.lng ?? "139.767125"));

      // 既存の挙動を踏襲（任意パラメータ）
      const widenedRadius = opts?.widen ? radius + 500 : radius;
      url.searchParams.set("radius_m", String(widenedRadius));
      if (excludeIds.length > 0) {
        for (const id of excludeIds) url.searchParams.append("exclude_ids", id);
      }
      url.searchParams.set("seed", String(Math.floor(Math.random() * 1e6)));

      const res = await fetch(url.toString(), {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Fetch failed: ${res.status} ${res.statusText}\n${text}`);
      }

      const rawSpots = await res.json();

      if (opts?.widen) setRadius((r) => r + 500);

      const normalized: Spot[] = (rawSpots as any[]).map(normalizeSpot);
      setSpots(normalized);
      setExcludeIds((ids) => [...ids, ...normalized.map((s) => s.id)]);
    } catch (e: any) {
      setErrorMsg(
        `接続できませんでした: ${e?.message ?? e}. サンプルデータを表示しています。`
      );

      const mock = [
        {
          id: "1",
          name: "喫茶店カフェ Serendipity",
          description: "老舗の自家焙煎コーヒーが自慢の隠れ家カフェ。",
          lat: 35.681236,
          lng: 139.767125,
          distance_km: 0.35,
          duration_min: 15,
          source: "google",
          created_at: new Date().toISOString(),
          photo_url: "/placeholders/spot.png",
        },
        {
          id: "2",
          name: "アンティーク雑貨店",
          description: "ヨーロッパから直輸入した家具や食器が並ぶ注目雑貨店。",
          lat: 35.681236,
          lng: 139.767125,
          distance_km: 0.65,
          duration_min: 8,
          source: "google",
          created_at: new Date().toISOString(),
          photo_url: "/placeholders/spot.png",
        },
        {
          id: "3",
          name: "小さなアートギャラリー",
          description: "若手作家の企画展を展示するギャラリーです。",
          lat: 35.681236,
          lng: 139.767125,
          distance_km: 0.45,
          duration_min: 9,
          source: "google",
          created_at: new Date().toISOString(),
          photo_url: "/placeholders/spot.png",
        },
      ];

      const fallback: Spot[] = (mock as any[]).map(normalizeSpot);
      setSpots(fallback);
      setExcludeIds((ids) => [...ids, ...fallback.map((s) => s.id)]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!router.isReady) return;
    fetchOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  const onPrimaryClick = () => {
    fetchOnce({ widen: nextWillWiden });
    setAttempts((a) => a + 1);
  };

  const colorClass = (cat: Category) => styles[colorNameByCategory(cat)];
  const imgFallback = "/placeholders/spot.png";

  return (
    <Layout title="寄り道ガイド">
      <main className={styles.page}>
        <div className={styles.topbar}>
          <Link href="/detour" legacyBehavior>
            <a className={styles.backLink}>← 条件へ戻る</a>
          </Link>
        </div>

        <section className={styles.hero}>
          <h1 className={styles.title}>寄り道ガイド</h1>
          <p className={styles.subtitle}>おすすめスポットをピックアップしました</p>
        </section>

        <section className={styles.mapBox}>
          {isClient ? (
            <AnyMapContainer
              center={mapCenter}
              zoom={14}
              style={{ height: "260px", width: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {userPos && (
                <>
                  {typeof userAccuracy === "number" && (
                    <AnyCircle
                      center={[userPos.lat, userPos.lng]}
                      radius={Math.min(Math.max(userAccuracy, 20), 200)}
                      pathOptions={{ color: "#3388ff", opacity: 0.6, fillOpacity: 0.15 }}
                    />
                  )}
                  <AnyCircleMarker
                    center={[userPos.lat, userPos.lng]}
                    radius={6}
                    pathOptions={{ color: "#1e90ff", fillOpacity: 1 }}
                  />
                </>
              )}

              {spots.map((s) => (
                <AnyMarker
                  key={s.id}
                  position={[s.lat, s.lng]}
                  icon={iconByCategory[s.category] ?? iconByCategory["local"]}
                >
                  <Popup>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{s.name}</div>
                    <div style={{ fontSize: 12 }}>
                      {fmtEta(s.eta_min, mode || "walk")}・{fmtDistance(s.distance_m)}
                    </div>
                  </Popup>
                </AnyMarker>
              ))}
            </AnyMapContainer>
          ) : (
            <div className={styles.mapPlaceholder}>地図を読み込み中…</div>
          )}
          <div className={styles.legend}>
            <span className={`${styles.dot} ${styles.red}`} />
            <span>ローカル名所</span>
            <span className={`${styles.dot} ${styles.green}`} />
            <span>ご当地グルメ</span>
            <span className={`${styles.dot} ${styles.blue}`} />
            <span>イベント</span>
          </div>
        </section>

        <div id="list-top" />
        <section className={styles.cards}>
          {errorMsg && <div className={styles.notice}>{errorMsg}</div>}

          {loading && (
            <>
              {[0, 1, 2].map((i) => (
                <div key={i} className={`${styles.card} ${styles.skeleton}`} />
              ))}
            </>
          )}

          {!loading &&
            spots?.map((s) => (
              <article key={s.id} className={styles.card}>
                {/* 画像（16:9固定）＋ 左上にカテゴリアイコン */}
                <div className={styles.cardImage}>
                  <img
                    src={s.photo_url || imgFallback}
                    alt={s.name}
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = imgFallback;
                    }}
                    className={styles.cardImg}
                  />
                  <div className={styles.cardChip}>
                    {s.category === "local" ? "📍" : s.category === "gourmet" ? "🍜" : "📅"}
                  </div>
                </div>

                {/* 本文 */}
                <div className={styles.cardBody}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{s.name}</h3>
                    <div className={`${styles.badge} ${colorClass(s.category)}`}>
                      {fmtEta(s.eta_min, mode || "walk")}・{fmtDistance(s.distance_m)}
                    </div>
                  </div>
                  <div className={styles.cardGenre}>{s.genre}</div>
                  <p className={styles.cardDesc}>{s.desc}</p>
                  <button
                    type="button"
                    className={`${styles.voiceBtn} ${colorClass(s.category)}`}
                    onClick={() =>
                      speak(
                        `${s.name}。${s.genre ?? ""}。${s.desc ?? ""}。${
                          mode === "drive" ? "車" : "徒歩"
                        }で約${s.eta_min}分、距離は約${Math.round(s.distance_m)}メートルです。`
                      )
                    }
                  >
                    ▶ 音声で詳細を聞く
                  </button>
                </div>
              </article>
            ))}

          {!loading && (!spots || spots.length === 0) && (
            <div className={styles.empty}>
              条件に合うスポットが見つかりませんでした。条件を変更して検索してください。
            </div>
          )}
        </section>
      </main>
    </Layout>
  );
}
