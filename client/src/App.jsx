import { useState } from 'react'
import './App.css'

const CATEGORIES = [
  { id: 'restaurants',   label: 'Restaurants' },
  { id: 'bakeryDessert', label: 'Bakery & Dessert' },
  { id: 'cafeCoffee',    label: 'Cafe & Coffee' },
  { id: 'barsDrinks',    label: 'Bars & Drinks' },
]

const VIBES = [
  { id: 'romantic',  label: 'Romantic' },
  { id: 'aesthetic', label: 'Aesthetic' },
  { id: 'chaotic',   label: 'Chaotic' },
  { id: 'chill',     label: 'Chill' },
  { id: 'lowEnergy', label: 'Low Energy' },
]

const BUDGETS = [
  { id: '$',    label: '$' },
  { id: '$$',   label: '$$' },
  { id: '$$$',  label: '$$$' },
  { id: '$$$$', label: '$$$$' },
]

function ToggleGroup({ label, options, value, onChange }) {
  return (
    <div className="toggle-group">
      <p className="toggle-label">{label}</p>
      <div className="toggle-options">
        {options.map(opt => (
          <button
            key={opt.id}
            className={`toggle-btn ${value === opt.id ? 'active' : ''}`}
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function App() {
  const [category, setCategory] = useState(null)
  const [vibe, setVibe]         = useState(null)
  const [budget, setBudget]     = useState(null)
  const [results, setResults]   = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  const canSearch = category && vibe && budget

  async function handleSearch() {
    if (!canSearch) return
    setLoading(true)
    setError(null)
    setResults(null)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch('http://localhost:3001/api/plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              category,
              vibe,
              budget,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
          setResults(data)
        } catch (err) {
          setError(err.message)
        } finally {
          setLoading(false)
        }
      },
      () => {
        setError('Location access denied. Please allow location to continue.')
        setLoading(false)
      }
    )
  }

  return (
    <div className="app">
      <div className="header">
        <h1>come with me</h1>
        <p className="subtitle">find somewhere to go</p>
      </div>

      <div className="toggles">
        <ToggleGroup
          label="what are you looking for?"
          options={CATEGORIES}
          value={category}
          onChange={setCategory}
        />
        <ToggleGroup
          label="what's the vibe?"
          options={VIBES}
          value={vibe}
          onChange={setVibe}
        />
        <ToggleGroup
          label="budget?"
          options={BUDGETS}
          value={budget}
          onChange={setBudget}
        />
      </div>

      <button
        className="search-btn"
        onClick={handleSearch}
        disabled={!canSearch || loading}
      >
        {loading ? 'finding places...' : 'find places near me'}
      </button>

      {error && <p className="error">{error}</p>}

      {results && results.length === 0 && (
        <p className="empty">no results found — try a different vibe or budget</p>
      )}

      {results && results.length > 0 && (
        <ol className="results">
          {results.map((place) => (
            <li key={place.rank} className="result-item">
              <span className="result-name">{place.name}</span>
              <span className="result-meta">
                <span className="result-rating">★ {place.rating.toFixed(1)}</span>
                {place.priceLevel && (
                  <span className="result-price">{'$'.repeat(place.priceLevel)}</span>
                )}
              </span>
              <span className="result-address">{place.address}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export default App
