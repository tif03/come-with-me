import axios from "axios"

const KEY = process.env.GOOGLE_PLACES_API_KEY
const BASE = "https://maps.googleapis.com/maps/api/place"

console.log("Google key loaded:", !!KEY)

export interface GooglePlace {
  placeId: string
  name: string
  rating: number
  reviewCount: number
  priceLevel: number | null
  lat: number
  lng: number
  address: string
}

// maxBudget: 0 = no limit, 1–4 maps to Google price levels
export async function textSearchPlaces(
  query: string,
  lat: number,
  lng: number,
  maxBudget: number
): Promise<GooglePlace[]> {
  const res = await axios.get(`${BASE}/textsearch/json`, {
    params: {
      query,
      location: `${lat},${lng}`,
      radius: 2000,
      key: KEY,
      ...(maxBudget > 0 && { maxprice: maxBudget }),
    },
  })

  if (res.data.status !== "OK" && res.data.status !== "ZERO_RESULTS") {
    throw new Error(`Google Places error: ${res.data.status}`)
  }

  return (res.data.results ?? []).slice(0, 10).map((p: any) => ({
    placeId:     p.place_id,
    name:        p.name,
    rating:      p.rating ?? 0,
    reviewCount: p.user_ratings_total ?? 0,
    priceLevel:  p.price_level ?? null,
    lat:         p.geometry.location.lat,
    lng:         p.geometry.location.lng,
    address:     p.formatted_address ?? p.vicinity ?? "",
  }))
}
