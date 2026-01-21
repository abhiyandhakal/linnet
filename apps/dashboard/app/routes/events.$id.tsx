import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { DashboardLayout } from '../components/DashboardLayout'
import { getSession } from '../utils/auth'
import { useEffect, useState, FormEvent } from 'react'

export const Route = createFileRoute('/events/$id')({
  component: EventDetailPage,
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

function EventDetailPage() {
  const { session } = Route.useLoaderData()
  const { id } = Route.useParams()
  const navigate = useNavigate()
  
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    attendees: '',
  })
  
  useEffect(() => {
    if (!session.user?.id) {
      const landingUrl = import.meta.env.VITE_LANDING_URL || 'http://localhost:3501'
      window.location.href = landingUrl
      return
    }
    
    fetchEvent()
  }, [session.user?.id, id])
  
  const fetchEvent = async () => {
    setLoading(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3500'
      const response = await fetch(`${apiUrl}/events/${id}?userId=${session.user?.id}`, {
        credentials: 'include',
      })
      
      if (response.ok) {
        const data = await response.json()
        setEvent(data.event)
        
        // Parse datetime for form fields
        const startDate = new Date(data.event.startTime)
        const endDate = new Date(data.event.endTime)
        
        setFormData({
          title: data.event.title,
          description: data.event.description || '',
          date: startDate.toISOString().split('T')[0],
          startTime: startDate.toTimeString().slice(0, 5),
          endTime: endDate.toTimeString().slice(0, 5),
          location: data.event.location || '',
          attendees: data.event.attendees.join(', '),
        })
      } else {
        setError('Event not found')
      }
    } catch (err) {
      setError('Failed to load event')
    } finally {
      setLoading(false)
    }
  }
  
  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    
    if (!formData.title.trim()) {
      setError('Title is required')
      setSaving(false)
      return
    }
    
    // Combine date and time
    const startDateTime = `${formData.date}T${formData.startTime}:00`
    const endDateTime = `${formData.date}T${formData.endTime}:00`
    
    // Validate that end time is after start time
    if (new Date(endDateTime) <= new Date(startDateTime)) {
      setError('End time must be after start time')
      setSaving(false)
      return
    }
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3500'
      const response = await fetch(`${apiUrl}/events/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: session.user?.id,
          title: formData.title,
          description: formData.description || undefined,
          startTime: startDateTime,
          endTime: endDateTime,
          location: formData.location || undefined,
          attendees: formData.attendees 
            ? formData.attendees.split(',').map(a => a.trim()).filter(Boolean) 
            : [],
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setEvent(data.event)
        setIsEditing(false)
      } else {
        setError('Failed to update event')
      }
    } catch (err) {
      setError('Failed to update event')
    } finally {
      setSaving(false)
    }
  }
  
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return
    }
    
    setDeleting(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3500'
      const response = await fetch(`${apiUrl}/events/${id}?userId=${session.user?.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      
      if (response.ok) {
        navigate({ to: '/events' })
      } else {
        setError('Failed to delete event')
        setDeleting(false)
      }
    } catch (err) {
      setError('Failed to delete event')
      setDeleting(false)
    }
  }
  
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('en-US', {
      month: 'long',
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
  
  if (!session.user) {
    return null
  }
  
  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-3xl mx-auto">
          <div className="text-center text-[var(--muted-ink)] py-12">
            Loading event...
          </div>
        </div>
      </DashboardLayout>
    )
  }
  
  if (error && !event) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-3xl mx-auto">
          <div className="bg-red-100 border border-red-300 text-red-700 p-4 rounded-lg mb-4">
            {error}
          </div>
          <button
            onClick={() => navigate({ to: '/events' })}
            className="px-6 py-3 border border-[var(--border)] rounded-lg hover:bg-white/50 transition-colors"
          >
            Back to Events
          </button>
        </div>
      </DashboardLayout>
    )
  }
  
  return (
    <DashboardLayout>
      <div className="p-8 max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => navigate({ to: '/events' })}
            className="text-[var(--muted-ink)] hover:text-[var(--ink)] transition-colors"
          >
            ← Back to Events
          </button>
          <div className="flex gap-3">
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-3 bg-[var(--ink)] text-[var(--paper)] rounded-lg hover:opacity-90 transition-opacity"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-6 py-3 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setIsEditing(false)
                  if (event) {
                    const startDate = new Date(event.startTime)
                    const endDate = new Date(event.endTime)
                    setFormData({
                      title: event.title,
                      description: event.description || '',
                      date: startDate.toISOString().split('T')[0],
                      startTime: startDate.toTimeString().slice(0, 5),
                      endTime: endDate.toTimeString().slice(0, 5),
                      location: event.location || '',
                      attendees: event.attendees.join(', '),
                    })
                  }
                  setError('')
                }}
                className="px-6 py-3 border border-[var(--border)] rounded-lg hover:bg-white/50 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
        
        {error && event && (
          <div className="p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        {!isEditing && event ? (
          <div className="bg-white/50 p-8 rounded-lg border border-[var(--border)]">
            <h1 className="text-4xl mb-6">{event.title}</h1>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-2 text-lg">
                <span>🕒</span>
                <span>{formatDateTime(event.startTime)}</span>
              </div>
              <div className="flex items-center gap-2 text-lg text-[var(--muted-ink)]">
                <span className="ml-6">Duration: {formatTimeRange(event.startTime, event.endTime)}</span>
              </div>
              
              {event.location && (
                <div className="flex items-center gap-2 text-lg">
                  <span>📍</span>
                  <span>{event.location}</span>
                </div>
              )}
              
              {event.attendees.length > 0 && (
                <div className="flex items-start gap-2 text-lg">
                  <span>👥</span>
                  <div className="flex flex-wrap gap-2">
                    {event.attendees.map((attendee, idx) => (
                      <span key={idx} className="px-3 py-1 bg-[var(--paper)] border border-[var(--border)] rounded-full text-sm">
                        {attendee}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {event.description && (
              <div className="mb-6 pt-6 border-t border-[var(--border)]">
                <h2 className="text-lg font-medium mb-2">Description</h2>
                <p className="text-[var(--muted-ink)] whitespace-pre-wrap">{event.description}</p>
              </div>
            )}
            
            <div className="text-sm text-[var(--muted-ink)] pt-6 border-t border-[var(--border)]">
              <div>Created: {formatDateTime(event.createdAt)}</div>
              <div>Updated: {formatDateTime(event.updatedAt)}</div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpdate} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-lg mb-2 font-medium">
                Title <span className="text-[var(--red-pen)]">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-white/50 focus:outline-none focus:ring-2 focus:ring-[var(--ink)]"
                placeholder="e.g., Team standup meeting"
                required
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-lg mb-2 font-medium">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-white/50 focus:outline-none focus:ring-2 focus:ring-[var(--ink)] min-h-[100px]"
                placeholder="Add details about this event..."
              />
            </div>
            
            <div>
              <label htmlFor="date" className="block text-lg mb-2 font-medium">
                Date <span className="text-[var(--red-pen)]">*</span>
              </label>
              <input
                type="date"
                id="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-white/50 focus:outline-none focus:ring-2 focus:ring-[var(--ink)]"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startTime" className="block text-lg mb-2 font-medium">
                  Start Time <span className="text-[var(--red-pen)]">*</span>
                </label>
                <input
                  type="time"
                  id="startTime"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-white/50 focus:outline-none focus:ring-2 focus:ring-[var(--ink)]"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="endTime" className="block text-lg mb-2 font-medium">
                  End Time <span className="text-[var(--red-pen)]">*</span>
                </label>
                <input
                  type="time"
                  id="endTime"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-white/50 focus:outline-none focus:ring-2 focus:ring-[var(--ink)]"
                  required
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="location" className="block text-lg mb-2 font-medium">
                Location
              </label>
              <input
                type="text"
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-white/50 focus:outline-none focus:ring-2 focus:ring-[var(--ink)]"
                placeholder="e.g., Conference Room A, Zoom link, etc."
              />
            </div>
            
            <div>
              <label htmlFor="attendees" className="block text-lg mb-2 font-medium">
                Attendees
              </label>
              <input
                type="text"
                id="attendees"
                value={formData.attendees}
                onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
                className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-white/50 focus:outline-none focus:ring-2 focus:ring-[var(--ink)]"
                placeholder="e.g., John, Sarah, Mike (comma-separated)"
              />
            </div>
            
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-6 py-3 bg-[var(--ink)] text-[var(--paper)] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  )
}
