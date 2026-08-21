import { useState } from 'react'

const initialEvent = { title: '', description: '', location: '', startsAt: '', endsAt: '' }

export function ClubEvents({ events, onCreate }) {
  const [eventCutoff] = useState(() => Date.now() - 86400000)
  const [showForm, setShowForm] = useState(false)
  const [values, setValues] = useState(initialEvent)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function update(event) { setValues((current) => ({ ...current, [event.target.name]: event.target.value })) }

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { await onCreate(values); setValues(initialEvent); setShowForm(false) }
    catch (requestError) { setError(requestError.message || 'The meeting could not be created.') }
    finally { setBusy(false) }
  }

  const upcomingEvents = events.filter((event) => new Date(event.starts_at).getTime() >= eventCutoff)

  return (
    <section className="club-events" aria-labelledby="club-events-title">
      <div className="club-panel-heading"><div><p className="eyebrow">Get together</p><h3 id="club-events-title">Meetings</h3></div><button type="button" onClick={() => setShowForm(!showForm)}>+ New event</button></div>
      {showForm && <form className="event-form" onSubmit={submit}><label>Event name<input name="title" value={values.title} onChange={update} maxLength="120" placeholder="August book discussion" required /></label><div className="event-form-row"><label>Starts<input type="datetime-local" name="startsAt" value={values.startsAt} onChange={update} required /></label><label>Ends<input type="datetime-local" name="endsAt" value={values.endsAt} min={values.startsAt} onChange={update} /></label></div><label>Location<input name="location" value={values.location} onChange={update} maxLength="250" placeholder="Library meeting room or video link" /></label><label>Notes<textarea name="description" value={values.description} onChange={update} maxLength="2000" placeholder="What should everyone bring or prepare?" /></label>{error && <p role="alert">{error}</p>}<div><button type="button" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" disabled={busy}>{busy ? 'Creating...' : 'Create event'}</button></div></form>}
      <div className="event-list">
        {upcomingEvents.length === 0 && <div className="empty-events"><strong>No meetings scheduled</strong><p>Create the first event when your club is ready to meet.</p></div>}
        {upcomingEvents.map((event) => { const date = new Date(event.starts_at); return <article className="club-event" key={event.id}><time><strong>{date.toLocaleDateString([], { day: '2-digit' })}</strong><span>{date.toLocaleDateString([], { month: 'short' })}</span></time><div><h4>{event.title}</h4><p>{date.toLocaleString([], { weekday: 'long', hour: 'numeric', minute: '2-digit' })}{event.location ? ` · ${event.location}` : ''}</p>{event.description && <small>{event.description}</small>}</div></article> })}
      </div>
    </section>
  )
}
