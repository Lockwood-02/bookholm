const SEARCH_ENDPOINT = 'https://openlibrary.org/search.json'

function firstMatchingIsbn(isbns = [], length) {
  return isbns.find((isbn) => new RegExp(`^[0-9Xx]{${length}}$`).test(isbn)) ?? null
}

function mapBook(document) {
  const workId = document.key?.replace('/works/', '')
  const coverId = document.cover_i

  return {
    openLibraryId: workId,
    title: document.title,
    authors: document.author_name?.slice(0, 5) ?? [],
    firstPublished: document.first_publish_year?.toString() ?? null,
    publishers: document.publisher?.slice(0, 3) ?? [],
    isbn10: firstMatchingIsbn(document.isbn, 10),
    isbn13: firstMatchingIsbn(document.isbn, 13),
    languages: document.language?.slice(0, 5) ?? [],
    categories: document.subject?.slice(0, 8) ?? [],
    description: document.first_sentence?.[0] ?? null,
    editionCount: document.edition_count ?? 0,
    coverSmallUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-S.jpg` : null,
    coverMediumUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null,
    coverLargeUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null,
    sourceUrl: workId ? `https://openlibrary.org/works/${workId}` : null,
  }
}

export async function searchOpenLibrary(query, signal) {
  const params = new URLSearchParams({
    q: query.trim(),
    limit: '18',
    fields: 'key,title,author_name,first_publish_year,cover_i,isbn,publisher,language,subject,first_sentence,edition_count',
  })

  const response = await fetch(`${SEARCH_ENDPOINT}?${params}`, {
    signal,
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) throw new Error('The book catalog is unavailable right now. Please try again.')

  const data = await response.json()
  return data.docs.filter((book) => book.key && book.title).map(mapBook)
}

export async function getOpenLibraryCovers(workId, currentCoverUrl, signal) {
  if (!workId) return currentCoverUrl ? [currentCoverUrl] : []

  const response = await fetch(`https://openlibrary.org/works/${workId}/editions.json?limit=40`, {
    signal,
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) return currentCoverUrl ? [currentCoverUrl] : []

  const data = await response.json()
  const coverIds = [...new Set(data.entries?.flatMap((edition) => edition.covers ?? []).filter((id) => id > 0) ?? [])]
  const covers = coverIds.slice(0, 12).map((id) => `https://covers.openlibrary.org/b/id/${id}-L.jpg`)
  return [...new Set([currentCoverUrl, ...covers].filter(Boolean))]
}
