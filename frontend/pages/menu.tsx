import Head from "next/head";
import Link from "next/link";
import styles from "../styles/Menu.module.css";

export default function Menu() {
  return (
    <>
      <Head>
        <title>Home | SerendiGo</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className={styles.container}>
        {/* ロゴ */}
        <div className={styles.brand}>
          <span className={styles.brandSerendi}>Serendi</span>
          <span className={styles.brandGo}>Go</span>
        </div>

        {/* タイトル */}
        <section className={styles.hero}>
          <h1 className={styles.heading}>Home</h1>
          <p className={styles.subheading}>あなたの出会いをサポートします</p>
        </section>

        {/* CTA：おしゃべりAI旅ガイド */}
        <Link href="/guide" legacyBehavior>
          <a className={`${styles.cta} ${styles.red}`}>
            <span className={styles.iconWrap}>
              <svg className={styles.icon} viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path d="M20 2H4a2 2 0 0 0-2 2v15.586A1 1 0 0 0 3.707 20L7 16h13a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" fill="currentColor"/>
              </svg>
            </span>
            <span className={styles.ctaText}>
              <span className={styles.ctaTitle}>おしゃべりAI旅ガイド</span>
              <span className={styles.ctaDesc}>AIと一緒に気分リフレッシュ</span>
            </span>
          </a>
        </Link>

        {/* CTA：寄り道ガイド */}
        <Link href="/detour" legacyBehavior>
          <a className={`${styles.cta} ${styles.blue}`}>
            <span className={styles.iconWrap}>
              <svg className={styles.icon} viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" fill="currentColor"/>
              </svg>
            </span>
            <span className={styles.ctaText}>
              <span className={styles.ctaTitle}>寄り道ガイド</span>
              <span className={styles.ctaDesc}>新しい場所を見つけよう</span>
            </span>
          </a>
        </Link>

        {/* 履歴 */}
        <section className={styles.historySection}>
          <h2 className={styles.historyHeading}>過去のガイド履歴</h2>
          <Link href="/library" legacyBehavior>
            <a className={styles.historyCard}>
              <span className={styles.historyIconWrap}>
                <svg className={styles.lockIcon} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path d="M17 9h-1V7a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2zm-7-2a2 2 0 1 1 4 0v2h-4V7z" fill="currentColor"/>
                </svg>
              </span>
              <span className={styles.historyLabel}>ガイド履歴</span>
            </a>
          </Link>
        </section>
      </main>
    </>
  );
}

