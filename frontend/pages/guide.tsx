// frontend/pages/guide.tsx
import styles from "../styles/guide.module.css";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { FaChevronLeft, FaCamera, FaPlay, FaPause } from "react-icons/fa";

export default function GuidePage() {
  const router = useRouter();
  const { placeId } = router.query as { placeId?: string };

  const [guideText, setGuideText] = useState("Loading AIガイド...");
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [playing, setPlaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleBack = () => router.back();

  // 目的地(placeId)を受け取って、訪問登録＋ガイド生成（TTS含む）
  useEffect(() => {
    if (!router.isReady) return;

    if (!placeId) {
      setGuideText("目的地が指定されていません。先に『目的地を設定』してください。");
      return;
    }

    const run = async () => {
      setLoading(true);
      setErrorMsg("");
      setGuideText("ガイド生成中…");

      try {
        const uid =
          typeof window !== "undefined" ? window.localStorage.getItem("userId") : null;
        // Next 側の中継APIへ POST（バックエンドの /visits/ へ転送）
        const res = await fetch(`/api/visits/register?place_id=${encodeURIComponent(placeId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: uid }), // 必要なら実ユーザーIDに
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const detail = data?.detail || data?.error || `status ${res.status}`;
          throw new Error(`ガイド生成APIエラー: ${detail}`);
        }

        // FastAPI は { visit: VisitRead, guide: GuideRead } を返す想定
        const g = data?.guide ?? {};
        const text = g.guideText ?? g.guide_text ?? "";
        const audio = g.audioUrl ?? g.audio_url ?? "";

        setGuideText(text || "ガイドは生成されましたが本文が取得できませんでした。");
        setAudioUrl(audio || "");
      } catch (e: any) {
        console.error(e);
        setErrorMsg(e?.message ?? "ガイド生成でエラーが発生しました。");
        setGuideText("エラーが発生しました。再試行してください。");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [router.isReady, placeId]);

  const handleTogglePlay = async () => {
    const el = audioRef.current;
    if (!el || !audioUrl) return;
    try {
      if (playing) {
        el.pause();
        setPlaying(false);
      } else {
        await el.play();
        setPlaying(true);
      }
    } catch (e) {
      console.error("audio play error:", e);
    }
  };

  // 自動で再生状態を戻す
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onEnded = () => setPlaying(false);
    el.addEventListener("ended", onEnded);
    return () => el.removeEventListener("ended", onEnded);
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

      {/* 入力ボックスは表示しない */}

      <div className={styles.card}>
        <p className={styles.cardTitle}>📘 今日のおしゃべり旅ガイド</p>
        <p className={styles.cardText}>
          {loading ? "ガイド生成中…" : guideText}
          {errorMsg && <><br /><span className={styles.errorText}>{errorMsg}</span></>}
        </p>
      </div>

      <div className={styles.playSection}>
        <button
          className={styles.playButton}
          onClick={handleTogglePlay}
          disabled={!audioUrl}
          aria-label={playing ? "一時停止" : "再生"}
          title={playing ? "一時停止" : "再生"}
        >
          {playing ? <FaPause size={24} /> : <FaPlay size={24} />}
        </button>
        <p className={styles.playCaption}>
          {audioUrl ? "タップして音声ガイドを再生" : "音声の準備中または未生成"}
        </p>
        {playing && <p className={styles.playingText}>音声ガイド再生中...</p>}
      </div>

      {/* 音声プレイヤー（画面には見せない） */}
      <audio ref={audioRef} src={audioUrl || ""} preload="auto" />

      <button className={styles.nextButton} onClick={() => router.push("/destination")}>
        目的地を再設定する
      </button>
    </div>
  );
}
