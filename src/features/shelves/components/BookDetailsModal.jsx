import { useEffect, useState } from 'react'
import { getOpenLibraryCovers } from '../../books/api/openLibrary'
import { BookCover } from '../../books/components/BookCover'

const SPINE_COLORS = ['#8F493B', '#C07B52', '#C39A61', '#2F5D50', '#486A7C', '#665070', '#8A704A', '#37483E']

function readableStatus(status) {
  return status?.replaceAll('_', ' ') ?? 'want to read'
}

export function BookDetailsModal({ entry, categories, onCreateCategory, onClose, onSave, onRemove }) {
  const book = entry.books
  const defaultCover = entry.selected_cover_url || book.cover_large_url || book.cover_medium_url
  const [spineColor, setSpineColor] = useState(entry.spine_color || '')
  const [coverUrl, setCoverUrl] = useState(defaultCover || '')
  const [status, setStatus] = useState(entry.status || 'want_to_read')
  const [categoryIds, setCategoryIds] = useState(entry.category_ids || [])
  const [newCategory, setNewCategory] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [covers, setCovers] = useState(defaultCover ? [defaultCover] : [])
  const [loadingCovers, setLoadingCovers] = useState(Boolean(book.open_library_id))
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [confirmingRemoval, setConfirmingRemoval] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    getOpenLibraryCovers(book.open_library_id, defaultCover, controller.signal)
      .then(setCovers)
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setCovers(defaultCover ? [defaultCover] : [])
      })
      .finally(() => setLoadingCovers(false))
    return () => controller.abort()
  }, [book.open_library_id, defaultCover])

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    document.body.classList.add('modal-open')
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.body.classList.remove('modal-open')
    }
  }, [onClose])

  async function saveChanges() {
    setSaving(true)
    setError('')
    try {
      await onSave(entry.id, { spineColor: spineColor || null, coverUrl: coverUrl || null, status, categoryIds })
      onClose()
    } catch {
      setError('Your changes could not be saved. Please try again.')
      setSaving(false)
    }
  }

  function toggleCategory(categoryId) {
    setCategoryIds((current) => current.includes(categoryId) ? current.filter((id) => id !== categoryId) : [...current, categoryId])
  }

  async function addCategory(event) {
    event.preventDefault()
    const cleanName = newCategory.trim()
    if (!cleanName) return
    setCreatingCategory(true)
    setError('')
    try {
      const created = await onCreateCategory(cleanName)
      setCategoryIds((current) => [...current, created.id])
      setNewCategory('')
    } catch (categoryError) {
      setError(categoryError.code === '23505' ? 'You already have a category with that name.' : 'That category could not be created.')
    } finally {
      setCreatingCategory(false)
    }
  }

  async function removeBook() {
    setRemoving(true)
    setError('')
    try {
      await onRemove(entry.id)
      onClose()
    } catch {
      setError('This book could not be removed. Please try again.')
      setRemoving(false)
    }
  }

  return (
    <div className="book-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="book-modal" role="dialog" aria-modal="true" aria-labelledby="book-detail-title">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close book details">x</button>
        <div className="modal-cover-wrap"><BookCover src={coverUrl || defaultCover} title={book.title} size="large" /></div>
        <div className="modal-copy">
          <p className="eyebrow">{readableStatus(entry.status)}</p>
          <h2 id="book-detail-title">{book.title}</h2>
          <p className="modal-author">by {book.authors?.join(', ') || 'Unknown author'}</p>
          <dl className="book-facts">
            {book.published_date && <div><dt>Published</dt><dd>{book.published_date}</dd></div>}
            {book.publisher && <div><dt>Publisher</dt><dd>{book.publisher}</dd></div>}
            {book.page_count && <div><dt>Length</dt><dd>{book.page_count} pages</dd></div>}
            {entry.rating && <div><dt>Your rating</dt><dd>{entry.rating} / 5</dd></div>}
          </dl>
          <div className="book-description"><h3>About this book</h3><p>{book.description || 'A description is not available for this edition yet.'}</p></div>

          <div className="customize-panel">
            <h3>Organize this book</h3>
            <label className="reading-status-field">Reading section<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="want_to_read">To Be Read</option><option value="reading">Reading</option><option value="finished">Read</option><option value="did_not_finish">Did Not Finish</option></select></label>

            <fieldset className="category-picker"><legend>Custom categories</legend>
              {categories.length > 0 && <div className="category-options">{categories.map((category) => <button key={category.id} type="button" className={categoryIds.includes(category.id) ? 'selected' : ''} onClick={() => toggleCategory(category.id)} aria-pressed={categoryIds.includes(category.id)}>{category.name}</button>)}</div>}
              {categories.length === 0 && <p className="category-empty">Create a category for genres, moods, favorites, or anything else.</p>}
              <form className="new-category-form" onSubmit={addCategory}><label className="sr-only" htmlFor="new-category">New category name</label><input id="new-category" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} maxLength="50" placeholder="e.g. Cozy mysteries" /><button type="submit" disabled={creatingCategory || !newCategory.trim()}>{creatingCategory ? 'Adding...' : '+ Add'}</button></form>
            </fieldset>

            <h3 className="appearance-heading">Appearance</h3>
            <fieldset className="color-picker"><legend>Spine color</legend><div className="color-options">
              {SPINE_COLORS.map((color) => <button key={color} type="button" className={spineColor.toLowerCase() === color.toLowerCase() ? 'selected' : ''} style={{ backgroundColor: color }} onClick={() => setSpineColor(color)} aria-label={`Choose spine color ${color}`} aria-pressed={spineColor.toLowerCase() === color.toLowerCase()} />)}
              <label className="custom-color" title="Choose a custom color"><input type="color" value={spineColor || '#8F493B'} onChange={(event) => setSpineColor(event.target.value)} /><span>+</span></label>
              {spineColor && <button className="reset-color" type="button" onClick={() => setSpineColor('')}>Use automatic</button>}
            </div></fieldset>

            <fieldset className="cover-picker"><legend>Edition cover</legend>
              {loadingCovers && <p className="cover-loading">Finding available covers...</p>}
              {!loadingCovers && covers.length === 0 && <p className="cover-loading">No alternate covers were found.</p>}
              {covers.length > 0 && <div className="cover-options">{covers.map((cover) => <button key={cover} type="button" className={coverUrl === cover ? 'selected' : ''} onClick={() => setCoverUrl(cover)} aria-label="Choose this edition cover" aria-pressed={coverUrl === cover}><img src={cover} alt="" loading="lazy" /></button>)}</div>}
            </fieldset>
          </div>

          {error && <p className="customize-error" role="alert">{error}</p>}
          <div className="modal-actions">
            <button className="remove-book-button" type="button" onClick={() => setConfirmingRemoval(true)} disabled={removing || saving}>Remove from library</button>
            <button className="save-book-button" type="button" onClick={saveChanges} disabled={saving || removing}>{saving ? 'Saving...' : 'Save changes'}</button>
          </div>
          {book.source_url && <a className="source-link" href={book.source_url} target="_blank" rel="noreferrer">View catalog record at Open Library</a>}
        </div>
        {confirmingRemoval && (
          <div className="confirm-dialog-layer">
            <div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="remove-title" aria-describedby="remove-description">
              <div className="confirm-symbol" aria-hidden="true">!</div>
              <h3 id="remove-title">Remove this book?</h3>
              <p id="remove-description"><strong>{book.title}</strong> will be removed from your library, including its notes and shelf placement.</p>
              <div className="confirm-actions">
                <button type="button" onClick={() => setConfirmingRemoval(false)} disabled={removing}>Keep book</button>
                <button className="confirm-remove" type="button" onClick={removeBook} disabled={removing}>{removing ? 'Removing...' : 'Remove book'}</button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
