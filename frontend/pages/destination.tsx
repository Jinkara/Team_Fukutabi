import { useState } from "react";
import { useRouter } from "next/router";
import styles from "../styles/destination.module.css";

export default function Destination() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [recent] = useState(["東京駅", "渋谷スカイ", "新宿パークハイアット"]);

  const handleSetDestination = () => {
    if (!query.trim()) return;
    router.push("/guide");
  };

  return (
    <div className={styles.container}>
      {/* ✅ 修正①：画面タイトル */}
      <h1 className={styles.pageTitle}>目的地入力</h1>

      <h2 className={styles.title}>どこへ向かいますか？</h2>
      <p className={styles.subtitle}>目的地を設定しよう</p>

      <input
        type="text"
        className={styles.input}
        placeholder="駅名、住所、施設名で検索"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {/* ✅ 修正②：検索履歴との間にスペース */}
      <div className={styles.recent}>
        <p className={styles.recentLabel}>最近の検索</p>
        <ul className={styles.recentList}>
          {recent.map((place, idx) => (
            <li
              key={idx}
              className={styles.recentItem}
              onClick={() => setQuery(place)}
            >
              {place}
            </li>
          ))}
        </ul>
      </div>

      <button className={styles.searchButton} onClick={handleSetDestination}>
        目的地を設定
      </button>
    </div>
  );
}
