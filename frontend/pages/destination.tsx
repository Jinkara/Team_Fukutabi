import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../styles/destination.module.css";

type Prediction = {
  name: string;           // ← 追加
  description: string;    // （不要なら消してもOK）
  placeId: string;
  label: string;          // ← 追加
}

export default function Destination() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<{ label: string; placeId: string }[]>([]);// からちゃん追加
  const [recent] = useState(["東京駅", "渋谷スカイ", "新宿パークハイアット"]);

useEffect(() => {
  console.log("📦 predictions: ", predictions);
}, [predictions]);

  // const handleSetDestination = () => {
  //   if (!query.trim()) return;
  //   router.push("/guide");
  // };

  // ⭐ new: 候補から選択した placeId を保持
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>("");

  // 入力に応じてサジェストを取得
  useEffect(() => {
    const fetchPredictions = async () => {
      if (!query.trim()) {
        setPredictions([]);
        return;
      }
      try {
        const res = await fetch(`/api/predictions?input=${encodeURIComponent(query)}`);
        const data = await res.json();

        // data のキーが place_id の場合はマッピングして揃える
        const normalized: Prediction[] = data.map((d: any) => ({
          label: d.description,
          placeId: d.placeId ?? d.place_id, // ← どちらでも拾えるように
        }));

        setPredictions(normalized);
      } catch (e) {
        console.error("予測取得エラー:", e);
      }
    };

    const t = setTimeout(fetchPredictions, 300);
    return () => clearTimeout(t);
  }, [query]);

  // ⭐ new: 手入力で文字を変えたら、前に選んだ placeId はクリア（取り違え防止）
  const handleChange = (v: string) => {
    setQuery(v);
    setSelectedPlaceId("");
  };

  // ⭐ new: 目的地を登録してガイド画面へ遷移（place_id をクエリで送る）
  const handleSetDestination = async () => {
    if (!selectedPlaceId) {
      alert("候補リストから目的地を選んでください");
      return;
    }

    try {
      // Next の中継 API を叩く（その先で FastAPI /destinations/register に転送）
      const res = await fetch(
        `/api/destinations/register?place_id=${encodeURIComponent(selectedPlaceId)}`,
        { method: "POST" }
      );

      if (!res.ok) throw new Error("登録に失敗しました");

      const data = await res.json(); // { id, placeId, name, ... }
      router.push({
        pathname: "/guide",
        query: { placeId: data.placeId },
      });
    } catch (error) {
      console.error("目的地登録エラー:", error);
      alert("目的地の登録に失敗しました");
    }
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
        // onChange={(e) => setQuery(e.target.value)} // 元のコード
        onChange={(e) => handleChange(e.target.value)} // ⭐ 修正：専用ハンドラで placeId もクリア
      />

      {/* 🔽 予測候補の表示 */}
      {predictions.length > 0 && (
        <ul className={styles.predictionList}>
          {predictions.map((item, index) => (
            <li
              key={index}
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

       {/* 最近の検索（※ここは placeId を持っていないので、選択しても登録は不可にしておくのが安全） */}
      <div className={styles.recent}>
        <p className={styles.recentLabel}>最近の検索</p>
        <ul className={styles.recentList}>
          {recent.map((place, idx) => (
           <li
            key={idx}
            className={styles.recentItem}
            onClick={() => {
              setQuery(place);
              setSelectedPlaceId("");
            }}
          >
            {place}
          </li>
          ))}
        </ul>
      </div>

      <button className={styles.searchButton} onClick={handleSetDestination} disabled={!selectedPlaceId} >
        目的地を設定
      </button>
    </div>
  );
}