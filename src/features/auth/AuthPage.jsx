import { useState } from 'react'
import { BrandMark } from '../../components/BrandMark'
import { supabase, supabaseConfigured } from '../../lib/supabase'

const initialForm = { displayName: '', username: '', email: '', password: '' }

export function AuthPage() {
  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState(initialForm)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const isSignUp = mode === 'signup'

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function changeMode(nextMode) {
    setMode(nextMode)
    setMessage(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setMessage(null)

    if (!supabaseConfigured) {
      setMessage({ type: 'error', text: 'Supabase environment variables are missing.' })
      setBusy(false)
      return
    }

    if (isSignUp) {
      const requestedUsername = form.username.trim().toLowerCase()
      const availability = await supabase
        .from('profiles')
        .select('id')
        .eq('username', requestedUsername)
        .maybeSingle()

      if (availability.error) {
        setMessage({ type: 'error', text: 'We could not check that username. Please try again.' })
        setBusy(false)
        return
      }

      if (availability.data) {
        setMessage({ type: 'error', text: 'That username is already taken. Please choose another.' })
        setBusy(false)
        return
      }
    }

    const result = isSignUp
      ? await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { username: form.username.trim().toLowerCase(), display_name: form.displayName.trim() } },
        })
      : await supabase.auth.signInWithPassword({ email: form.email, password: form.password })

    if (result.error) {
      setMessage({ type: 'error', text: result.error.message })
    } else if (isSignUp && !result.data.session) {
      setMessage({ type: 'success', text: 'Check your inbox to confirm your email, then come back to sign in.' })
      setForm(initialForm)
    }
    setBusy(false)
  }

  return (
    <main className="auth-layout">
      <section className="welcome-panel">
        <a className="brand" href="/" aria-label="Bookholm home"><BrandMark /><span>Bookholm</span></a>
        <div className="welcome-copy">
          <p className="eyebrow">Your reading life, beautifully kept</p>
          <h1>A home for every book you have loved.</h1>
          <p className="intro">Build your personal library, remember what moved you, and watch your shelves grow one story at a time.</p>
        </div>
        <div className="decorative-shelf" aria-hidden="true">
          <div className="book book-one" /><div className="book book-two" /><div className="book book-three" />
          <div className="book book-four" /><div className="book book-five" /><div className="shelf-board" />
        </div>
        <p className="quote">A reader lives a thousand lives.</p>
      </section>

      <section className="form-panel">
        <div className="mobile-brand"><BrandMark /><span>Bookholm</span></div>
        <div className="auth-card">
          <div className="auth-heading">
            <p className="eyebrow">{isSignUp ? 'Begin your collection' : 'Welcome back'}</p>
            <h2>{isSignUp ? 'Create your library' : 'Return to your shelves'}</h2>
            <p>{isSignUp ? 'Create a free account to start keeping your books.' : 'Sign in to continue your reading journey.'}</p>
          </div>
          <div className="mode-tabs" role="tablist" aria-label="Account options">
            <button type="button" className={mode === 'signin' ? 'active' : ''} onClick={() => changeMode('signin')} role="tab" aria-selected={mode === 'signin'}>Sign in</button>
            <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => changeMode('signup')} role="tab" aria-selected={mode === 'signup'}>Create account</button>
          </div>
          <form onSubmit={handleSubmit}>
            {isSignUp && <div className="field-row">
              <label>Display name<input name="displayName" value={form.displayName} onChange={updateField} autoComplete="name" placeholder="Jane Austen" maxLength="80" /></label>
              <label>Username<input name="username" value={form.username} onChange={updateField} autoComplete="username" placeholder="jane_reads" pattern="[a-zA-Z0-9_]{3,30}" title="Use 3-30 letters, numbers, or underscores" required /></label>
            </div>}
            <label>Email address<input type="email" name="email" value={form.email} onChange={updateField} autoComplete="email" placeholder="reader@example.com" required /></label>
            <label><span className="label-line">Password<span className="hint">At least 6 characters</span></span><input type="password" name="password" value={form.password} onChange={updateField} autoComplete={isSignUp ? 'new-password' : 'current-password'} placeholder="At least 6 characters" minLength="6" required /></label>
            {message && <div className={`form-message ${message.type}`} role="status">{message.text}</div>}
            <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Opening your library...' : isSignUp ? 'Create my library' : 'Enter my library'}</button>
          </form>
          <p className="terms">By continuing, you agree to Bookholm's Terms and Privacy Policy.</p>
        </div>
      </section>
    </main>
  )
}
