import { useEffect, useState } from 'react'

const initialEvent = { title: '', description: '', location: '', eventDate: '', startTime: '', endTime: '' }

const TIME_OPTIONS = Array.from({ length: 36 }, (_, index) => {
  const totalMinutes = 6 * 60 + index * 30
  const hour = Math.floor(totalMinutes / 60)
  const minute = totalMinutes % 60
  const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  const label = new Date(2000, 0, 1, hour, minute).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return { value, label }
})

function EventModal({ onClose, onCreate }) {
  const [values, setValues] = useState(initialEvent)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    function closeOnEscape(event) { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', closeOnEscape)
    document.body.classList.add('modal-open')
    return () => { document.removeEventListener('keydown', closeOnEscape); document.body.classList.remove('modal-open') }
  }, [onClose])

  function update(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value, ...(name === 'startTime' && !value ? { endTime: '' } : {}) }))
  }

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { await onCreate(values); onClose() }
    catch (requestError) { setError(requestError.message || 'The meeting could not be created.'); setBusy(false) }
  }

  const endOptions = values.startTime ? TIME_OPTIONS.filter((option) => option.value > values.startTime) : []

  return (
    <div className="event-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="event-modal" role="dialog" aria-modal="true" aria-labelledby="new-event-title">
        <button className="event-modal-close" type="button" onClick={onClose} aria-label="Close event form">x</button>
        <div className="event-modal-heading"><p className="eyebrow">Plan a gathering</p><h3 id="new-event-title">Create a book club event</h3><p>Choose a date now. A meeting time is optional.</p></div>
        <form className="event-form" onSubmit={submit}>
          <label>Event name<input name="title" value={values.title} onChange={update} maxLength="120" placeholder="August book discussion" autoFocus required /></label>
          <label>Date<input type="date" name="eventDate" value={values.eventDate} onChange={update} required /></label>
          <div className="event-form-row"><label>Time <span>(optional)</span><select name="startTime" value={values.startTime} onChange={update}><option value="">No specific time</option>{TIME_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label>End time <span>(optional)</span><select name="endTime" value={values.endTime} onChange={update} disabled={!values.startTime}><option value="">Not specified</option>{endOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>
          <label>Location<input name="location" value={values.location} onChange={update} maxLength="250" placeholder="Library meeting room or video link" /></label>
          <label>Notes<textarea name="description" value={values.description} onChange={update} maxLength="2000" placeholder="What should everyone bring or prepare?" /></label>
          {error && <p role="alert">{error}</p>}
          <div className="event-form-actions"><button type="button" onClick={onClose}>Cancel</button><button type="submit" disabled={busy}>{busy ? 'Creating...' : 'Create event'}</button></div>
        </form>
      </section>
    </div>
  )
}

export function ClubEvents({ events, onCreate }) {
  const [eventCutoff] = useState(() => Date.now() - 86400000)
  const [showForm, setShowForm] = useState(false)
  const upcomingEvents = events.filter((event) => new Date(event.starts_at).getTime() >= eventCutoff)

  return (
    <section className="club-events" aria-labelledby="club-events-title">
      <div className="club-panel-heading"><div><p className="eyebrow">Get together</p><h3 id="club-events-title">Meetings</h3></div><button type="button" onClick={() => setShowForm(true)}>+ New event</button></div>
      <div className="event-list">
        {upcomingEvents.length === 0 && <div className="empty-events"><strong>No meetings scheduled</strong><p>Create the first event when your club is ready to meet.</p></div>}
        {upcomingEvents.map((event) => { const date = new Date(event.starts_at); const dateLabel = date.toLocaleDateString([], { weekday: 'long' }); const timeLabel = event.has_time ? ` · ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''; return <article className="club-event" key={event.id}><time><strong>{date.toLocaleDateString([], { day: '2-digit' })}</strong><span>{date.toLocaleDateString([], { month: 'short' })}</span></time><div><h4>{event.title}</h4><p>{dateLabel}{timeLabel}{event.location ? ` · ${event.location}` : ''}</p>{event.description && <small>{event.description}</small>}</div></article> })}
      </div>
      {showForm && <EventModal onClose={() => setShowForm(false)} onCreate={onCreate} />}
    </section>
  )
}
