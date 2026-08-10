import { useEffect, useMemo, useState } from 'react'
import { BrandMark } from '../../components/BrandMark'
import { supabase } from '../../lib/supabase'
import { BookSearch } from '../books/components/BookSearch'
import { MyLibrary } from '../books/components/MyLibrary'
import { addBookToLibrary, getUserLibrary } from '../books/services/libraryService'
import '../books/books.css'

export function LibraryHome({ session }) {
  const [library, setLibrary] = useState([])
  const [loadingLibrary, setLoadingLibrary] = useState(true)
  const [addingId, setAddingId] = useState(null)
  const [notice, setNotice] = useState(null)
  const userId = session.user.id
  const name = session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'Reader'

  useEffect(() => {
    let active = true
    getUserLibrary(userId)
      .then((books) => { if (active) setLibrary(books) })
      .catch(() => { if (active) setNotice({ type: 'error', text: 'We could not open your library. Please refresh and try again.' }) })
      .finally(() => { if (active) setLoadingLibrary(false) })
    return () => { active = false }
  }, [userId])

  const addedSourceIds = useMemo(() => new Set(library.map((entry) => entry.books.open_library_id).filter(Boolean)), [library])

  async function handleAdd(book) {
    setAddingId(book.openLibraryId)
    setNotice(null)
    try {
      const entry = await addBookToLibrary(book, userId)
      setLibrary((current) => [entry, ...current.filter((item) => item.id !== entry.id)])
      setNotice({ type: 'success', text: `“${book.title}” was added to My Library.` })
    } catch (error) {
      console.error(error)
      setNotice({ type: 'error', text: 'That book could not be added. Please try again.' })
    } finally {
      setAddingId(null)
    }
  }

  return (
    <main className="library-page">
      <header className="library-header">
        <a className="brand dark" href="/" aria-label="Bookholm home"><BrandMark /><span>Bookholm</span></a>
        <nav aria-label="Main navigation"><a href="#my-library">My Library</a><a href="#find-books">Find books</a><button className="text-button" type="button" onClick={() => supabase.auth.signOut()}>Sign out</button></nav>
      </header>

      <section className="library-hero">
        <div><p className="eyebrow">Your private library</p><h1>Welcome home, {name}.</h1><p>Collect the stories that shaped you and the ones still waiting to be read.</p></div>
        <div className="collection-count"><strong>{library.length}</strong><span>books collected</span></div>
      </section>

      {notice && <div className={`toast-notice ${notice.type}`} role="status">{notice.text}<button type="button" aria-label="Dismiss message" onClick={() => setNotice(null)}>x</button></div>}

      <div className="library-content">
        <div id="my-library"><MyLibrary books={library} loading={loadingLibrary} /></div>
        <div id="find-books"><BookSearch addedSourceIds={addedSourceIds} addingId={addingId} onAdd={handleAdd} /></div>
      </div>
    </main>
  )
}
