import { createFileRoute, Link } from '@tanstack/react-router'
import { DashboardLayout } from '../components/DashboardLayout'
import { getSession } from '../utils/auth'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/events')({
  component: EventsPage,
  loader: async () => {
    const session = await getSession()
    return { session }
  }
})

interface Event {
  id: string
  title: string
  description: string | null
  startTime: string
  endTime: string
  location: string | null
  attendees: string[]
  createdAt: string
  updatedAt: string
}

function EventsPage() {
  const { session } = Route.useLoaderData()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'upcoming' | 'all'>('upcoming')
  
  useEffect(() => {
    if (!session.user?.id) {
      const landingUrl = import.meta.env.VITE_LANDING_URL || 'http://localhost:3501'
      window.location.href = landingUrl
      return
    }
    
    fetchEvents()
  }, [session.user?.id, view])
  
  const fetchEvents = async () => {
    setLoading(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3500'
      const endpoint = view === 'upcoming' ? '/events/upcoming' : '/events'
      const response = await fetch(`${apiUrl}${endpoint}?userId=${session.user?.id}`, {
        credentials: 'include',
      })
      const data = await response.json()
      setEvents(data.events || [])
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }
  
  const formatTimeRange = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const startTime = startDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    const endTime = endDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    return `${startTime} - ${endTime}`
  }
  
  const isToday = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }
  
  const isTomorrow = (dateStr: string) => {
    const date = new Date(dateStr)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return date.toDateString() === tomorrow.toDateString()
  }
  
  const getDateLabel = (dateStr: string) => {
    if (isToday(dateStr)) return 'Today'
    if (isTomorrow(dateStr)) return 'Tomorrow'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }
  
  if (!session.user) {
    return null
  }
  
  return (
    <DashboardLayout>
      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl">Events</h1>
          <Link
            to="/events/new"
            className="px-6 py-3 bg-[var(--ink)] text-[var(--paper)] rounded-lg hover:opacity-90 transition-opacity"
          >
            + New Event
          </Link>
        </div>
        
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setView('upcoming')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              view === 'upcoming'
                ? 'bg-[var(--ink)] text-[var(--paper)]'
                : 'bg-white/50 border border-[var(--border)] hover:bg-white/80'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setView('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              view === 'all'
                ? 'bg-[var(--ink)] text-[var(--paper)]'
                : 'bg-white/50 border border-[var(--border)] hover:bg-white/80'
            }`}
          >
            All Events
          </button>
        </div>
        
        {loading ? (
          <div className="text-center text-[var(--muted-ink)] py-12">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="bg-white/50 p-12 rounded-lg border border-[var(--border)] text-center">
            <p className="text-[var(--muted-ink)] text-lg mb-4">
              {view === 'upcoming' ? 'No upcoming events' : 'No events yet'}
            </p>
            <Link
              to="/events/new"
              className="inline-block px-6 py-3 bg-[var(--ink)] text-[var(--paper)] rounded-lg hover:opacity-90 transition-opacity"
            >
              Create your first event
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-white/50 p-6 rounded-lg border border-[var(--border)] hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-medium">{event.title}</h3>
                      <span className="text-sm text-[var(--red-pen)] font-medium">
                        {getDateLabel(event.startTime)}
                      </span>
                    </div>
                    
                    {event.description && (
                      <p className="text-[var(--muted-ink)] mb-3">{event.description}</p>
                    )}
                    
                    <div className="space-y-1 text-sm text-[var(--muted-ink)]">
                      <div className="flex items-center gap-2">
                        <span>🕒</span>
                        <span>{formatTimeRange(event.startTime, event.endTime)}</span>
                      </div>
                      
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <span>📍</span>
                          <span>{event.location}</span>
                        </div>
                      )}
                      
                      {event.attendees.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span>👥</span>
                          <span>{event.attendees.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
