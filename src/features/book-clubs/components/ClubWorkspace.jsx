import { useEffect, useRef, useState } from 'react'
import { ClubChat } from './ClubChat'
import { ClubEvents } from './ClubEvents'

export function ClubWorkspace({ membership, workspace, userId, onSend, onCreateEvent }) {
  const club = membership.club
  const [codeCopied, setCodeCopied] = useState(false)
  const copiedTimer = useRef(null)

  useEffect(() => () => clearTimeout(copiedTimer.current), [])

  async function copyInviteCode() {
    await navigator.clipboard.writeText(workspace.inviteCode)
    setCodeCopied(true)
    clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCodeCopied(false), 2500)
  }

  return (
    <section className="club-workspace">
      <header className="club-workspace-header"><div><p className="eyebrow">Book club</p><h2>{club.name}</h2><p>{club.description || 'A private place to read and gather together.'}</p></div><div className="club-members-summary"><div className="avatar-stack">{workspace.members.slice(0, 4).map((member) => <span key={member.profile.id} title={member.profile.display_name || member.profile.username}>{(member.profile.display_name || member.profile.username).slice(0, 1).toUpperCase()}</span>)}</div><strong>{workspace.members.length} {workspace.members.length === 1 ? 'member' : 'members'}</strong></div></header>
      {membership.role === 'owner' && workspace.inviteCode && <div className={`invite-banner${codeCopied ? ' copied' : ''}`}><div><span>{codeCopied ? 'Invite code copied' : 'Invite members'}</span><strong>{workspace.inviteCode}</strong></div><button type="button" onClick={copyInviteCode} aria-live="polite">{codeCopied ? <><b aria-hidden="true">✓</b> Copied</> : 'Copy code'}</button></div>}
      <div className="club-workspace-grid"><ClubChat messages={workspace.messages} userId={userId} onSend={onSend} /><ClubEvents events={workspace.events} onCreate={onCreateEvent} /></div>
      <section className="member-roster"><h3>Members</h3><div>{workspace.members.map((member) => <article key={member.profile.id}><div className="member-avatar">{(member.profile.display_name || member.profile.username).slice(0, 1).toUpperCase()}</div><span><strong>{member.profile.display_name || member.profile.username}</strong><small>@{member.profile.username} · {member.role}</small></span></article>)}</div></section>
    </section>
  )
}
