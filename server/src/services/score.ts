import { GooglePlace } from "./google"

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
}

export function ratingScore(google: GooglePlace): number {
  return google.rating / 5
}

export function reviewCountScore(google: GooglePlace, maxReviewCount: number): number {
  return Math.log(google.reviewCount + 1) / Math.log(maxReviewCount + 1)
}

// Infers how well a place matches a vibe from observable signals:
// photo count, price level, rating, and review volume — no hardcoded type mappings.
export function vibeMatchScore(place: GooglePlace, vibe: string): number {
  const { rating, reviewCount, priceLevel, photoCount } = place

  // normalized 0–1 helpers
  const photoSignal  = Math.min(photoCount / 10, 1)          // saturates at 10 photos
  const popularPlace = Math.min(Math.log(reviewCount + 1) / Math.log(2001), 1)
  const hiddenGem    = 1 - popularPlace
  const price        = (priceLevel ?? 2) / 4                 // 0.25–1.0, null → mid
  const highRating   = Math.max(0, (rating - 3.5) / 1.5)    // 0 below 3.5, 1 at 5.0

  switch (vibe) {
    case "romantic":
      // upscale, well-rated, not a tourist trap
      return 0.5 * price + 0.3 * highRating + 0.2 * hiddenGem

    case "aesthetic":
      // lots of photos → people find it worth photographing
      return 0.6 * photoSignal + 0.25 * highRating + 0.15 * price

    case "chaotic":
      // busy, buzzing, lots of people
      return 0.6 * popularPlace + 0.3 * (1 - price) + 0.1 * photoSignal

    case "chill":
      // well-rated but not hectic; mid-price
      return 0.4 * highRating + 0.35 * hiddenGem + 0.25 * (1 - price)

    default:
      return 0.4 * highRating + 0.3 * hiddenGem + 0.3 * (1 - price)
  }
}

export function viralScore(google: GooglePlace): number {
  if (google.reviewCount < 50)   return 0.8
  if (google.reviewCount < 200)  return 0.6
  if (google.reviewCount < 1000) return 0.4
  return 0.2
}

export interface ScoredPlace {
  google: GooglePlace
  score: number
}

export function scorePlace(
  google: GooglePlace,
  vibe: string,
  maxReviewCount: number
): ScoredPlace {
  const w: WeightProfile = (WEIGHT_PROFILES[vibe] ?? WEIGHT_PROFILES.chill) as WeightProfile

  const signals = {
    rating:      ratingScore(google),
    reviewCount: reviewCountScore(google, maxReviewCount),
    vibeMatch:   vibeMatchScore(google, vibe),
    viral:       viralScore(google),
  }

  const score =
    w.rating      * signals.rating      +
    w.reviewCount * signals.reviewCount +
    w.vibeMatch   * signals.vibeMatch   +
    w.viral       * signals.viral

  return { google, score }
}
