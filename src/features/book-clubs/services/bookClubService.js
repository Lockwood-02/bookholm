import { supabase } from '../../../lib/supabase'

export async function getMyBookClubs(userId) {
  const result = await supabase
    .from('book_club_members')
    .select('role, joined_at, club:book_clubs(id, owner_id, name, description, created_at)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false })
  if (result.error) throw result.error
  return result.data.filter((membership) => membership.club)
}

export async function createBookClub(values) {
  const result = await supabase.rpc('create_book_club', {
    club_name: values.name.trim(),
    club_description: values.description.trim() || null,
  })
  if (result.error) throw result.error
  return result.data
}

export async function joinBookClub(inviteCode) {
  const result = await supabase.rpc('join_book_club', { raw_invite_code: inviteCode.trim() })
  if (result.error) throw result.error
  return result.data
}

export async function getClubWorkspace(clubId, isOwner) {
  const requests = [
    supabase.from('book_club_members').select('role, joined_at, profile:profiles!book_club_members_user_id_fkey(id, display_name, username, avatar_url)').eq('club_id', clubId).order('joined_at'),
    supabase.from('book_club_messages').select('id, body, created_at, sender_id, sender:profiles!book_club_messages_sender_id_fkey(display_name, username, avatar_url)').eq('club_id', clubId).order('created_at').limit(200),
    supabase.from('book_club_events').select('id, title, description, location, starts_at, ends_at, created_by, creator:profiles!book_club_events_created_by_fkey(display_name, username)').eq('club_id', clubId).order('starts_at'),
  ]
  if (isOwner) requests.push(supabase.from('book_club_invites').select('invite_code').eq('club_id', clubId).single())

  const [members, messages, events, invite] = await Promise.all(requests)
  const error = members.error || messages.error || events.error || invite?.error
  if (error) throw error
  return {
    members: members.data,
    messages: messages.data,
    events: events.data,
    inviteCode: invite?.data?.invite_code ?? null,
  }
}

export async function getClubMessages(clubId) {
  const result = await supabase
    .from('book_club_messages')
    .select('id, body, created_at, sender_id, sender:profiles!book_club_messages_sender_id_fkey(display_name, username, avatar_url)')
    .eq('club_id', clubId)
    .order('created_at')
    .limit(200)
  if (result.error) throw result.error
  return result.data
}

export async function sendClubMessage(clubId, userId, body) {
  const result = await supabase.from('book_club_messages').insert({ club_id: clubId, sender_id: userId, body: body.trim() })
  if (result.error) throw result.error
}

export async function createClubEvent(clubId, userId, values) {
  const result = await supabase
    .from('book_club_events')
    .insert({
      club_id: clubId,
      created_by: userId,
      title: values.title.trim(),
      description: values.description.trim() || null,
      location: values.location.trim() || null,
      starts_at: new Date(values.startsAt).toISOString(),
      ends_at: values.endsAt ? new Date(values.endsAt).toISOString() : null,
    })
    .select('id, title, description, location, starts_at, ends_at, created_by, creator:profiles!book_club_events_created_by_fkey(display_name, username)')
    .single()
  if (result.error) throw result.error
  return result.data
}

export function subscribeToClub(clubId, onMessageChange, onEventChange) {
  return supabase
    .channel(`book-club-${clubId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'book_club_messages', filter: `club_id=eq.${clubId}` }, onMessageChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'book_club_events', filter: `club_id=eq.${clubId}` }, onEventChange)
    .subscribe()
}
