import axios from "axios"

const KEY = process.env.YELP_API_KEY
const BASE = "https://api.yelp.com/v3"

const yelp = axios.create({
  baseURL: BASE,
  headers: { Authorization: `Bearer ${KEY}` },
})

export interface YelpBusiness {
  id: string
  name: string
  rating: number
  reviewCount: number
  price: string | null
}

async function searchYelp(
  name: string,
  lat: number,
  lng: number
): Promise<any | null> {
  try {
    const res = await yelp.get("/businesses/search", {
      params: {
        term: name,
        latitude: lat,
        longitude: lng,
        limit: 1,
        radius: 500,
      },
    })
    return res.data.businesses?.[0] ?? null
  } catch {
    return null
  }
}

function isNameMatch(googleName: string, yelpName: string): boolean {
  const a = googleName.toLowerCase()
  const b = yelpName.toLowerCase()

  if (a === b || a.includes(b) || b.includes(a)) return true

  const wordsA = a.split(" ")
  const wordsB = b.split(" ")
  const shared = wordsA.filter(w => wordsB.includes(w))
  return shared.length >= Math.min(wordsA.length, wordsB.length) / 2
}

export async function findYelpMatch(
  name: string,
  lat: number,
  lng: number
): Promise<YelpBusiness | null> {
  const match = await searchYelp(name, lat, lng)

  if (!match) return null
  if (!isNameMatch(name, match.name)) return null

  return {
    id: match.id,
    name: match.name,
    rating: match.rating,
    reviewCount: match.review_count,
    price: match.price ?? null,
  }
}