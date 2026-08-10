import { AuthPage } from './features/auth/AuthPage'
import { LibraryHome } from './features/library/LibraryHome'
import { useSession } from './hooks/useSession'
import './App.css'

function App() {
  const { session, loading } = useSession()

  if (loading) return <div className="app-loading">Opening Bookholm...</div>
  return session ? <LibraryHome session={session} /> : <AuthPage />
}

export default App
