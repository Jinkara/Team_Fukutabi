// pages/library/[id].tsx
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
//import Guard from "@/components/Guard";
import { apiGet } from "@/lib/api";
import { getToken } from "@/lib/auth";
import styles from "@/styles/LibraryDetail.module.css";

type Category = "local" | "gourmet" | "event";

type HistoryDetail = {
  id: number;
  guide_type: "talk" | "detour";      // talk=旅ガイド(赤) / detour=寄り道(青)
  title: string;
  subtitle?: string;
  description?: string;
  started_at: string;                 // ISO
  duration_min?: number;
  spots_count?: number;
  spots?: { id: string; name: string; category: Category; genre?: string; desc?: string }[];
  params?: { mode?: "walk" | "drive"; duration?: number; category?: Category; radius_m?: number };
};

export default function LibraryDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [data, setData] = useState<HistoryDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const token = getToken() || undefined;
        const res = await apiGet<HistoryDetail>(`/api/guide-history/${id}`, token);
        setData(res);
      } catch {
        setError("この履歴の詳細を取得できませんでした。");
      }
    })();
  }, [id]);

  const speak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ja-JP";
      window.speechSynthesis.speak(u);
    } catch {}
  };

  const colorBorder =
    data?.guide_type === "talk" ? styles.redBorder : styles.blueBorder;
  const colorBadge =
    data?.guide_type === "talk" ? styles.redBadge : styles.blueBadge;

  return (
    //<Guard>
      <Layout title="履歴の詳細">
        <main className={styles.page}>
          <div className={styles.topbar}>
            <Link href="/library" className={styles.backLink}>
              ← ガイド履歴へ戻る
            </Link>
          </div>

          {!data && !error && <div className={styles.empty}>読み込み中…</div>}
          {error && <div className={styles.empty}>{error}</div>}
          {data && (
            <>
              <article className={`${styles.headerCard} ${colorBorder}`}>
                <div className={styles.titleRow}>
                  <h1 className={styles.title}>{data.title}</h1>
                  <span className={`${styles.badge} ${colorBadge}`}>
                    {data.subtitle ||
                      (data.guide_type === "talk"
                        ? "おしゃべり旅ガイド"
                        : "寄り道ガイド")}
                  </span>
                </div>
                <div className={styles.meta}>
                  {typeof data.duration_min === "number" && (
                    <span className={styles.badge}>{data.duration_min}分</span>
                  )}
                  {!!data.spots_count && (
                    <span className={styles.badge}>{data.spots_count}スポット</span>
                  )}
                </div>
                {data.description && (
                  <p className={styles.desc}>{data.description}</p>
                )}
                <div className={styles.actions}>
                  <button
                    className={styles.primaryBtn}
                    onClick={() =>
                      speak(
                        `${data.title}。${
                          data.description || ""
                        }。所要は${data.duration_min ?? ""}分、${
                          data.spots_count ?? 0
                        }スポットです。`
                      )
                    }
                  >
                    ▶ 要約を音声で聞く
                  </button>
                  {data.params && (
                    <Link
                      href={{
                        pathname: "/detour-play",
                        query: {
                          mode: data.params.mode,
                          duration: data.params.duration,
                          category: data.params.category,
                        },
                      }}
                      className={styles.ghostBtn}
                    >
                      同じ条件でもう一度探す
                    </Link>
                  )}
                </div>
              </article>

              {Array.isArray(data.spots) && data.spots.length > 0 && (
                <section className={styles.spotList}>
                  <h2 className={styles.sectionHeading}>スポット一覧</h2>
                  <div className={styles.cards}>
                    {data.spots.map((s) => (
                      <div key={s.id} className={styles.card}>
                        <div
                          className={`${styles.icon} ${
                            s.category === "local"
                              ? styles.redBadge
                              : s.category === "gourmet"
                              ? styles.greenBadge
                              : styles.blueBadge
                          }`}
                        >
                          {s.category === "local"
                            ? "📍"
                            : s.category === "gourmet"
                            ? "🍜"
                            : "📅"}
                        </div>
                        <div className={styles.cardBody}>
                          <div className={styles.cardTitle}>{s.name}</div>
                          {s.genre && (
                            <div className={styles.cardGenre}>{s.genre}</div>
                          )}
                          {s.desc && <p className={styles.cardDesc}>{s.desc}</p>}
                          <button
                            className={styles.smallVoiceBtn}
                            onClick={() =>
                              speak(
                                `${s.name}。${
                                  s.genre ? s.genre + "。" : ""
                                }${s.desc ?? ""}`
                              )
                            }
                          >
                            ▶ 詳細を音声で聞く
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </Layout>
    //</Guard>
  );
}
