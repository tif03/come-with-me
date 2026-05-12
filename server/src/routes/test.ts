import { Router } from "express"
import { searchPlaces } from "../services/google"
import { findYelpMatch } from "../services/yelp"

const router = Router()

// test google places search
// hit: GET localhost:3001/api/test/google
router.get("/google", async (req, res) => {
  try {
    const places = await searchPlaces(40.7128, -74.0060, ["cafe"])
    res.json(places)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// test yelp match on a real place from your google results
// hit: GET localhost:3001/api/test/yelp
router.get("/yelp", async (req, res) => {
  try {
    const match = await findYelpMatch("Dominique Ansel Bakery", 40.7128, -74.0060)
    res.json(match)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.get("/yelp-debug", async (req, res) => {
  try {
    const { default: axios } = await import("axios")
    const res2 = await axios.get("https://api.yelp.com/v3/businesses/search", {
      headers: { Authorization: `Bearer ${process.env.YELP_API_KEY}` },
      params: {
        term: "Dominique Ansel Bakery",
        latitude: 40.7252509,
        longitude: -74.0028734,
        limit: 3,
        radius: 500,  // loosen to 500m
      },
    })
    res.json(res2.data)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router