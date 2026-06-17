import { Router } from "express"
import { textSearchPlaces } from "../services/google"

const router = Router()

router.post("/", async (req, res) => {
  const { query, budget, lat, lng } = req.body

  if (!query?.trim()) {
    res.status(400).json({ error: "query is required" })
    return
  }

  try {
    const places = await textSearchPlaces(query, lat, lng, budget ?? 0)

    res.json(places.map((p, i) => ({
      rank:       i + 1,
      name:       p.name,
      rating:     p.rating,
      address:    p.address,
      priceLevel: p.priceLevel,
      lat:        p.lat,
      lng:        p.lng,
    })))
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
