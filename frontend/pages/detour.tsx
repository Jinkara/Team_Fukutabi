import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import Layout from "../components/Layout";
import Guard from "../components/Guard";
import styles from "../styles/Detour.module.css";

type Mode = "walk" | "drive";
type Dur = 15 | 30 | 45 | 60;
type Category = "local" | "gourmet" | "event";

export default function Detour() {
  const router = useRouter();

  // 初期は未選択
  const [mode, setMode] = useState<Mode | null>(null);
  const [duration, setDuration] = useState<Dur | null>(null);
  const [category, setCategory] = useState<Category | null>(null);

  const canGo = mode !== null && duration !== null && category !== null;

  const go = () => {
    if (!canGo) return;
    router.push({
      pathname: "/detour-play",
      query: { mode: mode as Mode, duration: duration as Dur, category: category as Category },
    });
  };

  return (
    <Guard>
      <Layout title="寄り道ガイド">
        <main className={styles.page}>
          <div className={styles.topbar}>
            <Link href="/menu" legacyBehavior><a className={styles.backLink}>← 寄り道ガイド</a></Link>
          </div>

          <section className={styles.hero}>
            <h1 className={styles.title}>寄り道ガイド</h1>
            <p className={styles.subtitle}>どのようなスポットを見つけますか？</p>
          </section>

          <section className={styles.card}>
            {/* 移動手段 */}
            <div className={styles.block}>
              <div className={styles.blockTitle}>移動手段は？</div>
              <div className={styles.segment}>
                <button
                  type="button"
                  className={`${styles.segmentBtn} ${mode === "walk" ? styles.segmentActive : ""}`}
                  onClick={() => setMode("walk")}
                >
                  <span className={styles.segIconWrap}>🚶</span>
                  <span className={styles.segText}>徒歩</span>
                </button>
                <button
                  type="button"
                  className={`${styles.segmentBtn} ${mode === "drive" ? styles.segmentActive : ""}`}
                  onClick={() => setMode("drive")}
                >
                  <span className={styles.segIconWrap}>🚗</span>
                  <span className={styles.segText}>車</span>
                </button>
              </div>
            </div>

            {/* 所要時間 */}
            <div className={styles.block}>
              <div className={styles.blockTitle}>所要時間は？</div>
              <div className={styles.chips}>
                {[15, 30, 45, 60].map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`${styles.chip} ${duration === m ? styles.chipActive : ""}`}
                    onClick={() => setDuration(m as Dur)}
                  >
                    {m}分
                  </button>
                ))}
              </div>
            </div>

            {/* カテゴリ（アイコン中央→その下にラベル。色：赤/緑/青） */}
            <div className={styles.block}>
              <div className={styles.blockTitle}>興味のあるカテゴリ</div>
              <div className={styles.catGrid}>
                <button
                  type="button"
                  className={`${styles.catCard} ${styles.catLocal} ${category === "local" ? styles.catActiveLocal : ""}`}
                  onClick={() => setCategory("local")}
                >
                  <span className={styles.catIcon}>📍</span>
                  <span className={styles.catLabel}>ローカル名所</span>
                </button>

                <button
                  type="button"
                  className={`${styles.catCard} ${styles.catGourmet} ${category === "gourmet" ? styles.catActiveGourmet : ""}`}
                  onClick={() => setCategory("gourmet")}
                >
                  <span className={styles.catIcon}>🍜</span>
                  <span className={styles.catLabel}>ご当地グルメ</span>
                </button>

                <button
                  type="button"
                  className={`${styles.catCard} ${styles.catEvent} ${category === "event" ? styles.catActiveEvent : ""}`}
                  onClick={() => setCategory("event")}
                >
                  <span className={styles.catIcon}>📅</span>
                  <span className={styles.catLabel}>イベント</span>
                </button>
              </div>
            </div>

            {/* 検索ボタン（見た目は常に黒、未選択ならdisabled） */}
            <button type="button" className={styles.searchBtn} onClick={go} disabled={!canGo} aria-disabled={!canGo}>
              <span className={styles.searchIcon}>🔍</span>
              スポットを探す
            </button>
          </section>
        </main>
      </Layout>
    </Guard>
  );
}

