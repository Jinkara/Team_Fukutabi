import { useState } from "react";
import { useRouter } from "next/router";
import styles from "../styles/login.module.css";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // からちゃん追記（ログイン機能実装）
  const handleLogin = async () => {
  try {
    const response = await fetch("http://localhost:8000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      alert(errorData.detail || "ログインに失敗しました");
      return;
    }

    const data = await response.json();
    console.log("ログイン成功:", data);

    // 必要に応じてuser_idなどを保存（例: localStorage）
    localStorage.setItem("user_id", data.user_id);

    // メニュー画面へ遷移
    router.push("/menu");
  } catch (error) {
    console.error("ログインエラー:", error);
    alert("ログイン中にエラーが発生しました");
  }
};


  const handleNavigateRegister = () => {
    router.push("/register");
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.logo}>Serendi<span>Go</span></h1>
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
