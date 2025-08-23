// frontend/pages/api/visits/register.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const placeId = (req.query.place_id as string) || (req.body?.placeId as string);
  // VisitCreate の仕様に合わせて JSON ボディで転送する
  const userId = req.body?.userId ?? null; // 必要なければ null でOK

  if (!placeId) return res.status(400).json({ error: "missing placeId" });

  try {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL;
    const resp = await fetch(`${apiBase}/visits/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // ★ FastAPI Create のスキーマ: { destinationId: int | str, userId?: number|null }
      body: JSON.stringify({ destinationId: placeId, userId }),
    });

    const data = await resp.json().catch(() => ({}));
    return res.status(resp.status).json(data);
  } catch (e) {
    console.error("visits proxy error:", e);
    return res.status(500).json({ error: "proxy_failed" });
  }
}
