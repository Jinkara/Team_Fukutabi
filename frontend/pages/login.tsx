import { useState } from "react";
import { useRouter } from "next/router";
import styles from "../styles/login.module.css";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    try {
      // next.config.js の /api → 8000 リライト経由でバックエンドへ
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      // レスポンス本文は最初に読んでおく
      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        alert(data?.detail || "ログインに失敗しました");
        return;
      }

      // バックエンドの戻り値の型ゆれに対応（id or user_id）
      const uid = String(data.id ?? data.user_id ?? "");
      if (!uid) {
        alert("ユーザーIDを取得できませんでした");
        return;
      }

      // 以降の画面が参照するキー名で保存（"userId" に統一）
      localStorage.setItem("userId", uid);
      if (data.name) localStorage.setItem("userName", String(data.name));

      router.push("/menu");
    } catch (err) {
      console.error("ログインエラー:", err);
      alert("ログイン中にエラーが発生しました");
    }
  };

  const handleNavigateRegister = () => router.push("/register");

  return (
    <div className={styles.container}>
      <h1 className={styles.logo}>
        Serendi<span>Go</span>
      </h1>
      <p className={styles.caption}>素敵な旅の続きへ始めましょう</p>

      <div className={styles.form}>
        <label className={styles.label}>メールアドレス</label>
        <input
          className={styles.input}
          type="email"
          placeholder="example@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className={styles.label}>パスワード</label>
        <div className={styles.passwordWrapper}>
          <input
            className={styles.input}
            type={showPassword ? "text" : "password"}
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <span
            className={styles.toggle}
            onClick={() => setShowPassword(!showPassword)}
            aria-label="パスワード表示切替"
          >
            👁️
          </span>
        </div>

        <button className={styles.loginButton} onClick={handleLogin}>
          ログイン
        </button>
      </div>

      <div className={styles.footer}>
        <p>初めてのご利用ですか？</p>
        <span className={styles.link} onClick={handleNavigateRegister}>
          新規登録
        </span>
      </div>
    </div>
  );
}
