import { useState } from "react";
import { useRouter } from "next/router";
import { registerUser } from "@/lib/api";  // からちゃん追加
import Image from "next/image";
import styles from "../styles/register.module.css";

export default function Register() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [gender, setGender] = useState("女性");
  const [age, setAge] = useState("20代");
  const [agreed, setAgreed] = useState(false);

  // からちゃん追記（API連携部分）
const handleRegister = async () => {
  if (!agreed) {
    alert("利用規約に同意してください。");
    return;
  }

  try {
    await registerUser({
      email,
      password,
      name,
      gender,
      age_group: age,
    });

    alert("登録が完了しました！");
    router.push("/login"); // ログインページに遷移
  } catch (error: any) {
    console.error(error);
    alert(error.message || "登録に失敗しました");
  }
};

  const handleNavigateLogin = () => {
    router.push("/login");
  };

  return (
    <div className={styles.container}>
      {/* タイトル追加 */}
      <h2 className={styles.pageTitle}>ユーザー登録</h2>

      <h1 className={styles.logo}>
        Serendi<span>Go</span>
      </h1>
      <p className={styles.caption}>あなただけの特別な旅を始めましょう</p>

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
            placeholder="8文字以上で入力してください"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Image
            src={showPassword ? "/icons/eye-on.png" : "/icons/eye-off.png"}
            alt="パスワード表示切替"
            width={20}
            height={20}
            className={styles.eyeIcon}
            onClick={() => setShowPassword(!showPassword)}
          />
        </div>

        <label className={styles.label}>お名前</label>
        <input
          className={styles.input}
          type="text"
          placeholder="山田 花子"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label className={styles.label}>性別</label>
        <select
          className={styles.input}
          value={gender}
          onChange={(e) => setGender(e.target.value)}
        >
          <option>女性</option>
          <option>男性</option>
          <option>その他</option>
        </select>

        <label className={styles.label}>年齢</label>
        <select
          className={styles.input}
          value={age}
          onChange={(e) => setAge(e.target.value)}
        >
          <option>10代</option>
          <option>20代</option>
          <option>30代</option>
          <option>40代</option>
          <option>50代以上</option>
        </select>

        <div className={styles.checkboxWrapper}>
          <input
            type="checkbox"
            id="agreement"
            checked={agreed}
            onChange={() => setAgreed(!agreed)}
          />
          <label htmlFor="agreement">
            利用規約とプライバシーポリシーに同意します
          </label>
        </div>

        <button className={styles.registerButton} onClick={handleRegister}>
          アカウントを作成
        </button>
      </div>

      {/* ✅ 改行ありのログイン案内 */}
      <div className={styles.footer}>
        <p className={styles.footerText}>すでにアカウントをお持ちですか？</p>
        <span className={styles.link} onClick={handleNavigateLogin}>
          ログインはこちら
        </span>
      </div>
    </div>
  );
}
