import axios from "axios"

const KEY = process.env.GOOGLE_PLACES_API_KEY
const BASE = "https://maps.googleapis.com/maps/api/place"

console.log("Google key loaded:", !!KEY)  // logs true/false without exposing the key

export interface GooglePlace {
  placeId: string
  name: string
  rating: number
  reviewCount: number
  priceLevel: number | null
  types: string[]
  lat: number
  lng: number
  address: string
}

export async function searchPlaces(
  lat: number,
  lng: number,
  placeTypes: string[]
): Promise<GooglePlace[]> {
  const type = placeTypes[0] ?? "restaurant"

  const res = await axios.get(`${BASE}/nearbysearch/json`, {
    params: {
      location: `${lat},${lng}`,
      radius: 2000,
      type,
      key: KEY,
    },
  })

  if (res.data.status !== "OK") {
    throw new Error(`Google Places error: ${res.data.status}`)
  }

  return res.data.results.map((p: any) => ({
    placeId: p.place_id,
    name: p.name,
    rating: p.rating ?? 0,
    reviewCount: p.user_ratings_total ?? 0,
    priceLevel: p.price_level ?? null,
    types: p.types ?? [],
    lat: p.geometry.location.lat,
    lng: p.geometry.location.lng,
    address: p.vicinity ?? "",
  }))
}