const spineColors = [
  ['#7f3f35', '#a55b4d'], ['#254d42', '#3f6c5e'], ['#88602f', '#b2864e'],
  ['#3e5368', '#60778c'], ['#5b3f62', '#806188'], ['#8c6d4c', '#b69570'],
  ['#31483c', '#587062'], ['#8b4e2f', '#b66f49'],
]

function visualDetails(entry) {
  const seed = [...entry.books.title].reduce((sum, character) => sum + character.charCodeAt(0), 0)
  const colors = entry.spine_color
    ? [`color-mix(in srgb, ${entry.spine_color} 72%, black)`, entry.spine_color]
    : spineColors[seed % spineColors.length]
  return {
    '--spine-height': `${166 + (seed % 55)}px`,
    '--spine-width': `${42 + (seed % 17)}px`,
    '--spine-dark': colors[0],
    '--spine-light': colors[1],
    '--spine-lean': seed % 7 === 0 ? '-2deg' : seed % 11 === 0 ? '2deg' : '0deg',
  }
}

export function BookSpine({ entry, onSelect, dragging, dragTarget, onDragStart, onDragOver, onDrop, onDragEnd, onMove }) {
  const book = entry.books
  const coverUrl = entry.selected_cover_url || book.cover_medium_url
  return (
    <button
      className={`book-spine${dragging ? ' dragging' : ''}${dragTarget ? ' drag-target' : ''}`}
      style={visualDetails(entry)}
      type="button"
      draggable="true"
      onClick={() => onSelect(entry)}
      onDragStart={(event) => onDragStart(event, entry.id)}
      onDragOver={(event) => onDragOver(event, entry.id)}
      onDrop={(event) => onDrop(event, entry.id)}
      onDragEnd={onDragEnd}
      onKeyDown={(event) => {
        if (event.altKey && event.key === 'ArrowLeft') { event.preventDefault(); onMove(entry.id, -1) }
        if (event.altKey && event.key === 'ArrowRight') { event.preventDefault(); onMove(entry.id, 1) }
      }}
      aria-label={`View details for ${book.title}. Drag to reorder, or use Alt and arrow keys.`}
    >
      <span className="spine-grip" aria-hidden="true">•••</span>
      <span className="spine-band top" aria-hidden="true" />
      <span className="spine-title">{book.title}</span>
      <span className="spine-author">{book.authors?.[0] || 'Unknown'}</span>
      <span className="spine-band bottom" aria-hidden="true" />
      <span className="spine-preview" aria-hidden="true">
        {coverUrl ? <img src={coverUrl} alt="" /> : <span className="preview-fallback">{book.title}</span>}
        <strong>{book.title}</strong><small>Select for details</small>
      </span>
    </button>
  )
}
