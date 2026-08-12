import { BookCover } from '../../books/components/BookCover'

const STATUS_NAMES = {
  want_to_read: 'To Be Read',
  reading: 'Reading',
  finished: 'Read',
  did_not_finish: 'Did Not Finish',
}

function preferredCover(entry) {
  return entry.selected_cover_url || entry.books.cover_medium_url
}

export function ColumnView({ books, onSelect }) {
  return (
    <div className="collection-columns" aria-label="Books in cover columns">
      {books.map((entry) => (
        <button className="column-book" type="button" key={entry.id} onClick={() => onSelect(entry)}>
          <BookCover src={preferredCover(entry)} title={entry.books.title} />
          <span className="column-book-copy"><strong>{entry.books.title}</strong><small>{entry.books.authors?.join(', ') || 'Unknown author'}</small><em>{STATUS_NAMES[entry.status]}</em></span>
        </button>
      ))}
    </div>
  )
}

export function ListView({ books, categories, onSelect }) {
  return (
    <div className="collection-list" role="table" aria-label="Books in list view">
      <div className="list-header" role="row"><span role="columnheader">Book</span><span role="columnheader">Author</span><span role="columnheader">Section</span><span role="columnheader">Categories</span><span role="columnheader">Rating</span></div>
      {books.map((entry) => {
        const bookCategories = categories.filter((category) => entry.category_ids?.includes(category.id))
        return (
          <button className="list-book" role="row" type="button" key={entry.id} onClick={() => onSelect(entry)}>
            <span className="list-title" role="cell"><BookCover src={preferredCover(entry)} title={entry.books.title} size="tiny" /><span><strong>{entry.books.title}</strong><small>{entry.books.published_date || 'Year unknown'}</small></span></span>
            <span role="cell">{entry.books.authors?.join(', ') || 'Unknown author'}</span>
            <span role="cell"><em className="list-status">{STATUS_NAMES[entry.status]}</em></span>
            <span className="list-categories" role="cell">{bookCategories.length > 0 ? bookCategories.map((category) => <small key={category.id}>{category.name}</small>) : <i>None</i>}</span>
            <span className="list-rating" role="cell">{entry.rating ? `${entry.rating} / 5` : '—'}</span>
          </button>
        )
      })}
    </div>
  )
}
