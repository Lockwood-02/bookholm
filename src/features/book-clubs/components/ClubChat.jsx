import { useEffect, useRef, useState } from 'react'

function senderName(message) {
  return message.sender?.display_name || message.sender?.username || 'Reader'
}

export function ClubChat({ messages, userId, onSend }) {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function submit(event) {
    event.preventDefault()
    if (!draft.trim()) return
    setSending(true)
    try { await onSend(draft); setDraft('') } finally { setSending(false) }
  }

  return (
    <section className="club-chat" aria-labelledby="club-chat-title">
      <div className="club-panel-heading"><div><p className="eyebrow">Conversation</p><h3 id="club-chat-title">Club chat</h3></div><span>{messages.length} messages</span></div>
      <div className="message-list" aria-live="polite">
        {messages.length === 0 && <div className="empty-chat"><strong>Start the conversation</strong><p>Share a thought, a quote, or your next reading suggestion.</p></div>}
        {messages.map((message) => {
          const mine = message.sender_id === userId
          return <article className={`club-message${mine ? ' mine' : ''}`} key={message.id}><div className="member-avatar" aria-hidden="true">{senderName(message).slice(0, 1).toUpperCase()}</div><div><header><strong>{mine ? 'You' : senderName(message)}</strong><time>{new Date(message.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time></header><p>{message.body}</p></div></article>
        })}
        <div ref={endRef} />
      </div>
      <form className="chat-composer" onSubmit={submit}><label className="sr-only" htmlFor="club-message">Write a message</label><textarea id="club-message" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength="3000" placeholder="Write to your book club..." onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form.requestSubmit() } }} /><button type="submit" disabled={sending || !draft.trim()}>{sending ? 'Sending...' : 'Send'}</button></form>
    </section>
  )
}
