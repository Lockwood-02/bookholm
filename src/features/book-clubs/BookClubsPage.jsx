import { useCallback, useEffect, useState } from 'react'
import { BookClubSetup } from './components/BookClubSetup'
import { ClubWorkspace } from './components/ClubWorkspace'
import { createBookClub, createClubEvent, getClubMessages, getClubWorkspace, getMyBookClubs, joinBookClub, sendClubMessage, subscribeToClub } from './services/bookClubService'
import './bookClubs.css'

export function BookClubsPage({ userId, onNotice }) {
  const [memberships, setMemberships] = useState([])
  const [activeClubId, setActiveClubId] = useState(null)
  const [workspace, setWorkspace] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadClubs = useCallback(async (preferredClubId) => {
    const clubs = await getMyBookClubs(userId)
    setMemberships(clubs)
    setActiveClubId((current) => preferredClubId || current || clubs[0]?.club.id || null)
    return clubs
  }, [userId])

  useEffect(() => {
    let active = true
    getMyBookClubs(userId)
      .then((clubs) => {
        if (!active) return
        setMemberships(clubs)
        setActiveClubId(clubs[0]?.club.id || null)
      })
      .catch(() => onNotice({ type: 'error', text: 'Your book clubs could not be loaded.' }))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [userId, onNotice])

  const activeMembership = memberships.find((membership) => membership.club.id === activeClubId)

  const loadWorkspace = useCallback(async () => {
    if (!activeMembership) { setWorkspace(null); return }
    const data = await getClubWorkspace(activeMembership.club.id, activeMembership.role === 'owner')
    setWorkspace(data)
  }, [activeMembership])

  useEffect(() => {
    if (!activeMembership) return undefined
    let active = true
    getClubWorkspace(activeMembership.club.id, activeMembership.role === 'owner')
      .then((data) => { if (active) setWorkspace(data) })
      .catch(() => onNotice({ type: 'error', text: 'This club could not be opened.' }))

    const channel = subscribeToClub(
      activeMembership.club.id,
      () => getClubMessages(activeMembership.club.id).then((messages) => setWorkspace((current) => current ? { ...current, messages } : current)),
      loadWorkspace,
    )
    return () => { active = false; channel.unsubscribe() }
  }, [activeMembership, loadWorkspace, onNotice])

  async function handleCreate(values) {
    const clubId = await createBookClub(values)
    await loadClubs(clubId)
    onNotice({ type: 'success', text: 'Your book club was created.' })
  }

  async function handleJoin(code) {
    const clubId = await joinBookClub(code)
    await loadClubs(clubId)
    onNotice({ type: 'success', text: 'Welcome to your new book club.' })
  }

  async function handleSend(body) {
    await sendClubMessage(activeClubId, userId, body)
  }

  async function handleEvent(values) {
    const created = await createClubEvent(activeClubId, userId, values)
    setWorkspace((current) => ({ ...current, events: [...current.events, created].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at)) }))
    onNotice({ type: 'success', text: 'The book club meeting was created.' })
  }

  if (loading) return <div className="library-loading">Opening your book clubs...</div>

  return (
    <div className="book-clubs-page">
      <div className="book-clubs-heading"><div><p className="eyebrow">Community</p><h2>Book Clubs</h2><p>Read together, keep the conversation going, and plan your next gathering.</p></div></div>
      <BookClubSetup hasClubs={memberships.length > 0} onCreate={handleCreate} onJoin={handleJoin} />
      {memberships.length > 0 && <div className="club-layout"><aside className="club-sidebar"><span>Your clubs</span>{memberships.map((membership) => <button type="button" className={membership.club.id === activeClubId ? 'active' : ''} key={membership.club.id} onClick={() => setActiveClubId(membership.club.id)}><i>{membership.club.name.slice(0, 1).toUpperCase()}</i><span><strong>{membership.club.name}</strong><small>{membership.role}</small></span></button>)}</aside><div className="club-main">{workspace && activeMembership ? <ClubWorkspace membership={activeMembership} workspace={workspace} userId={userId} onSend={handleSend} onCreateEvent={handleEvent} /> : <div className="library-loading">Opening the club room...</div>}</div></div>}
    </div>
  )
}
