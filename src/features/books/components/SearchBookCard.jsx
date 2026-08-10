import { BookCover } from './BookCover'

export function SearchBookCard({ book, isAdded, isAdding, onAdd }) {
  return (
    <article className="search-book-card">
      <BookCover src={book.coverMediumUrl} title={book.title} />
      <div className="search-book-info">
        <p className="book-meta">{book.firstPublished || 'Publication year unknown'}</p>
        <h3>{book.title}</h3>
        <p className="book-author">{book.authors.join(', ') || 'Unknown author'}</p>
        <p className="edition-count">{book.editionCount} {book.editionCount === 1 ? 'edition' : 'editions'} found</p>
        <button className={isAdded ? 'added-button' : 'add-button'} type="button" onClick={() => onAdd(book)} disabled={isAdded || isAdding}>
          {isAdded ? 'In your library' : isAdding ? 'Adding...' : '+ Add to library'}
        </button>
      </div>
    </article>
  )
}
