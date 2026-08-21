import { useState } from 'react'

export function BookClubSetup({ hasClubs, onCreate, onJoin }) {
  const [mode, setMode] = useState(hasClubs ? null : 'join')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submitCreate(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { await onCreate({ name, description }); setName(''); setDescription(''); setMode(null) }
    catch (requestError) { setError(requestError.message || 'The club could not be created.') }
    finally { setBusy(false) }
  }

  async function submitJoin(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { await onJoin(inviteCode); setInviteCode(''); setMode(null) }
    catch { setError('That invite code is not valid. Check it and try again.') }
    finally { setBusy(false) }
  }

  return (
    <section className={`club-setup${hasClubs ? ' compact' : ''}`}>
      {!hasClubs && <div className="club-setup-intro"><p className="eyebrow">Read together</p><h2>Stories are better shared.</h2><p>Create a private space for your reading circle, or join friends with an invite code.</p></div>}
      <div className="club-setup-actions">
        <button type="button" className={mode === 'create' ? 'active' : ''} onClick={() => setMode(mode === 'create' ? null : 'create')}>+ Create a club</button>
        <button type="button" className={mode === 'join' ? 'active' : ''} onClick={() => setMode(mode === 'join' ? null : 'join')}>Join with code</button>
      </div>
      {mode === 'create' && <form className="club-setup-form" onSubmit={submitCreate}><label>Club name<input value={name} onChange={(event) => setName(event.target.value)} maxLength="80" placeholder="The Sunday Readers" required /></label><label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength="1000" placeholder="What does your club love to read?" /></label>{error && <p role="alert">{error}</p>}<button type="submit" disabled={busy}>{busy ? 'Creating...' : 'Create book club'}</button></form>}
      {mode === 'join' && <form className="club-setup-form join" onSubmit={submitJoin}><label>Invite code<input value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} maxLength="10" placeholder="A1B2C3D4E5" required /></label>{error && <p role="alert">{error}</p>}<button type="submit" disabled={busy}>{busy ? 'Joining...' : 'Join book club'}</button></form>}
    </section>
  )
}
