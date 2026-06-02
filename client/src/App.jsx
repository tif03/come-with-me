import { useState, useEffect, useRef } from 'react'
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

function whenMapsReady(cb) {
  if (window.google?.maps?.places) { cb(); return () => {} }
  const id = setInterval(() => {
    if (window.google?.maps?.places) { clearInterval(id); cb() }
  }, 150)
  return () => clearInterval(id)
}

// Single map component with search box + locate-me button overlaid
function MapLocationPicker({ onCoordsChange }) {
  const containerRef    = useRef(null)
  const inputRef        = useRef(null)
  const mapRef          = useRef(null)
  const autocompleteRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const cancel = whenMapsReady(() => {
      if (!containerRef.current || mapRef.current) return

      const map = new window.google.maps.Map(containerRef.current, {
        zoom: 14,
        center: { lat: 40.7128, lng: -74.006 },
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
        styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
      })

      mapRef.current = map

      // Try to start on user's location
      navigator.geolocation?.getCurrentPosition(pos => {
        map.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      })

      // Report center coords on every idle
      map.addListener('idle', () => {
        const c = map.getCenter()
        onCoordsChange({ lat: c.lat(), lng: c.lng() })
      })

      // Wire up autocomplete to the search input
      if (inputRef.current) {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ['geometry', 'formatted_address', 'name'],
        })
        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current.getPlace()
          if (place.geometry?.location) {
            map.setCenter(place.geometry.location)
            map.setZoom(14)
          }
        })
      }

      setReady(true)
    })
    return cancel
  }, [])

  function handleLocateMe() {
    navigator.geolocation?.getCurrentPosition(
      pos => {
        const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        mapRef.current?.setCenter(latlng)
        mapRef.current?.setZoom(14)
      },
      () => alert('Location access denied.')
    )
  }

  return (
    <div className="map-wrapper">
      <div ref={containerRef} className="map-container" />

      {/* Search box overlay — top center */}
      <div className="map-search-overlay">
        <input
          ref={inputRef}
          className="map-search-input"
          type="text"
          placeholder="search a location..."
        />
      </div>

      {/* Locate me button — top right */}
      <button className="map-locate-btn" onClick={handleLocateMe} title="Use my location">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          <circle cx="12" cy="12" r="8" />
        </svg>
      </button>

      {/* Fixed pin at center */}
      <div className="map-crosshair" aria-hidden="true">
        <svg width="32" height="40" viewBox="0 0 32 40" fill="none">
          <path d="M16 0C9.373 0 4 5.373 4 12c0 8.25 12 28 12 28S28 20.25 28 12C28 5.373 22.627 0 16 0z" fill="var(--accent)" />
          <circle cx="16" cy="12" r="5" fill="white" />
        </svg>
      </div>

      {!ready && <div className="map-loading">loading map...</div>}
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
  const [mapCoords, setMapCoords] = useState(null)

  const canSearch = !!(category && vibe && budget && mapCoords)

  async function fetchResults(lat, lng) {
    try {
      const res = await fetch('http://localhost:3001/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, vibe, budget, lat, lng }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setResults(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch() {
    if (!canSearch) return
    setLoading(true)
    setError(null)
    setResults(null)
    fetchResults(mapCoords.lat, mapCoords.lng)
  }

  return (
    <div className="app">
      <div className="header">
        <h1>come with me</h1>
        <p className="subtitle">find somewhere to go</p>
      </div>

      <div className="toggles">
        <div className="toggle-group">
          <p className="toggle-label">where?</p>
          <MapLocationPicker onCoordsChange={setMapCoords} />
        </div>

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
        {loading ? 'finding places...' : 'search this area'}
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
