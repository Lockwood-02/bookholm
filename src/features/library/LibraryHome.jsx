import { useEffect, useMemo, useState } from 'react'
import { BrandMark } from '../../components/BrandMark'
import { supabase } from '../../lib/supabase'
import { BookSearch } from '../books/components/BookSearch'
import { addBookToLibrary, createUserCategory, getUserCategories, getUserLibrary, removeBookFromLibrary, saveBookshelfOrder, updateBookCustomization } from '../books/services/libraryService'
import { Bookshelf } from '../shelves/components/Bookshelf'
import '../books/books.css'

export function LibraryHome({ session }) {
  const [activeTab, setActiveTab] = useState('bookshelf')
  const [library, setLibrary] = useState([])
  const [categories, setCategories] = useState([])
  const [loadingLibrary, setLoadingLibrary] = useState(true)
  const [addingId, setAddingId] = useState(null)
  const [notice, setNotice] = useState(null)
  const userId = session.user.id
  const name = session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'Reader'

  useEffect(() => {
    let active = true
    Promise.all([getUserLibrary(userId), getUserCategories(userId)])
      .then(([books, userCategories]) => { if (active) { setLibrary(books); setCategories(userCategories) } })
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
      setNotice({ type: 'success', text: `${book.title} was added to My Bookshelf.` })
    } catch (error) {
      console.error(error)
      setNotice({ type: 'error', text: 'That book could not be added. Please try again.' })
    } finally {
      setAddingId(null)
    }
  }

  function showTab(tab) {
    setActiveTab(tab)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function customizeBook(userBookId, customization) {
    const updated = await updateBookCustomization(userBookId, userId, customization)
    setLibrary((current) => current.map((entry) => entry.id === userBookId ? { ...entry, ...updated } : entry))
    setNotice({ type: 'success', text: 'Your bookshelf changes were saved.' })
  }

  async function createCategory(name) {
    const created = await createUserCategory(userId, name)
    setCategories((current) => [...current, created].sort((first, second) => first.name.localeCompare(second.name)))
    return created
  }

  async function removeBook(userBookId) {
    await removeBookFromLibrary(userBookId, userId)
    setLibrary((current) => current.filter((entry) => entry.id !== userBookId))
    setNotice({ type: 'success', text: 'The book was removed from your library.' })
  }

  async function reorderBooks(nextLibrary) {
    const previousLibrary = library
    setLibrary(nextLibrary)
    try {
      await saveBookshelfOrder(nextLibrary, userId)
    } catch {
      setLibrary(previousLibrary)
      setNotice({ type: 'error', text: 'That shelf order could not be saved. Please try again.' })
    }
  }

  return (
    <main className="library-page">
      <header className="library-header">
        <a className="brand dark" href="/" aria-label="Bookholm home"><BrandMark /><span>Bookholm</span></a>
        <nav aria-label="Main navigation"><button className="text-button" type="button" onClick={() => supabase.auth.signOut()}>Sign out</button></nav>
      </header>

      <section className="library-hero">
        <div><p className="eyebrow">Your private library</p><h1>Welcome home, {name}.</h1><p>Collect the stories that shaped you and the ones still waiting to be read.</p></div>
        <div className="collection-count"><strong>{library.length}</strong><span>books collected</span></div>
      </section>

      <div className="library-tabs" role="tablist" aria-label="Library sections">
        <button type="button" role="tab" aria-selected={activeTab === 'bookshelf'} className={activeTab === 'bookshelf' ? 'active' : ''} onClick={() => showTab('bookshelf')}><span aria-hidden="true">▥</span> My Bookshelf</button>
        <button type="button" role="tab" aria-selected={activeTab === 'search'} className={activeTab === 'search' ? 'active' : ''} onClick={() => showTab('search')}><span aria-hidden="true">⌕</span> Find Books</button>
      </div>

      {notice && <div className={`toast-notice ${notice.type}`} role="status">{notice.text}<button type="button" aria-label="Dismiss message" onClick={() => setNotice(null)}>x</button></div>}

      <div className="library-content">
        {activeTab === 'bookshelf' && <Bookshelf books={library} categories={categories} loading={loadingLibrary} onFindBooks={() => showTab('search')} onCustomize={customizeBook} onCreateCategory={createCategory} onRemove={removeBook} onReorder={reorderBooks} />}
        {activeTab === 'search' && <BookSearch addedSourceIds={addedSourceIds} addingId={addingId} onAdd={handleAdd} />}
      </div>
    </main>
  )
}
