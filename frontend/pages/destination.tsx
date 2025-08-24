import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../styles/destination.module.css";

// 使うフィールドに合わせてシンプルに
type Prediction = {
  label: string;
  placeId: string;
};

export default function Destination() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>(""); // ← 重複を1つに

  // ★ ユーザーIDの取得（実装に合わせて調整）
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    const uid = window.localStorage.getItem("userId"); // 例
    setUserId(uid);
  }, []);

  // 🔹 最近の訪問（ユーザー別）
  const [recent, setRecent] = useState<Prediction[]>([]);
  useEffect(() => {
    if (!userId) return;
    const loadRecent = async () => {
      try {
        const res = await fetch(
          `/api/visits/recent?user_id=${encodeURIComponent(userId)}&limit=5`
        );
        if (!res.ok) throw new Error(`failed: ${res.status}`);
        const data: { placeId: string; name: string }[] = await res.json();
        setRecent(data.map((d) => ({ placeId: d.placeId, label: d.name })));
      } catch (e) {
        console.error("最近の訪問取得エラー:", e);
        setRecent([]);
      }
    };
    loadRecent();
  }, [userId]);

  // 入力に応じてサジェストを取得
  useEffect(() => {
    const fetchPredictions = async () => {
      if (!query.trim()) {
        setPredictions([]);
        return;
      }
      try {
        const res = await fetch(
          `/api/predictions?input=${encodeURIComponent(query)}`
        );
        const data = await res.json();

        // 住所などは捨てて name を優先して表示
        const normalized: Prediction[] = data
          .map((d: any) => ({
            label: d.name ?? d.description ?? "",
            placeId: d.placeId ?? d.place_id,
          }))
          .filter((p: Prediction) => p.label && p.placeId);

        setPredictions(normalized);
      } catch (e) {
        console.error("予測取得エラー:", e);
      }
    };
    const t = setTimeout(fetchPredictions, 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleChange = (v: string) => {
    setQuery(v);
    setSelectedPlaceId("");
  };

  const handleSetDestination = async () => {
    if (!selectedPlaceId) {
      alert("候補リストから目的地を選んでください");
      return;
    }
    try {
      const res = await fetch(
        `/api/destinations/register?place_id=${encodeURIComponent(
          selectedPlaceId
        )}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("登録に失敗しました");
      const data = await res.json();
      router.push({ pathname: "/guide", query: { placeId: data.placeId } });
    } catch (error) {
      console.error("目的地登録エラー:", error);
      alert("目的地の登録に失敗しました");
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>目的地入力</h1>
      <h2 className={styles.title}>どこへ向かいますか？</h2>
      <p className={styles.subtitle}>目的地を設定しよう</p>

      <input
        type="text"
        className={styles.input}
        placeholder="駅名、住所、施設名で検索"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
      />

      {/* 予測候補 */}
      {predictions.length > 0 && (
        <ul className={styles.predictionList}>
          {predictions.map((item, idx) => (
            <li
              key={`${item.placeId}-${idx}`}
              className={styles.predictionItem}
              onClick={() => {
                setQuery(item.label);
                setSelectedPlaceId(item.placeId);
              }}
            >
              {item.label}
            </li>
          ))}
        </ul>
      )}

      {/* 最近の訪問（ユーザー別） */}
      <div className={styles.recent}>
        <p className={styles.recentLabel}>最近の検索</p>
        <ul className={styles.recentList}>
          {recent.map((r) => (
            <li
              key={r.placeId}
              className={styles.recentItem}
              onClick={() => {
                setQuery(r.label);
                setSelectedPlaceId(r.placeId);
              }}
            >
              {r.label}
            </li>
          ))}
          {recent.length === 0 && (
            <li className={styles.recentItemMuted}>履歴がありません</li>
          )}
        </ul>
      </div>

      <button
        className={styles.searchButton}
        onClick={handleSetDestination}
        disabled={!selectedPlaceId}
      >
        目的地を設定
      </button>
    </div>
  );
}
