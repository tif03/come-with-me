import { Router } from "express"
import { searchPlaces } from "../services/google"

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

export default router