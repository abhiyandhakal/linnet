import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { DashboardLayout } from '../components/DashboardLayout'
import { getSession } from '../utils/auth'
import { useState, FormEvent } from 'react'

export const Route = createFileRoute('/events/new')({
  component: NewEventPage,
  loader: async () => {
    const session = await getSession()
    return { session }
  }
})

function NewEventPage() {
  const { session } = Route.useLoaderData()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Get today's date in YYYY-MM-DD format for the date input
  const today = new Date().toISOString().split('T')[0]
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: today,
    startTime: '09:00',
    endTime: '10:00',
    location: '',
    attendees: '',
  })
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    if (!formData.title.trim()) {
      setError('Title is required')
      setLoading(false)
      return
    }
    
    // Combine date and time
    const startDateTime = `${formData.date}T${formData.startTime}:00`
    const endDateTime = `${formData.date}T${formData.endTime}:00`
    
    // Validate that end time is after start time
    if (new Date(endDateTime) <= new Date(startDateTime)) {
      setError('End time must be after start time')
      setLoading(false)
      return
    }
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3500'
      const response = await fetch(`${apiUrl}/events`, {
        method: 'POST',
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
        navigate({ to: '/events' })
      } else {
        setError('Failed to create event')
      }
    } catch (err) {
      setError('Failed to create event')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <DashboardLayout>
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-4xl mb-8">Create New Event</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          
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
              disabled={loading}
              className="flex-1 px-6 py-3 bg-[var(--ink)] text-[var(--paper)] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Event'}
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: '/events' })}
              className="px-6 py-3 border border-[var(--border)] rounded-lg hover:bg-white/50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
