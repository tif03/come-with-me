import { Router } from "express"
import { searchPlaces, GooglePlace } from "../services/google"
import { scorePlace } from "../services/score"

const router = Router()

const CATEGORY_TYPES: Record<string, string[]> = {
  restaurants:   ["restaurant"],
  bakeryDessert: ["bakery"],
  cafeCoffee:    ["cafe"],
  barsDrinks:    ["bar"],
}

router.post("/", async (req, res) => {
  const { vibe, category, budget, lat, lng } = req.body

  const types    = CATEGORY_TYPES[category] ?? ["restaurant"]
  // budget is 0 (any) or 1–4; 0/missing means no price filter
  const maxPrice = (typeof budget === "number" && budget > 0) ? budget : 4

  try {
    const seenIds = new Set<string>()
    const allPlaces: GooglePlace[] = []

    for (const type of types) {
      const results = await searchPlaces(lat, lng, [type], maxPrice)
      for (const place of results) {
        if (!seenIds.has(place.placeId)) {
          seenIds.add(place.placeId)
          allPlaces.push(place)
        }
      }
    }

    const maxReviewCount = Math.max(...allPlaces.map(p => p.reviewCount), 1)

    const scored = allPlaces
      .map(p => scorePlace(p, vibe, maxReviewCount))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)

    res.json(scored.map((s, i) => ({
      rank: i + 1,
      name: s.google.name,
      rating: s.google.rating,
      address: s.google.address,
      priceLevel: s.google.priceLevel,
    })))
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
