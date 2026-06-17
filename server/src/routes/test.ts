import { Router } from "express"
import { textSearchPlaces } from "../services/google"

const router = Router()

router.get("/google", async (req, res) => {
  try {
    const places = await textSearchPlaces("cafe with matcha", 40.7128, -74.0060, 0)
    res.json(places)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
