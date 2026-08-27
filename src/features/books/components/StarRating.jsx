import './starRating.css'

function fillAmount(rating, starNumber) {
  return Math.max(0, Math.min(1, rating - (starNumber - 1))) * 100
}

function formatRating(value) {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)
}

export function StarRating({ value, onChange }) {
  const rating = Number(value) || 0

  return (
    <div className="star-rating-field">
      <div className="star-rating" role="group" aria-label="Your rating out of five stars">
        {[1, 2, 3, 4, 5].map((starNumber) => (
          <button
            key={starNumber}
            type="button"
            className="star-rating-button"
            onClick={() => onChange(starNumber)}
            onDoubleClick={() => onChange(starNumber - 0.5)}
            aria-label={`Rate ${starNumber} stars. Double-click for ${starNumber - 0.5} stars.`}
          >
            <span className="star-rating-outline" aria-hidden="true">★</span>
            <span
              className="star-rating-fill"
              style={{ '--star-fill': `${fillAmount(rating, starNumber)}%` }}
              aria-hidden="true"
            >★</span>
          </button>
        ))}
      </div>
      <div className="star-rating-summary" aria-live="polite">
        <span>{rating ? `${formatRating(rating)} out of 5` : 'Not rated yet'}</span>
        {rating > 0 && <button type="button" onClick={() => onChange(null)}>Clear rating</button>}
      </div>
      <p className="star-rating-help">Click for a whole star or double-click for a half star.</p>
    </div>
  )
}
