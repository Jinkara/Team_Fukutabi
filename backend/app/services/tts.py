# app/services/tts.py
import os
import uuid
import pathlib
import re  # ←追加
from typing import Tuple
from openai import OpenAI

def clean_guide_text_for_tts(text: str) -> str:
    """
    TTS用にガイドテキストを整形する（改行/句読点/見出し/座標除去など）
    """
    text = re.sub(r'^#+\s*', '', text, flags=re.MULTILINE)  # 見出し削除
    text = re.sub(r'。', '。 ', text)  # 読点の間にスペースを追加（読みやすさ）
    text = re.sub(r'、', '、 ', text)
    text = re.sub(r'\n+', '\n', text)  # 連続改行の整理
    text = re.sub(r'(\d+\.\d+)', '数値情報', text)  # 座標などの読み飛ばし対策
    text = re.sub(r'[0-9０-９]{3}-[0-9０-９]{4}', '郵便番号', text)  # 郵便番号除去
    text = re.sub(r'\s+', ' ', text)  # 余分なスペースを削除

    return text

MEDIA_DIR = os.getenv("MEDIA_ROOT", "./media")
GUIDE_DIR = pathlib.Path(MEDIA_DIR) / "guides"
GUIDE_DIR.mkdir(parents=True, exist_ok=True)

_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def synthesize_to_mp3(text: str, voice: str | None = None) -> Tuple[str, str]:
    """
    テキストをMP3に変換して保存。
    戻り値: (local_file_path, public_url)
    - 失敗時は .txt を保存して必ずURLを返す（既存互換）
    """
    # まずは本命：TTSで mp3 を吐く
    try:
        filename = f"{uuid.uuid4()}.mp3"
        out_path = GUIDE_DIR / filename
        url = f"/media/guides/{filename}"

        cleaned_text = clean_guide_text_for_tts(text)  # ← ここで整形！

        result = _client.audio.speech.create(
            model="tts-1",
            voice=voice or "alloy",
            input=cleaned_text,
            response_format="mp3",
        )
        with open(out_path, "wb") as f:
            f.write(result.read())

        return str(out_path), url

    except Exception as e:
        # フォールバック：txt で保存（今まで通りの動作を担保）
        print("TTS ERROR:", repr(e))
        filename = f"{uuid.uuid4()}.txt"
        out_path = GUIDE_DIR / filename
        url = f"/media/guides/{filename}"
        try:
            out_path.write_text(text, encoding="utf-8")
        except Exception:
            # 万一 filesystem エラーでも確実に返す
            pass
        return str(out_path), url
