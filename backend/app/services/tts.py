# app/services/tts.py
import os
import uuid
import pathlib
from typing import Tuple
from openai import OpenAI

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

        result = _client.audio.speech.create(
            model="gpt-4o-mini-tts",
            voice=voice or "alloy",
            input=text,
            format="mp3",
        )
        with open(out_path, "wb") as f:
            f.write(result.read())

        return str(out_path), url

    except Exception as e:
        # フォールバック：txt で保存（今まで通りの動作を担保）
        filename = f"{uuid.uuid4()}.txt"
        out_path = GUIDE_DIR / filename
        url = f"/media/guides/{filename}"
        try:
            out_path.write_text(text, encoding="utf-8")
        except Exception:
            # 万一 filesystem エラーでも確実に返す
            pass
        return str(out_path), url
