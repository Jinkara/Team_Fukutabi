import Image from "next/image";
import { useRouter } from "next/router";
import styles from "../styles/index.module.css"; // 追加！

export default function Splash() {
  const router = useRouter();

  const handleStart = () => {
    router.push("/login");
  };

  return (
    <div className={styles.container}>
      {/* ロゴ */}
      <div className={styles.logo}>
        <Image
          src="/serendigo-logo.png"
          alt="SerendiGo ロゴ"
          width={160}
          height={160}
          priority
        />
      </div>

      {/* キャッチコピー */}
      <p className={styles.caption}>
        偶然の出会いを、あなただけの特別な旅に
      </p>

      {/* ページインジケーター */}
      <div className={styles.indicators}>
        <div className={`${styles.dot} ${styles.dot1}`} />
        <div className={`${styles.dot} ${styles.dot2}`} />
        <div className={`${styles.dot} ${styles.dot3}`} />
        <div className={`${styles.dot} ${styles.dot4}`} />
      </div>

      {/* スタートボタン */}
      <button className={styles.startButton} onClick={handleStart}>
        スタート
      </button>
    </div>
  );
}
