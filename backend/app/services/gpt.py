# app/services/gpt.py
import os
from typing import Optional, Dict, Any
from openai import OpenAI
from anyio import to_thread  # 同期APIを非ブロッキングで呼ぶため

# ---- 設定 ----
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY が設定されていません。.env を確認してください。")

MODEL_TEXT = os.getenv("OPENAI_TEXT_MODEL", "gpt-4o-mini")  # 必要なら .env で上書き可

client = OpenAI(api_key=OPENAI_API_KEY)

def _compose_prompt(
    name: str,
    address: str,
    lat: float | None,
    lng: float | None,
    style: str = "friendly",
    user: Optional[Dict[str, Any]] = None,
) -> str:
    tone = {
        "friendly": "親しみやすく、やさしい日本語で",
        "energetic": "元気でワクワクする語り口で",
        "calm": "落ち着いた語り口で",
    }.get(style, "親しみやすく、やさしい日本語で")

    audience = ""
    if user:
        age = user.get("age")
        gender = user.get("gender")
        interests = user.get("interests")
        if isinstance(interests, (list, tuple)):
            interests = "、".join([str(x) for x in interests])
        audience = f"\n- 想定読者: 年齢={age}, 性別={gender}, 興味={interests}"

    return (
        "あなたは観光ガイドです。"
        f"{tone}、1〜2分（200〜400字）程度のスピーチ台本を作成してください。\n"
        "構成は【概要→見どころ→歴史/豆知識→おすすめの楽しみ方→アクセス/注意点】。\n"
        "事実ベースで、固有名詞や数字はできるだけ具体的に。誇張は避けてください。\n"
        f"- 場所名: {name}\n"
        f"- 住所: {address}\n"
        f"- 座標: {lat}, {lng}\n"
        f"{audience}"
    )

# ---- 旧API互換（必要なら残す）----
def generate_guide(name: str, address: str, age: int, gender: str, interests: list[str]) -> str:
    interests_str = "、".join(interests)
    prompt = (
        "あなたは観光ガイドです。"
        f"{age}歳の{gender}向けに、興味が「{interests_str}」であることを考慮して、"
        f"{name}（所在地：{address}）を楽しく300文字程度で紹介してください。"
    )
    resp = client.chat.completions.create(
        model=MODEL_TEXT,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.8,
    )
    return (resp.choices[0].message.content or "").strip()

# ---- visits.py から await で呼ばれるエントリ ----
async def generate_guide_text(
    name: str,
    address: str,
    lat: float | None,
    lng: float | None,
    style: str = "friendly",
    user: Optional[dict] = None,
) -> str:
    prompt = _compose_prompt(name=name, address=address, lat=lat, lng=lng, style=style, user=user)

    # デバッグ: 実際のプロンプトが使われているかを確認（必要なら削除OK）
    print("GPT: generate_guide_text CALLED")
    print("GPT PROMPT >>", prompt[:300].replace("\n", " "))

    def _call_openai():
        return client.chat.completions.create(
            model=MODEL_TEXT,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "あなたは旅先を案内する熟練の観光ガイドです。以下を厳守："
                        "1) 400〜600字のスピーチ台本。"
                        "2) 見出し『概要』『見どころ』『歴史・豆知識』『おすすめ』『アクセス・注意点』を必ず含める。"
                        "3) 作り話や推測の断定は禁止。事実ベースで固有名詞と数字を具体的に。"
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.6,
        )

    # 同期APIをスレッドで実行してイベントループを塞がない
    resp = await to_thread.run_sync(_call_openai)

    text = (resp.choices[0].message.content or "").strip()
    print("GPT OK len=", len(text))
    return text
