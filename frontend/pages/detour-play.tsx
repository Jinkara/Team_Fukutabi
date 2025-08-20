// pages/detour-play.tsx
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import Layout from "../components/Layout";
//import Guard from "../components/Guard";
import styles from "../styles/DetourPlay.module.css";

import {
  recommendSpots,
  type Spot,
  type Category,
  type Mode,
  type Dur,
  normalizeSpot, // ★ 追加：api.ts の normalizeSpot を使う
} from "../lib/api";
import { loadProfile } from "../lib/auth";
import { colorNameByCategory, fmtDistance, fmtEta } from "../lib/places";
import { DetourSuggestion } from "@/types";

export default function DetourPlay() {
  const router = useRouter();

  // detour の条件（クエリから）
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
    return c === "local" || c === "gourmet" || c === "event" ? (c as Category) : null;
  }, [router.query.category]);

  const profile = useMemo(() => loadProfile(), []);

  // 表示用
  const [spots, setSpots] = useState<Spot[]>([]); // Spot[] に統一
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 再検索管理
  const [excludeIds, setExcludeIds] = useState<string[]>([]);
  const baseRadiusRef = useRef<number>(1200); // 初期半径(m)
  const [radius, setRadius] = useState<number>(baseRadiusRef.current);

  // 単一ボタンの「次の挙動」決定用
  const [attempts, setAttempts] = useState(0);
  const nextWillWiden = (!spots || spots.length < 3) || (attempts % 2 === 1);

  const speak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ja-JP";
      window.speechSynthesis.speak(u);
    } catch {}
  };

  async function fetchOnce(opts?: { widen?: boolean }) {
    if (!mode || !duration) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      // state の spots と被らないよう rawSpots にリネーム
      const { spots: rawSpots } = await recommendSpots({
        mode,
        duration: duration,                       // ← サーバは minutes を期待
        category: selectedCategory ?? undefined, // ← null を送らない
        //user: profile ? { gender: profile.gender, age_range: profile.ageRange } : null,
        exclude_ids: excludeIds.join(","), // ここは文字列でOK
        seed: Math.floor(Math.random() * 1e6),
        radius_m: opts?.widen ? radius + 500 : radius,
        lat: String(router.query.lat ?? "35.681236"),
        lng: String(router.query.lng ?? "139.767125"),
      });

      if (opts?.widen) setRadius((r) => r + 500);

      // ★ ここで正規化：any/DetourSuggestion/Spot どれでも normalizeSpot が Spot に整形
      const normalized: Spot[] = (rawSpots as any[]).map(normalizeSpot);
      setSpots(normalized);
      setExcludeIds((ids) => [...ids, ...normalized.map((s) => s.id)]);
    } catch (e: any) {
      setErrorMsg(`接続できませんでした: ${e?.message ?? e}.サンプルデータを表示しています。`);

      // 簡易モック（DetourSuggestion 形）
      const mock = [
        {
          id: "1",
          name: "喫茶店カフェ Serendipity",
          description: "老舗の自家焙煎コーヒーが自慢の隠れ家カフェ。",
          lat: 0,
          lng: 0,
          distance_km: 0.35,
          duration_min: 15,
          source: "google",
        },
        {
          id: "2",
          name: "アンティーク雑貨店",
          description: "ヨーロッパから直輸入した家具や食器が並ぶ注目雑貨店。",
          lat: 0,
          lng: 0,
          distance_km: 0.65,
          duration_min: 8,
          source: "google",
        },
        {
          id: "3",
          name: "小さなアートギャラリー",
          description: "若手作家の企画展を展示するギャラリーです。",
          lat: 0,
          lng: 0,
          distance_km: 0.45,
          duration_min: 9,
          source: "google",
        },
      ];

      // ★ モックも同じく正規化して Spot[] へ
      const fallback: Spot[] = mock.map(normalizeSpot as (x: any) => Spot);
      setSpots(fallback);
      setExcludeIds((ids) => [...ids, ...fallback.map((s) => s.id)]);
    } finally {
      setLoading(false);
    }
  }

  // 初回フェッチ
  useEffect(() => {
    if (!router.isReady) return;
    fetchOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  // 単一ボタン
  const onPrimaryClick = () => {
    fetchOnce({ widen: nextWillWiden });
    setAttempts((a) => a + 1);
  };

  const colorClass = (cat: Category) => styles[colorNameByCategory(cat)];

  return (
    //<Guard>
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

        {/* マップ（プレースホルダ） */}
        <section className={styles.mapBox}>
          <div className={styles.mapPlaceholder}>マップエリア（地図が表示される）</div>
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
                <div className={`${styles.cardIcon} ${colorClass(s.category)}`}>
                  {s.category === "local" ? "📍" : s.category === "gourmet" ? "🍜" : "📅"}
                </div>
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
                        `${s.name}。${s.genre}。${s.desc}。${
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

          {/* 空状態（説明のみ。ボタンはフッターに1つだけ） */}
          {!loading && (!spots || spots.length === 0) && (
            <div className={styles.empty}>
              条件に合うスポットが見つかりませんでした。検索条件を少し緩めて再検索します。
            </div>
          )}
        </section>

        {/* 単一ボタン + 次の挙動ヒント */}
        <div className={styles.footer}>
          <button className={styles.moreBtn} onClick={onPrimaryClick} disabled={loading}>
            {loading ? "読み込み中…" : "＋ 新しいスポットを探す"}
          </button>
          {!loading && nextWillWiden && (
            <div className={styles.nextHint}>次は半径を広げて探します（+500m）</div>
          )}
        </div>
      </main>
    </Layout>
    //</Guard>
  );
}
