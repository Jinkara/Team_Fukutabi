// frontend/pages/api/destinations/register.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  // /api/destinations/register?place_id=XXXX の形式でフロントから来る
  const { place_id } = req.query;
  if (!place_id || typeof place_id !== "string") {
    return res.status(400).json({ error: "place_id is required" });
  }

  try {
    const response = await fetch(
      `${process.env.API_BASE_URL}/destinations/register?place_id=${encodeURIComponent(place_id)}`,
      { method: "POST" }
    );

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error("登録失敗:", error);
    res.status(500).json({ error: "登録に失敗しました" });
  }
}
