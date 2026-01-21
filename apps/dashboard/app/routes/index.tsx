import { createFileRoute } from '@tanstack/react-router'
import { getSession } from '../utils/auth'
import { useEffect } from 'react'

export const Route = createFileRoute('/')({
  component: Home,
  loader: async () => {
    const session = await getSession()
    return { session }
  }
})

function Home() {
  const { session } = Route.useLoaderData()
  const userName = session.user?.name?.split(' ')[0] || 'there'
  
  // Redirect to landing page if not authenticated
  useEffect(() => {
    if (!session.user) {
      const landingUrl = import.meta.env.VITE_LANDING_URL || 'http://localhost:3501'
      window.location.href = landingUrl
    }
  }, [session.user])
  
  // Show loading while redirecting
  if (!session.user) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="text-center text-[var(--muted-ink)]">Redirecting to sign in...</div>
      </div>
    )
  }
  
  // Get current time for greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3500'
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-12">
        <h1 className="text-4xl md:text-5xl mb-2">{greeting}, {userName}</h1>
        <p className="text-[var(--muted-ink)] text-xl">Here's your briefing for today.</p>
      </header>
      
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <section className="bg-white/50 p-6 rounded-lg border border-[var(--border)]">
          <h2 className="text-2xl mb-4">Tasks</h2>
          <div className="text-[var(--muted-ink)] italic mb-4">No tasks yet. Use capture to add some.</div>
          <a 
            href="/tasks/new" 
            className="inline-block px-4 py-2 bg-[var(--ink)] text-[var(--paper)] rounded hover:opacity-90 transition-opacity"
          >
            Create Task
          </a>
        </section>
        
        <section className="bg-white/50 p-6 rounded-lg border border-[var(--border)]">
          <h2 className="text-2xl mb-4">Events</h2>
          <div className="text-[var(--muted-ink)] italic mb-4">No upcoming events.</div>
          <a 
            href="/events/new" 
            className="inline-block px-4 py-2 bg-[var(--ink)] text-[var(--paper)] rounded hover:opacity-90 transition-opacity"
          >
            Add Event
          </a>
        </section>
      </div>
      
      <section className="bg-white/50 p-6 rounded-lg border border-[var(--border)]">
        <h2 className="text-2xl mb-4">Notes</h2>
        <div className="text-[var(--muted-ink)] italic mb-4">No notes saved yet.</div>
        <a 
          href="/notes/new" 
          className="inline-block px-4 py-2 bg-[var(--ink)] text-[var(--paper)] rounded hover:opacity-90 transition-opacity"
        >
          New Note
        </a>
      </section>
      
      <div className="mt-8 text-center">
        <a 
          href={`${apiUrl}/auth/signout`}
          className="text-[var(--muted-ink)] hover:text-[var(--ink)] underline"
        >
          Sign out
        </a>
      </div>
    </div>
  )
}
