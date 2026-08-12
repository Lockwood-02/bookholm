import { useState } from 'react'
import { BookDetailsModal } from './BookDetailsModal'
import { BookSpine } from './BookSpine'
import { ColumnView, ListView } from './CollectionViews'
import '../shelves.css'

const BOOKS_PER_SHELF = 18

function groupIntoShelves(books) {
  const shelves = []
  for (let index = 0; index < books.length; index += BOOKS_PER_SHELF) {
    shelves.push(books.slice(index, index + BOOKS_PER_SHELF))
  }
  return shelves
}

const STATUS_FILTERS = [
  { id: 'all', name: 'All Books' },
  { id: 'want_to_read', name: 'To Be Read' },
  { id: 'reading', name: 'Reading' },
  { id: 'finished', name: 'Read' },
]

export function Bookshelf({ books, categories, loading, onFindBooks, onCustomize, onCreateCategory, onRemove, onReorder }) {
  const [selectedBook, setSelectedBook] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('bookholm-library-view') || 'shelf')
  const [draggedId, setDraggedId] = useState(null)
  const [dragTargetId, setDragTargetId] = useState(null)
  const visibleBooks = activeFilter === 'all'
    ? books
    : activeFilter.startsWith('category:')
      ? books.filter((entry) => entry.category_ids?.includes(activeFilter.replace('category:', '')))
      : books.filter((entry) => entry.status === activeFilter)
  const shelves = groupIntoShelves(visibleBooks)

  function commitVisibleOrder(nextVisibleBooks) {
    if (activeFilter === 'all') {
      onReorder(nextVisibleBooks)
      return
    }
    const orderedQueue = [...nextVisibleBooks]
    const visibleIds = new Set(nextVisibleBooks.map((entry) => entry.id))
    onReorder(books.map((entry) => visibleIds.has(entry.id) ? orderedQueue.shift() : entry))
  }

  function reorder(sourceId, targetId) {
    if (!sourceId || sourceId === targetId) return
    const nextBooks = [...visibleBooks]
    const sourceIndex = nextBooks.findIndex((entry) => entry.id === sourceId)
    const targetIndex = nextBooks.findIndex((entry) => entry.id === targetId)
    if (sourceIndex < 0 || targetIndex < 0) return
    const [movedBook] = nextBooks.splice(sourceIndex, 1)
    nextBooks.splice(targetIndex, 0, movedBook)
    commitVisibleOrder(nextBooks)
  }

  function moveWithKeyboard(bookId, direction) {
    const currentIndex = visibleBooks.findIndex((entry) => entry.id === bookId)
    const targetIndex = currentIndex + direction
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= visibleBooks.length) return
    reorder(bookId, visibleBooks[targetIndex].id)
  }

  function changeView(nextView) {
    setViewMode(nextView)
    localStorage.setItem('bookholm-library-view', nextView)
  }

  return (
    <section className="bookshelf-section" aria-labelledby="bookshelf-title">
      <div className="shelf-heading">
        <div><p className="eyebrow">Your collection</p><h2 id="bookshelf-title">My Bookshelf</h2><p>Drag books to arrange them. Hover over a spine for its cover, or select it for details.</p></div>
        {!loading && <span className="book-total">{books.length} {books.length === 1 ? 'book' : 'books'}</span>}
      </div>

      {!loading && books.length > 0 && <div className="collection-toolbar">
        <div className="shelf-filters" aria-label="Filter bookshelf">
          {STATUS_FILTERS.map((filter) => <button key={filter.id} type="button" className={activeFilter === filter.id ? 'active' : ''} onClick={() => setActiveFilter(filter.id)}>{filter.name}<span>{filter.id === 'all' ? books.length : books.filter((entry) => entry.status === filter.id).length}</span></button>)}
          {categories.map((category) => <button key={category.id} type="button" className={activeFilter === `category:${category.id}` ? 'active custom' : 'custom'} onClick={() => setActiveFilter(`category:${category.id}`)}>{category.name}<span>{books.filter((entry) => entry.category_ids?.includes(category.id)).length}</span></button>)}
        </div>
        <div className="view-switcher" role="group" aria-label="Choose library view">
          <button type="button" className={viewMode === 'shelf' ? 'active' : ''} onClick={() => changeView('shelf')} aria-pressed={viewMode === 'shelf'} title="Bookshelf view"><span aria-hidden="true">▥</span><b>Shelf</b></button>
          <button type="button" className={viewMode === 'columns' ? 'active' : ''} onClick={() => changeView('columns')} aria-pressed={viewMode === 'columns'} title="Cover columns"><span aria-hidden="true">▦</span><b>Columns</b></button>
          <button type="button" className={viewMode === 'list' ? 'active' : ''} onClick={() => changeView('list')} aria-pressed={viewMode === 'list'} title="List view"><span aria-hidden="true">☷</span><b>List</b></button>
        </div>
      </div>}

      {loading && <div className="library-loading">Dusting your shelves...</div>}
      {!loading && books.length === 0 && (
        <div className="empty-bookshelf">
          <div className="empty-wood-shelf" aria-hidden="true" />
          <h3>Your bookshelf has room for a story</h3>
          <p>Find a book in the catalog and it will appear here as a spine.</p>
          <button className="primary-button" type="button" onClick={onFindBooks}>Find your first book</button>
        </div>
      )}
      {!loading && shelves.length > 0 && viewMode === 'shelf' && (
        <div className="bookcase" aria-label="Your books arranged on shelves">
          <div className="bookcase-crown"><span>Bookholm</span></div>
          {shelves.map((shelf, index) => (
            <div className="shelf-compartment" key={shelf[0].id}>
              <div className="shelf-books">
                {shelf.map((entry) => <BookSpine
                  key={entry.id}
                  entry={entry}
                  onSelect={setSelectedBook}
                  dragging={draggedId === entry.id}
                  dragTarget={dragTargetId === entry.id}
                  onDragStart={(event, id) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', id); setDraggedId(id) }}
                  onDragOver={(event, id) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDragTargetId(id) }}
                  onDrop={(event, id) => { event.preventDefault(); reorder(event.dataTransfer.getData('text/plain') || draggedId, id); setDraggedId(null); setDragTargetId(null) }}
                  onDragEnd={() => { setDraggedId(null); setDragTargetId(null) }}
                  onMove={moveWithKeyboard}
                />)}
              </div>
              <div className="wood-shelf"><span>{index + 1}</span></div>
            </div>
          ))}
          <div className="bookcase-base" />
        </div>
      )}
      {!loading && visibleBooks.length > 0 && viewMode === 'columns' && <ColumnView books={visibleBooks} onSelect={setSelectedBook} />}
      {!loading && visibleBooks.length > 0 && viewMode === 'list' && <ListView books={visibleBooks} categories={categories} onSelect={setSelectedBook} />}

      {!loading && books.length > 0 && visibleBooks.length === 0 && <div className="empty-filter"><h3>No books here yet</h3><p>Open a book from another section to change its reading stage or categories.</p><button type="button" onClick={() => setActiveFilter('all')}>View all books</button></div>}

      {selectedBook && <BookDetailsModal entry={selectedBook} categories={categories} onCreateCategory={onCreateCategory} onClose={() => setSelectedBook(null)} onSave={onCustomize} onRemove={onRemove} />}
    </section>
  )
}
