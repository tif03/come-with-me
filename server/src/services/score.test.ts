import { describe, it, expect } from "vitest"
import {
  ratingScore,
  reviewCountScore,
  vibeMatchScore,
  viralScore,
  scorePlace,
} from "./score"
import type { GooglePlace } from "./google"

function makePlace(overrides: Partial<GooglePlace> = {}): GooglePlace {
  return {
    placeId:     "test-id",
    name:        "Test Place",
    rating:      4.0,
    reviewCount: 100,
    priceLevel:  2,
    photoCount:  5,
    types:       ["restaurant"],
    lat:         40.7128,
    lng:         -74.006,
    address:     "123 Test St",
    ...overrides,
  }
}

// ─────────────────────────────────────────────
// ratingScore
// ─────────────────────────────────────────────
describe("ratingScore", () => {
  it("returns 1.0 for a perfect 5 rating", () => {
    expect(ratingScore(makePlace({ rating: 5 }))).toBe(1.0)
  })

  it("returns 0 for a 0 rating", () => {
    expect(ratingScore(makePlace({ rating: 0 }))).toBe(0)
  })

  it("returns 0.5 for a 2.5 rating", () => {
    expect(ratingScore(makePlace({ rating: 2.5 }))).toBe(0.5)
  })
})

// ─────────────────────────────────────────────
// reviewCountScore
// ─────────────────────────────────────────────
describe("reviewCountScore", () => {
  it("returns 1.0 when review count equals the max", () => {
    expect(reviewCountScore(makePlace({ reviewCount: 500 }), 500)).toBe(1.0)
  })

  it("returns 0 for 0 reviews", () => {
    expect(reviewCountScore(makePlace({ reviewCount: 0 }), 500)).toBe(0)
  })

  it("scores above 0.5 for half the max reviews (log curve, not linear)", () => {
    const score = reviewCountScore(makePlace({ reviewCount: 500 }), 1000)
    expect(score).toBeGreaterThan(0.5)
  })
})

// ─────────────────────────────────────────────
// vibeMatchScore
// ─────────────────────────────────────────────
describe("vibeMatchScore", () => {
  it("aesthetic: high photo count scores higher than low photo count", () => {
    const photogenic = makePlace({ photoCount: 10, rating: 4.5 })
    const sparse     = makePlace({ photoCount: 0,  rating: 4.5 })
    expect(vibeMatchScore(photogenic, "aesthetic")).toBeGreaterThan(vibeMatchScore(sparse, "aesthetic"))
  })

  it("romantic: upscale place scores higher than cheap place", () => {
    const upscale = makePlace({ priceLevel: 4, rating: 4.5 })
    const cheap   = makePlace({ priceLevel: 1, rating: 4.5 })
    expect(vibeMatchScore(upscale, "romantic")).toBeGreaterThan(vibeMatchScore(cheap, "romantic"))
  })

  it("chaotic: popular place scores higher than hidden gem", () => {
    const popular = makePlace({ reviewCount: 2000 })
    const hidden  = makePlace({ reviewCount: 10 })
    expect(vibeMatchScore(popular, "chaotic")).toBeGreaterThan(vibeMatchScore(hidden, "chaotic"))
  })

  it("returns a value between 0 and 1 for all vibes", () => {
    const place = makePlace()
    for (const vibe of ["romantic", "aesthetic", "chaotic", "chill", "unknown"]) {
      const score = vibeMatchScore(place, vibe)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(1)
    }
  })

  it("does not crash for null priceLevel", () => {
    const place = makePlace({ priceLevel: null })
    expect(() => vibeMatchScore(place, "romantic")).not.toThrow()
  })
})

// ─────────────────────────────────────────────
// viralScore
// ─────────────────────────────────────────────
describe("viralScore", () => {
  it("returns 0.8 for under 50 reviews", () => {
    expect(viralScore(makePlace({ reviewCount: 30 }))).toBe(0.8)
  })

  it("returns 0.6 for 50–199 reviews", () => {
    expect(viralScore(makePlace({ reviewCount: 100 }))).toBe(0.6)
  })

  it("returns 0.4 for 200–999 reviews", () => {
    expect(viralScore(makePlace({ reviewCount: 500 }))).toBe(0.4)
  })

  it("returns 0.2 for 1000+ reviews", () => {
    expect(viralScore(makePlace({ reviewCount: 5000 }))).toBe(0.2)
  })

  it("returns 0.6 at exactly 50 reviews (not 0.8)", () => {
    expect(viralScore(makePlace({ reviewCount: 50 }))).toBe(0.6)
  })

  it("returns 0.4 at exactly 200 reviews (not 0.6)", () => {
    expect(viralScore(makePlace({ reviewCount: 200 }))).toBe(0.4)
  })

  it("returns 0.2 at exactly 1000 reviews (not 0.4)", () => {
    expect(viralScore(makePlace({ reviewCount: 1000 }))).toBe(0.2)
  })
})

// ─────────────────────────────────────────────
// scorePlace
// ─────────────────────────────────────────────
describe("scorePlace", () => {
  it("always returns a score between 0 and 1", () => {
    const result = scorePlace(makePlace(), "chill", 1000)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(1)
  })

  it("returns the same score for the same inputs (deterministic)", () => {
    const place = makePlace()
    const a = scorePlace(place, "chill", 1000)
    const b = scorePlace(place, "chill", 1000)
    expect(a.score).toBe(b.score)
  })

  it("aesthetic: a restaurant with many photos scores as well as a dessert place with many photos", () => {
    // both have the same signals — type should not be a gating factor
    const restaurant = makePlace({ photoCount: 10, rating: 4.5, reviewCount: 200, types: ["restaurant"] })
    const dessert    = makePlace({ photoCount: 10, rating: 4.5, reviewCount: 200, types: ["dessert"] })
    expect(scorePlace(restaurant, "aesthetic", 200).score).toBe(scorePlace(dessert, "aesthetic", 200).score)
  })

  it("chaotic: new place with few reviews outscores a popular place with higher rating", () => {
    const newPlace     = makePlace({ reviewCount: 30,   rating: 3.8 })
    const popularPlace = makePlace({ reviewCount: 2000, rating: 4.5 })
    expect(scorePlace(newPlace, "chaotic", 2000).score).toBeGreaterThan(scorePlace(popularPlace, "chaotic", 2000).score)
  })

  it("romantic: upscale well-rated place outscores a cheap place regardless of type", () => {
    const upscale = makePlace({ priceLevel: 4, rating: 4.8, types: ["restaurant"] })
    const cheap   = makePlace({ priceLevel: 1, rating: 4.0, types: ["restaurant"] })
    expect(scorePlace(upscale, "romantic", 200).score).toBeGreaterThan(scorePlace(cheap, "romantic", 200).score)
  })

  it("falls back to chill weights for an unknown vibe without crashing", () => {
    const place = makePlace()
    expect(() => scorePlace(place, "spooky", 1000)).not.toThrow()
  })
})
