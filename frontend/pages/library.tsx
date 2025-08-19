import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
//import Guard from "@/components/Guard";
import { apiGet } from "@/lib/api";
import { getToken } from "@/lib/auth";
import styles from "@/styles/Library.module.css";

type Item = {
  id: number;
  guide_type: "talk" | "detour"; // talk=旅ガイド(赤) / detour=寄り道(青)
  title: string;
  subtitle?: string;
  description?: string;
  started_at: string;           // ISO
  duration_min?: number;
  spots_count: number;
};

type HistoryResponse = {
  summary: { travel_guides: number; detours: number; hours?: number };
  days: { date: string; items: Item[] }[];
};

function diffDaysUtc(isoDate: string) {
  const d = new Date(isoDate);
  const today = new Date();
  const y = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const x = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((y - x) / (1000 * 60 * 60 * 24));
}

export default function Library() {
  const [data, setData] = useState<HistoryResponse | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = getToken() || undefined;
        // 外部API前提。/api/guide-history ではなく /guide-history を叩く
        const res = await apiGet<HistoryResponse>("/guide-history", token);
        setData(res);
      } catch {
        // 失敗時は空表示（サマリーは 0/0 を出す）
        setData({ summary: { travel_guides: 0, detours: 0 }, days: [] });
      }
    })();
  }, []);

  // 今日 / 昨日 / 一週間前（2〜7日前）
  const sections = useMemo(() => {
    const today: Item[] = [];
    const yesterday: Item[] = [];
    const week: Item[] = [];
    (data?.days ?? []).forEach((day) => {
      const dd = diffDaysUtc(day.date);
      if (dd === 0) today.push(...day.items);
      else if (dd === 1) yesterday.push(...day.items);
      else if (dd >= 2 && dd <= 7) week.push(...day.items);
    });
    return [
      { label: "今日", items: today },
      { label: "昨日", items: yesterday },
      { label: "一週間前", items: week },
    ];
  }, [data]);

  const summary = data?.summary ?? { travel_guides: 0, detours: 0 };

  const borderClass = (t: Item["guide_type"]) =>
    t === "talk" ? styles.redBorder : styles.blueBorder;
  const badgeClass = (t: Item["guide_type"]) =>
    t === "talk" ? styles.redBadge : styles.blueBadge;

  const emptyAll =
    !sections[0].items.length && !sections[1].items.length && !sections[2].items.length;

  return (
    //<Guard>
      <Layout title="ガイド履歴">
        <main className={styles.page}>
          {/* ← ホームへ戻る */}
          <div className={styles.topbar}>
            <Link href="/menu" className={styles.backLink}>← ホームへ戻る</Link>
          </div>

          <h1 className={styles.heading}>ガイド履歴</h1>

          {/* 集計（旅ガイド / 寄り道）— 常に表示（0/0でも） */}
          <section className={styles.summary} aria-label="集計">
            <div className={`${styles.stat} ${styles.statTalk}`}>
              <div className={styles.value}>{summary.travel_guides}</div>
              <div className={styles.label}>旅ガイド</div>
            </div>
            <div className={`${styles.stat} ${styles.statDetour}`}>
              <div className={styles.value}>{summary.detours}</div>
              <div className={styles.label}>寄り道</div>
            </div>
          </section>

          {/* サマリー直下に空メッセージ or リスト */}
          {emptyAll ? (
            <div className={styles.empty}>
              まだガイド履歴がありません。<br />
              「寄り道ガイド」や「おしゃべり旅ガイド」を開始すると、ここに表示されます。
            </div>
          ) : (
            <section className={styles.list}>
              {sections.map((sec) =>
                sec.items.length ? (
                  <div key={sec.label} className={styles.day}>
                    <div className={styles.sectionTitle}>{sec.label}</div>
                    {sec.items.map((it) => (
                      <article
                        key={it.id}
                        className={`${styles.item} ${borderClass(it.guide_type)}`}
                      >
                        <Link
                          href={`/library/${it.id}`}
                          className={styles.itemLink}
                          aria-label={`${it.title} の詳細`}
                        >
                          <div className={styles.itemHeader}>
                            <div className={styles.itemTitle}>{it.title}</div>
                            <div className={styles.meta}>
                              <span className={`${styles.badge} ${badgeClass(it.guide_type)}`}>
                                {it.subtitle ||
                                  (it.guide_type === "talk" ? "おしゃべり旅ガイド" : "寄り道ガイド")}
                              </span>
                              {typeof it.duration_min === "number" && (
                                <span className={styles.badge}>{it.duration_min}分</span>
                              )}
                              {!!it.spots_count && (
                                <span className={styles.badge}>{it.spots_count}スポット</span>
                              )}
                            </div>
                          </div>
                          {it.description && <p className={styles.desc}>{it.description}</p>}
                        </Link>
                      </article>
                    ))}
                  </div>
                ) : null
              )}
            </section>
          )}
        </main>
      </Layout>
    //</Guard>
  );
}
