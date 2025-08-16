// frontend/pages/guide.tsx
import styles from "../styles/guide.module.css";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { FaChevronLeft, FaCamera, FaPlay } from "react-icons/fa";

export default function GuidePage() {
  const router = useRouter();
  const [playing, setPlaying] = useState(false);
  const [guideText, setGuideText] = useState("Loading AIガイド...");

  const handleBack = () => {
    router.back();
  };

  const handlePlay = () => {
    setPlaying(true);
    // TODO: 音声読み上げロジックを実装
  };

  useEffect(() => {
    const fetchGuide = async () => {
      try {
        const res = await fetch("/api/guide");
        const data = await res.json();
        setGuideText(data.content || "ガイドの取得に失敗しました。");
      } catch (err) {
        setGuideText("エラーが発生しました。再試行してください。");
      }
    };
    fetchGuide();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={handleBack} className={styles.backButton}>
          <FaChevronLeft size={16} />
        </button>
        <h1 className={styles.title}>おしゃべりAI旅ガイド</h1>
      </div>

      <div className={styles.iconWrapper}>
        <FaCamera className={styles.cameraIcon} size={36} />
      </div>

      <div className={styles.card}>
        <p className={styles.cardTitle}>📘 今日のおしゃべり旅ガイド</p>
        <p className={styles.cardText}>{guideText}</p>
      </div>

      <div className={styles.playSection}>
        <button className={styles.playButton} onClick={handlePlay}>
          <FaPlay size={24} />
        </button>
        <p className={styles.playCaption}>タップして音声ガイドを再生</p>
        {playing && <p className={styles.playingText}>音声ガイド再生中...</p>}
      </div>

      <button className={styles.nextButton}>目的地を再設定する</button>
    </div>
  );
}