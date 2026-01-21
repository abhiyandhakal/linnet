import { createFileRoute, Link } from '@tanstack/react-router'
import { getSession } from '../utils/auth'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '../components/DashboardLayout'

export const Route = createFileRoute('/')({
  component: Home,
  loader: async () => {
    const session = await getSession()
    return { session }
  }
})

interface DailyBriefing {
  summary: string
  upcomingTasks: string[]
  upcomingEvents: string[]
  suggestions: string[]
}

function Home() {
  const { session } = Route.useLoaderData()
  const userName = session?.user?.name?.split(' ')[0] || 'there'
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null)
  const [loadingBriefing, setLoadingBriefing] = useState(true)
  
  // Redirect to auth signin if not authenticated
  useEffect(() => {
    if (!session?.user) {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3500'
      window.location.href = `${apiUrl}/auth/signin`
    }
  }, [session])
  
  // Fetch daily briefing
  useEffect(() => {
    if (!session?.user?.id) return
    
    const fetchBriefing = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3500'
        const response = await fetch(`${apiUrl}/ai/briefing?userId=${session?.user?.id}`, {
          credentials: 'include',
        })
        
        const data = await response.json()
        if (data.briefing) {
          setBriefing(data.briefing)
        }
      } catch (error) {
        console.error('Failed to fetch briefing:', error)
      } finally {
        setLoadingBriefing(false)
      }
    }
    
    fetchBriefing()
  }, [session?.user?.id])
  
  // Show loading while redirecting
  if (!session?.user) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="text-center text-[var(--muted-ink)]">Redirecting to sign in...</div>
      </div>
    )
  }
  
  // Get current time for greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  
  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl mb-2">{greeting}, {userName}</h1>
          <p className="text-[var(--muted-ink)] text-xl">Here's your briefing for today.</p>
        </header>
        
        {/* AI Daily Briefing */}
        {loadingBriefing ? (
          <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
            <div className="text-center text-[var(--muted-ink)]">
              <span className="inline-block animate-pulse">✨ Generating your daily briefing...</span>
            </div>
          </div>
        ) : briefing ? (
          <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
            <h2 className="text-2xl mb-4 flex items-center gap-2">
              <span>✨</span>
              <span>AI Daily Briefing</span>
            </h2>
            
            {/* Summary */}
            <p className="text-lg mb-6 leading-relaxed">{briefing.summary}</p>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Upcoming Tasks */}
              {briefing.upcomingTasks.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 text-[var(--red-pen)]">📋 Focus Today</h3>
                  <ul className="space-y-2">
                    {briefing.upcomingTasks.map((task, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <span className="text-[var(--muted-ink)]">•</span>
                        <span>{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Upcoming Events */}
              {briefing.upcomingEvents.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 text-[var(--red-pen)]">📅 Today's Schedule</h3>
                  <ul className="space-y-2">
                    {briefing.upcomingEvents.map((event, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <span className="text-[var(--muted-ink)]">•</span>
                        <span>{event}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            {/* Suggestions */}
            {briefing.suggestions.length > 0 && (
              <div className="mt-6 pt-6 border-t border-blue-200">
                <h3 className="font-medium mb-3 text-[var(--red-pen)]">💡 Suggestions</h3>
                <ul className="space-y-2">
                  {briefing.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-[var(--muted-ink)]">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null}
        
        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6">
          <Link 
            to="/tasks/new"
            className="bg-white/50 p-6 rounded-lg border border-[var(--border)] hover:shadow-md transition-all hover:-translate-y-0.5 block text-center"
          >
            <div className="text-3xl mb-3">✅</div>
            <h3 className="text-xl font-medium mb-2">New Task</h3>
            <p className="text-sm text-[var(--muted-ink)]">Capture a to-do with AI</p>
          </Link>
          
          <Link 
            to="/events/new"
            className="bg-white/50 p-6 rounded-lg border border-[var(--border)] hover:shadow-md transition-all hover:-translate-y-0.5 block text-center"
          >
            <div className="text-3xl mb-3">📅</div>
            <h3 className="text-xl font-medium mb-2">New Event</h3>
            <p className="text-sm text-[var(--muted-ink)]">Schedule with natural language</p>
          </Link>
          
          <Link 
            to="/notes/new"
            className="bg-white/50 p-6 rounded-lg border border-[var(--border)] hover:shadow-md transition-all hover:-translate-y-0.5 block text-center"
          >
            <div className="text-3xl mb-3">📝</div>
            <h3 className="text-xl font-medium mb-2">New Note</h3>
            <p className="text-sm text-[var(--muted-ink)]">Jot down a thought</p>
          </Link>
        </div>
        
        {/* Overview */}
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <Link 
            to="/tasks"
            className="bg-white/50 p-6 rounded-lg border border-[var(--border)] hover:shadow-md transition-shadow block"
          >
            <h2 className="text-xl mb-2">Tasks</h2>
            <p className="text-[var(--muted-ink)] text-sm">Manage your to-do list</p>
          </Link>
          
          <Link 
            to="/events"
            className="bg-white/50 p-6 rounded-lg border border-[var(--border)] hover:shadow-md transition-shadow block"
          >
            <h2 className="text-xl mb-2">Events</h2>
            <p className="text-[var(--muted-ink)] text-sm">View your schedule</p>
          </Link>
          
          <Link 
            to="/notes"
            className="bg-white/50 p-6 rounded-lg border border-[var(--border)] hover:shadow-md transition-shadow block"
          >
            <h2 className="text-xl mb-2">Notes</h2>
            <p className="text-[var(--muted-ink)] text-sm">Browse your notes</p>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  )
}
