import { BookCover } from './BookCover'

function formatStatus(status) {
  return status?.replaceAll('_', ' ') ?? 'want to read'
}

export function MyLibrary({ books, loading }) {
  return (
    <section className="my-library-section" aria-labelledby="my-library-title">
      <div className="section-heading compact">
        <div><p className="eyebrow">Your collection</p><h2 id="my-library-title">My Library</h2></div>
        {!loading && <span className="book-total">{books.length} {books.length === 1 ? 'book' : 'books'}</span>}
      </div>

      {loading && <div className="library-loading">Opening your collection...</div>}
      {!loading && books.length === 0 && (
        <div className="empty-collection">
          <div className="empty-shelf" aria-hidden="true"><div className="little-book a" /><div className="little-book b" /><div className="little-book c" /></div>
          <div><h3>Your library is waiting</h3><p>Search the catalog below and add a book to begin.</p></div>
        </div>
      )}
      {!loading && books.length > 0 && (
        <div className="library-grid">
          {books.map((entry) => (
            <article className="library-book" key={entry.id}>
              <BookCover src={entry.books.cover_medium_url} title={entry.books.title} />
              <div><span className="status-pill">{formatStatus(entry.status)}</span><h3>{entry.books.title}</h3><p>{entry.books.authors?.join(', ') || 'Unknown author'}</p></div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
