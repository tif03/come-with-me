import { GooglePlace } from "./google"
import { YelpBusiness } from "./yelp"

const VIBE_TAGS: Record<string, string[]> = {
  cafe:           ["cozy", "aesthetic", "chill", "lowkey"],
  coffee_shop:    ["cozy", "aesthetic", "chill", "lowkey"],
  bar:            ["vibey", "chaotic", "social"],
  rooftop_bar:    ["romantic", "elevated", "aesthetic"],
  park:           ["chill", "lowkey", "romantic", "low-energy"],
  art_gallery:    ["aesthetic", "chill", "intellectual"],
  night_market:   ["chaotic", "vibey", "aesthetic"],
  arcade:         ["chaotic", "fun", "casual"],
  restaurant:     ["romantic", "chill", "social"],
  dessert:        ["aesthetic", "cozy", "fun"],
  bakery:         ["cozy", "aesthetic", "lowkey"],
  museum:         ["intellectual", "aesthetic", "chill"],
  shopping_mall:  ["chaotic", "casual", "social"],
  spa:            ["low-energy", "romantic", "chill"],
  movie_theater:  ["chill", "casual", "low-energy"],
}

interface WeightProfile {
  rating: number
  reviewCount: number
  vibeMatch: number
  viral: number
}

const WEIGHT_PROFILES: Record<string, WeightProfile> = {
  romantic:   { rating: 0.35, reviewCount: 0.10, vibeMatch: 0.45, viral: 0.10 },
  aesthetic:  { rating: 0.20, reviewCount: 0.10, vibeMatch: 0.35, viral: 0.35 },
  chaotic:    { rating: 0.10, reviewCount: 0.20, vibeMatch: 0.20, viral: 0.50 },
  chill:      { rating: 0.35, reviewCount: 0.20, vibeMatch: 0.35, viral: 0.10 },
  lowEnergy:  { rating: 0.40, reviewCount: 0.10, vibeMatch: 0.40, viral: 0.10 },
}

function ratingScore(google: GooglePlace, yelp: YelpBusiness | null): number {
  if (yelp) {
    return (google.rating / 5) * 0.4 + (yelp.rating / 5) * 0.6
  }
  return google.rating / 5
}

function reviewCountScore(
  google: GooglePlace,
  yelp: YelpBusiness | null,
  maxReviewCount: number
): number {
  const count = yelp
    ? Math.max(google.reviewCount, yelp.reviewCount)
    : google.reviewCount
  return Math.log(count + 1) / Math.log(maxReviewCount + 1)
}

function vibeMatchScore(types: string[], vibeTags: string[]): number {
  if (!vibeTags.length) return 0
  const placeTags = types.flatMap(t => VIBE_TAGS[t] ?? [])
  const matches = vibeTags.filter(t => placeTags.includes(t))
  return matches.length / vibeTags.length
}

function viralScore(google: GooglePlace): number {
  if (google.reviewCount < 50) return 0.8
  if (google.reviewCount < 200) return 0.6
  if (google.reviewCount < 1000) return 0.4
  return 0.2
}

export interface ScoredPlace {
  google: GooglePlace
  yelp: YelpBusiness | null
  score: number
  yelpEnriched: boolean
}

export function scorePlace(
  google: GooglePlace,
  yelp: YelpBusiness | null,
  vibeTags: string[],
  vibe: string,
  maxReviewCount: number
): ScoredPlace {
  const w: WeightProfile = (WEIGHT_PROFILES[vibe] ?? WEIGHT_PROFILES.chill) as WeightProfile

  const signals = {
    rating:      ratingScore(google, yelp),
    reviewCount: reviewCountScore(google, yelp, maxReviewCount),
    vibeMatch:   vibeMatchScore(google.types, vibeTags),
    viral:       viralScore(google),
  }

  const score =
    w.rating      * signals.rating      +
    w.reviewCount * signals.reviewCount +
    w.vibeMatch   * signals.vibeMatch   +
    w.viral       * signals.viral

  return { google, yelp, score, yelpEnriched: yelp !== null }
}