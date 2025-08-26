// frontend/pages/api/predictions.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const input = req.query.input as string

  if (!input) {
    return res.status(400).json({ error: 'Missing input parameter' })
  }

  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY  // .env.localに入っている前提
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
      params: {
        input,
        key: apiKey,
        language: 'ja',
        components: 'country:jp',
      },
    })

    const predictions = response.data.predictions.map((p: any) => ({
      description: p.description,
      placeId: p.place_id,
    }))

    res.status(200).json(predictions)
  } catch (error) {
    console.error('Google Places API error:', error)
    res.status(500).json({ error: 'Failed to fetch predictions' })
  }
}
