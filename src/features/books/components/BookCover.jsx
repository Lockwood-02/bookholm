export function BookCover({ src, title, size = 'medium' }) {
  if (src) return <img className={`book-cover ${size}`} src={src} alt={`Cover of ${title}`} loading="lazy" />

  return (
    <div className={`book-cover cover-fallback ${size}`} aria-label={`No cover available for ${title}`}>
      <span>{title}</span>
    </div>
  )
}
