// frontend/pages/api/predictions.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const input = req.query.input as string

  if (!input) {
    return res.status(400).json({ error: 'Missing input parameter' })
  }

  try {
    // 自前FastAPIのエンドポイント
    const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

    const predRes = await axios.get(`${baseURL}/places/predictions`, {
      params: {
        input,
        limit: 5,
      },
    })

    const predictions = predRes.data.items

    // バックエンドの `/places/details` を使ってtypeを精査
    const validTypes = [
      'tourist_attraction',
      'park',
      'museum',
      'natural_feature',
      'point_of_interest',
      'establishment',
    ]

    const filtered = await Promise.all(
      predictions.map(async (p: any) => {
        const detailsRes = await axios.get(`${baseURL}/places/details`, {
          params: {
            place_id: p.placeId,
          },
        })

        const types = detailsRes.data.types || []
        const isValid = types.some((t: string) => validTypes.includes(t))
        return isValid ? p : null
      })
    )

    res.status(200).json(filtered.filter(Boolean))
  } catch (error) {
    console.error('Prediction fetch error:', error)
    res.status(500).json({ error: 'Failed to fetch predictions' })
  }
}
