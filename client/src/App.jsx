import { useState, useEffect, useRef } from 'react'
import './App.css'

const BUDGET_LABELS = ['any', '$', '$$', '$$$', '$$$$']

// Thumb is 20px wide; its center travels from 10px to (W-10px).
// Tick i of 4 lands at: calc(i*25% + (10 - i*5)px)
// Fill width to thumb center: same formula applied to current value.
const THUMB_R = 10 // half of 20px thumb

function BudgetSlider({ value, onChange }) {
  const fillWidth = `calc(${value * 25}% + ${THUMB_R - value * THUMB_R / 2}px)`

  return (
    <div className="toggle-group">
      <p className="toggle-label">
        budget?&nbsp;
        <span className="budget-value">
          {value === 0 ? 'no limit' : BUDGET_LABELS[value] + ' and under'}
        </span>
      </p>
      <div className="budget-slider-wrap">
        <div className="budget-track-bg">
          {value > 0 && <div className="budget-track-fill" style={{ width: fillWidth }} />}
        </div>
        <input
          type="range"
          min={0}
          max={4}
          step={1}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="budget-slider"
        />
        <div className="budget-ticks">
          {BUDGET_LABELS.map((label, i) => (
            <span
              key={i}
              className={`budget-tick ${value > 0 && i <= value ? 'active' : ''}`}
              style={{ left: `calc(${i * 25}% + ${THUMB_R - i * (THUMB_R / 2)}px)` }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function MiniMap({ lat, lng, name }) {
  const ref = useRef(null)

  useEffect(() => {
    const cancel = whenMapsReady(() => {
      if (!ref.current) return
      const map = new window.google.maps.Map(ref.current, {
        center: { lat, lng },
        zoom: 15,
        disableDefaultUI: true,
        gestureHandling: 'none',
        zoomControl: false,
        styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
      })
      new window.google.maps.Marker({ position: { lat, lng }, map, title: name })
    })
    return cancel
  }, [lat, lng, name])

  return <div ref={ref} className="result-mini-map" />
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
  const [query, setQuery]         = useState('')
  const [budget, setBudget]       = useState(0)
  const [results, setResults]     = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [mapCoords, setMapCoords] = useState(null)
  const [openResult, setOpenResult] = useState(null)

  const canSearch = !!(query.trim() && mapCoords)

  async function fetchResults(lat, lng) {
    try {
      const res = await fetch('http://localhost:3001/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, budget, lat, lng }),
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

        <div className="toggle-group">
          <p className="toggle-label">what's the vibe?</p>
          <textarea
            className="vibe-input"
            placeholder="e.g. cafe with matcha or coffee and space to sit and study"
            value={query}
            onChange={e => setQuery(e.target.value)}
            rows={3}
          />
        </div>
        <BudgetSlider value={budget} onChange={setBudget} />
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
          {results.map((place) => {
            const isOpen = openResult === place.rank
            return (
              <li key={place.rank} className="result-item">
                <div
                  className="result-header"
                  onClick={() => setOpenResult(isOpen ? null : place.rank)}
                >
                  <div className="result-header-text">
                    <div className="result-name">{place.name}</div>
                    <div className="result-meta">
                      {place.rating > 0 && (
                        <span className="result-rating">★ {place.rating.toFixed(1)}</span>
                      )}
                      {place.priceLevel && (
                        <span className="result-price">{'$'.repeat(place.priceLevel)}</span>
                      )}
                    </div>
                  </div>
                  <svg
                    className={`result-chevron ${isOpen ? 'open' : ''}`}
                    width="16" height="16" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
                {isOpen && (
                  <div className="result-expanded">
                    <span className="result-address">{place.address}</span>
                    <MiniMap lat={place.lat} lng={place.lng} name={place.name} />
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

export default App
