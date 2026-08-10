import { useRef, useState } from 'react'
import { searchOpenLibrary } from '../api/openLibrary'
import { SearchBookCard } from './SearchBookCard'

export function BookSearch({ addedSourceIds, addingId, onAdd }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searchedFor, setSearchedFor] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const activeRequest = useRef(null)

  async function handleSearch(event) {
    event.preventDefault()
    const cleanQuery = query.trim()
    if (cleanQuery.length < 2) {
      setError('Enter at least two characters to search.')
      return
    }

    activeRequest.current?.abort()
    const controller = new AbortController()
    activeRequest.current = controller
    setLoading(true)
    setError('')

    try {
      const books = await searchOpenLibrary(cleanQuery, controller.signal)
      setResults(books)
      setSearchedFor(cleanQuery)
    } catch (requestError) {
      if (requestError.name !== 'AbortError') setError(requestError.message)
    } finally {
      if (activeRequest.current === controller) setLoading(false)
    }
  }

  return (
    <section className="book-search-section" aria-labelledby="book-search-title">
      <div className="section-heading">
        <div><p className="eyebrow">Explore the catalog</p><h2 id="book-search-title">Find your next book</h2></div>
        <p>Search millions of titles by book, author, or ISBN.</p>
      </div>
      <form className="search-form" role="search" onSubmit={handleSearch}>
        <label className="sr-only" htmlFor="book-query">Search the book catalog</label>
        <input id="book-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try The Hobbit, Toni Morrison, or an ISBN" />
        <button type="submit" disabled={loading}>{loading ? 'Searching...' : 'Search books'}</button>
      </form>
      {error && <p className="catalog-message error" role="alert">{error}</p>}
      {searchedFor && !loading && !error && <div className="results-summary"><p>Results for <strong>“{searchedFor}”</strong></p><span>{results.length} titles</span></div>}
      {loading && <div className="search-loading" role="status">Looking through the stacks...</div>}
      {!loading && results.length > 0 && <div className="search-results">
        {results.map((book) => <SearchBookCard key={book.openLibraryId} book={book} isAdded={addedSourceIds.has(book.openLibraryId)} isAdding={addingId === book.openLibraryId} onAdd={onAdd} />)}
      </div>}
      {searchedFor && !loading && results.length === 0 && !error && <div className="catalog-message">No matching books found. Try a title, author name, or ISBN.</div>}
      <p className="catalog-credit">Book data and covers provided by <a href="https://openlibrary.org" target="_blank" rel="noreferrer">Open Library</a>.</p>
    </section>
  )
}
