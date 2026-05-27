import { describe, it, expect } from "vitest"
import {
  ratingScore,
  reviewCountScore,
  vibeMatchScore,
  viralScore,
  scorePlace,
} from "./score"
import type { GooglePlace } from "./google"

// creates a mock GooglePlace with sensible defaults so each test
// only has to specify the fields it actually cares about
function makePlace(overrides: Partial<GooglePlace> = {}): GooglePlace {
  return {
    placeId:     "test-id",
    name:        "Test Place",
    rating:      4.0,
    reviewCount: 100,
    priceLevel:  2,
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
    // if this were linear, 500/1000 would be exactly 0.5
    // log curve compresses the top end, so half the reviews still scores high (~0.9)
    const score = reviewCountScore(makePlace({ reviewCount: 500 }), 1000)
    expect(score).toBeGreaterThan(0.5)
  })
})

// ─────────────────────────────────────────────
// vibeMatchScore
// ─────────────────────────────────────────────
describe("vibeMatchScore", () => {
  it("returns 1.0 when all requested tags match", () => {
    // cafe → ["cozy", "aesthetic", "chill", "lowkey"]
    // requesting "cozy" and "aesthetic" — both present
    expect(vibeMatchScore(["cafe"], ["cozy", "aesthetic"])).toBe(1.0)
  })

  it("returns 0 when no requested tags match", () => {
    // restaurant → ["romantic", "chill", "social"]
    // requesting "vibey" and "elevated" — neither present
    expect(vibeMatchScore(["restaurant"], ["vibey", "elevated"])).toBe(0)
  })

  it("returns 0.5 for a partial match", () => {
    // cafe → ["cozy", "aesthetic", "chill", "lowkey"]
    // requesting 4 tags, 2 of which match
    expect(
      vibeMatchScore(["cafe"], ["cozy", "aesthetic", "romantic", "vibey"])
    ).toBe(0.5)
  })

  it("returns 0 for an unknown place type without crashing", () => {
    // "gym" is not in VIBE_TAGS — should return 0, not throw
    expect(vibeMatchScore(["gym"], ["cozy", "aesthetic"])).toBe(0)
  })

  it("returns 0 for an empty vibeTags array", () => {
    expect(vibeMatchScore(["cafe"], [])).toBe(0)
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

  // boundary values — tests exactly which side of each threshold a value falls on
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
    const result = scorePlace(makePlace(), ["chill", "lowkey"], "chill", 1000)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(1)
  })

  it("returns the same score for the same inputs (deterministic)", () => {
    const place = makePlace()
    const a = scorePlace(place, ["chill"], "chill", 1000)
    const b = scorePlace(place, ["chill"], "chill", 1000)
    expect(a.score).toBe(b.score)
  })

  it("chaotic vibe: new place with few reviews outscores a popular place with higher rating", () => {
    // viral weight is 0.50 for chaotic — newness dominates over rating
    const newPlace     = makePlace({ reviewCount: 30,   rating: 3.8, types: ["bar"] })
    const popularPlace = makePlace({ reviewCount: 2000, rating: 4.5, types: ["bar"] })
    const vibeTags     = ["chaotic", "social", "vibey"]

    const newScore     = scorePlace(newPlace,     vibeTags, "chaotic", 2000)
    const popularScore = scorePlace(popularPlace, vibeTags, "chaotic", 2000)

    expect(newScore.score).toBeGreaterThan(popularScore.score)
  })

  it("lowEnergy vibe: higher rated place outscores one with more reviews but lower rating", () => {
    // rating weight is 0.40 for lowEnergy — the highest of any profile
    const highRated  = makePlace({ rating: 4.8, reviewCount: 50,   types: ["cafe"] })
    const moreReview = makePlace({ rating: 3.5, reviewCount: 5000, types: ["cafe"] })
    const vibeTags   = ["cozy", "lowkey", "chill"]

    const highScore  = scorePlace(highRated,  vibeTags, "lowEnergy", 5000)
    const moreScore  = scorePlace(moreReview, vibeTags, "lowEnergy", 5000)

    expect(highScore.score).toBeGreaterThan(moreScore.score)
  })

  it("romantic vibe: place with matching vibe tags outscores one without", () => {
    // vibeMatch weight is 0.45 for romantic — the highest signal
    // restaurant → ["romantic","chill","social"] — matches "romantic"
    // bar        → ["vibey","chaotic","social"]  — does not match "romantic"
    const romanticPlace    = makePlace({ rating: 4.0, reviewCount: 200, types: ["restaurant"] })
    const nonRomanticPlace = makePlace({ rating: 4.0, reviewCount: 200, types: ["bar"] })
    const vibeTags         = ["romantic", "cozy"]

    const romanticScore    = scorePlace(romanticPlace,    vibeTags, "romantic", 200)
    const nonRomanticScore = scorePlace(nonRomanticPlace, vibeTags, "romantic", 200)

    expect(romanticScore.score).toBeGreaterThan(nonRomanticScore.score)
  })

  it("falls back to chill weights for an unknown vibe without crashing", () => {
    const place = makePlace()
    expect(() =>
      scorePlace(place, ["chill"], "spooky", 1000)
    ).not.toThrow()
  })
})
