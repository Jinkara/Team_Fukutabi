// pages/detour-play.tsx
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import Layout from "../components/Layout";
import Guard from "../components/Guard";
import styles from "../styles/DetourPlay.module.css";

import {
  recommendSpots,
  type Spot,
  type Category,
  type Mode,
  type Dur,
} from "../lib/api";
import { loadProfile } from "../lib/auth";
import { colorNameByCategory, fmtDistance, fmtEta } from "../lib/places";

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
  const [spots, setSpots] = useState<Spot[] | null>(null);
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
      const { spots } = await recommendSpots({
        mode,
        duration_min: duration,
        category: selectedCategory,
        user: profile ? { gender: profile.gender, age_range: profile.ageRange } : null,
        exclude_ids: excludeIds,
        seed: Math.floor(Math.random() * 1e6),
        radius_m: opts?.widen ? radius + 500 : radius,
      });

      // widen 指定時は半径を実際に更新
      if (opts?.widen) setRadius(r => r + 500);

      setSpots(spots);
      setExcludeIds((ids) => [...ids, ...spots.map((s) => s.id)]);
    } catch (e) {
      setErrorMsg("接続できなかったためサンプルデータを表示しています。");
      // 簡易モック
      const mock: Spot[] = [
        {
          id: "local-1",
          name: "喫茶店カフェ Serendipity",
          genre: "カフェ・コーヒー",
          desc: "老舗の自家焙煎コーヒーが自慢の隠れ家カフェ。レトロな雰囲気で地元の人にも愛される名店です。",
          lat: 0, lng: 0, eta_min: 15, distance_m: 350, category: "local",
        },
        {
          id: "gourmet-1",
          name: "アンティーク雑貨店",
          genre: "雑貨・インテリア",
          desc: "ヨーロッパから直輸入した家具や食器が並ぶ注目雑貨店。一点物のヴィンテージ品に出会えます。",
          lat: 0, lng: 0, eta_min: 8, distance_m: 650, category: "gourmet",
        },
        {
          id: "event-1",
          name: "小さなアートギャラリー",
          genre: "アート・ギャラリー",
          desc: "若手作家の企画展を展示。週末にはオーナーが作品の背景を説明してくれる語り部ツアーも。",
          lat: 0, lng: 0, eta_min: 9, distance_m: 450, category: "event",
        },
      ];
      setSpots(mock);
      setExcludeIds((ids) => [...ids, ...mock.map((s) => s.id)]);
    } finally {
      setLoading(false);
      if (typeof window !== "undefined") {
        document.getElementById("list-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
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
    <Guard>
      <Layout title="寄り道ガイド">
        <main className={styles.page}>
          <div className={styles.topbar}>
            <Link href="/detour" legacyBehavior><a className={styles.backLink}>← 条件へ戻る</a></Link>
          </div>

          <section className={styles.hero}>
            <h1 className={styles.title}>寄り道ガイド</h1>
            <p className={styles.subtitle}>おすすめスポットをピックアップしました</p>
          </section>

          {/* マップ（プレースホルダ） */}
          <section className={styles.mapBox}>
            <div className={styles.mapPlaceholder}>マップエリア（地図が表示される）</div>
            <div className={styles.legend}>
              <span className={`${styles.dot} ${styles.red}`} /><span>ローカル名所</span>
              <span className={`${styles.dot} ${styles.green}`} /><span>ご当地グルメ</span>
              <span className={`${styles.dot} ${styles.blue}`} /><span>イベント</span>
            </div>
          </section>

          <div id="list-top" />
          <section className={styles.cards}>
            {errorMsg && <div className={styles.notice}>{errorMsg}</div>}

            {loading && (
              <>
                {[0,1,2].map(i => <div key={i} className={`${styles.card} ${styles.skeleton}`} />)}
              </>
            )}

            {!loading && spots?.map((s) => (
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
    </Guard>
  );
}
