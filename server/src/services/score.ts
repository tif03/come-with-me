import { GooglePlace } from "./google"

const VIBE_TAGS: Record<string, string[]> = {
  cafe:           ["cozy", "aesthetic", "chill", "lowkey"],
  coffee_shop:    ["cozy", "aesthetic", "chill", "lowkey"],
  restaurant:     ["romantic", "chill", "social"],
  meal_takeaway:  ["casual", "lowkey", "chill"],
  food:           ["social", "chill", "chaotic"],
  bar:            ["vibey", "chaotic", "social"],
  night_club:     ["chaotic", "vibey", "social"],
  night_market:   ["chaotic", "vibey", "aesthetic"],
  dessert:        ["aesthetic", "cozy", "fun"],
  bakery:         ["cozy", "aesthetic", "lowkey"],
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

export function ratingScore(google: GooglePlace): number {
  return google.rating / 5
}

export function reviewCountScore(google: GooglePlace, maxReviewCount: number): number {
  return Math.log(google.reviewCount + 1) / Math.log(maxReviewCount + 1)
}

export function vibeMatchScore(types: string[], vibeTags: string[]): number {
  if (!vibeTags.length) return 0
  const placeTags = types.flatMap(t => VIBE_TAGS[t] ?? [])
  const matches = vibeTags.filter(t => placeTags.includes(t))
  return matches.length / vibeTags.length
}

export function viralScore(google: GooglePlace): number {
  if (google.reviewCount < 50) return 0.8
  if (google.reviewCount < 200) return 0.6
  if (google.reviewCount < 1000) return 0.4
  return 0.2
}

export interface ScoredPlace {
  google: GooglePlace
  score: number
}

export function scorePlace(
  google: GooglePlace,
  vibeTags: string[],
  vibe: string,
  maxReviewCount: number
): ScoredPlace {
  const w: WeightProfile = (WEIGHT_PROFILES[vibe] ?? WEIGHT_PROFILES.chill) as WeightProfile

  const signals = {
    rating:      ratingScore(google),
    reviewCount: reviewCountScore(google, maxReviewCount),
    vibeMatch:   vibeMatchScore(google.types, vibeTags),
    viral:       viralScore(google),
  }

  const score =
    w.rating      * signals.rating      +
    w.reviewCount * signals.reviewCount +
    w.vibeMatch   * signals.vibeMatch   +
    w.viral       * signals.viral

  return { google, score }
}