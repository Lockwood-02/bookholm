import { supabase } from '../../../lib/supabase'

function catalogRecord(book, userId) {
  return {
    open_library_id: book.openLibraryId,
    isbn_10: book.isbn10,
    isbn_13: book.isbn13,
    title: book.title,
    authors: book.authors,
    description: book.description,
    publisher: book.publishers[0] ?? null,
    published_date: book.firstPublished,
    language_code: book.languages[0] ?? null,
    categories: book.categories,
    cover_small_url: book.coverSmallUrl,
    cover_medium_url: book.coverMediumUrl,
    cover_large_url: book.coverLargeUrl,
    metadata_source: 'open_library',
    source_url: book.sourceUrl,
    created_by: userId,
  }
}

async function findOrCreateCatalogBook(book, userId) {
  const existing = await supabase.from('books').select('*').eq('open_library_id', book.openLibraryId).maybeSingle()
  if (existing.error) throw existing.error
  if (existing.data) return existing.data

  const created = await supabase.from('books').insert(catalogRecord(book, userId)).select().single()
  if (!created.error) return created.data

  // Another reader may have added the shared catalog record at the same moment.
  if (created.error.code === '23505') {
    const retry = await supabase.from('books').select('*').eq('open_library_id', book.openLibraryId).single()
    if (retry.error) throw retry.error
    return retry.data
  }
  throw created.error
}

async function findOrCreateDefaultShelf(userId) {
  const existing = await supabase.from('shelves').select('id').eq('user_id', userId).eq('slug', 'my-library').maybeSingle()
  if (existing.error) throw existing.error
  if (existing.data) return existing.data

  const created = await supabase.from('shelves').insert({
    user_id: userId,
    name: 'My Library',
    slug: 'my-library',
    description: 'All the books in my personal library.',
    theme: 'classic-oak',
  }).select('id').single()
  if (created.error) throw created.error
  return created.data
}

export async function addBookToLibrary(book, userId) {
  const catalogBook = await findOrCreateCatalogBook(book, userId)

  const libraryBook = await supabase.from('user_books').upsert(
    { user_id: userId, book_id: catalogBook.id },
    { onConflict: 'user_id,book_id', ignoreDuplicates: false },
  ).select('id, status, created_at').single()
  if (libraryBook.error) throw libraryBook.error

  const shelf = await findOrCreateDefaultShelf(userId)
  const shelfEntry = await supabase.from('shelf_books').upsert(
    { shelf_id: shelf.id, user_book_id: libraryBook.data.id, book_id: catalogBook.id },
    { onConflict: 'shelf_id,user_book_id', ignoreDuplicates: true },
  )
  if (shelfEntry.error) throw shelfEntry.error

  return { ...libraryBook.data, books: catalogBook }
}

export async function getUserLibrary(userId) {
  const result = await supabase
    .from('user_books')
    .select('id, status, rating, created_at, books(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (result.error) throw result.error
  return result.data
}
