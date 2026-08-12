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
  ).select('id, status, rating, spine_color, selected_cover_url, created_at').single()
  if (libraryBook.error) throw libraryBook.error

  const shelf = await findOrCreateDefaultShelf(userId)
  const lastPosition = await supabase
    .from('shelf_books')
    .select('position')
    .eq('shelf_id', shelf.id)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (lastPosition.error) throw lastPosition.error

  const shelfEntry = await supabase.from('shelf_books').upsert(
    { shelf_id: shelf.id, user_book_id: libraryBook.data.id, book_id: catalogBook.id, position: (lastPosition.data?.position ?? -1) + 1 },
    { onConflict: 'shelf_id,user_book_id', ignoreDuplicates: true },
  )
  if (shelfEntry.error) throw shelfEntry.error

  return { ...libraryBook.data, books: catalogBook }
}

export async function getUserLibrary(userId) {
  const result = await supabase
    .from('user_books')
    .select('id, status, rating, spine_color, selected_cover_url, created_at, books(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (result.error) throw result.error
  if (result.data.length === 0) return []

  const shelf = await supabase.from('shelves').select('id').eq('user_id', userId).eq('slug', 'my-library').maybeSingle()
  if (shelf.error) throw shelf.error
  if (!shelf.data) return result.data

  const positions = await supabase
    .from('shelf_books')
    .select('user_book_id, position')
    .eq('shelf_id', shelf.data.id)
  if (positions.error) throw positions.error

  const positionByBook = new Map(positions.data.map((item) => [item.user_book_id, item.position]))
  const categoryLinks = await supabase
    .from('user_book_categories')
    .select('user_book_id, category_id')
    .in('user_book_id', result.data.map((entry) => entry.id))
  if (categoryLinks.error) throw categoryLinks.error

  const categoriesByBook = new Map()
  categoryLinks.data.forEach((link) => {
    const ids = categoriesByBook.get(link.user_book_id) ?? []
    ids.push(link.category_id)
    categoriesByBook.set(link.user_book_id, ids)
  })

  return result.data.map((entry) => ({ ...entry, category_ids: categoriesByBook.get(entry.id) ?? [] })).sort((first, second) => {
    const firstPosition = positionByBook.get(first.id) ?? Number.MAX_SAFE_INTEGER
    const secondPosition = positionByBook.get(second.id) ?? Number.MAX_SAFE_INTEGER
    return firstPosition - secondPosition
  })
}

export async function updateBookCustomization(userBookId, userId, customization) {
  const result = await supabase
    .from('user_books')
    .update({
      spine_color: customization.spineColor,
      selected_cover_url: customization.coverUrl,
      status: customization.status,
    })
    .eq('id', userBookId)
    .eq('user_id', userId)
    .select('id, status, spine_color, selected_cover_url')
    .single()

  if (result.error) throw result.error

  const removedLinks = await supabase
    .from('user_book_categories')
    .delete()
    .eq('user_book_id', userBookId)
  if (removedLinks.error) throw removedLinks.error

  if (customization.categoryIds.length > 0) {
    const addedLinks = await supabase.from('user_book_categories').insert(
      customization.categoryIds.map((categoryId) => ({ user_book_id: userBookId, category_id: categoryId })),
    )
    if (addedLinks.error) throw addedLinks.error
  }

  return { ...result.data, category_ids: customization.categoryIds }
}

export async function removeBookFromLibrary(userBookId, userId) {
  const result = await supabase
    .from('user_books')
    .delete()
    .eq('id', userBookId)
    .eq('user_id', userId)

  if (result.error) throw result.error
}

export async function saveBookshelfOrder(entries, userId) {
  const shelf = await findOrCreateDefaultShelf(userId)
  const rows = entries.map((entry, position) => ({
    shelf_id: shelf.id,
    user_book_id: entry.id,
    book_id: entry.books.id,
    position,
  }))

  const result = await supabase
    .from('shelf_books')
    .upsert(rows, { onConflict: 'shelf_id,user_book_id' })
  if (result.error) throw result.error
}

export async function getUserCategories(userId) {
  const result = await supabase
    .from('user_categories')
    .select('id, name, created_at')
    .eq('user_id', userId)
    .order('name')
  if (result.error) throw result.error
  return result.data
}

export async function createUserCategory(userId, name) {
  const result = await supabase
    .from('user_categories')
    .insert({ user_id: userId, name: name.trim() })
    .select('id, name, created_at')
    .single()
  if (result.error) throw result.error
  return result.data
}
