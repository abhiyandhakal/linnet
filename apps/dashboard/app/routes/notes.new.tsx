import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { DashboardLayout } from '../components/DashboardLayout'
import { getSession, type User } from '../utils/auth'
import { useState, FormEvent, useEffect } from 'react'

export const Route = createFileRoute('/notes/new')({
  component: NewNotePage,
})

function NewNotePage() {
  const [session, setSession] = useState<{ user: User | null } | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: '',
  })
  
  useEffect(() => {
    const fetchSession = async () => {
      const sessionData = await getSession()
      setSession(sessionData)
      setSessionLoading(false)
    }
    fetchSession()
  }, [])

  useEffect(() => {
    if (!sessionLoading && !session?.user) {
      window.location.href = '/api/auth/signin'
    }
  }, [sessionLoading, session])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    if (!formData.title.trim()) {
      setError('Title is required')
      setLoading(false)
      return
    }
    
    if (!formData.content.trim()) {
      setError('Content is required')
      setLoading(false)
      return
    }
    
    try {
      if (!session?.user?.id) {
        setError('Please sign in again')
        setLoading(false)
        return
      }
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3500'
      const response = await fetch(`${apiUrl}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: session.user?.id,
          title: formData.title,
          content: formData.content,
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        }),
      })
      
      if (response.ok) {
        navigate({ to: '/notes' })
      } else {
        setError('Failed to create note')
      }
    } catch (err) {
      setError('Failed to create note')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <DashboardLayout>
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-4xl mb-8">Create New Note</h1>
        
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
              placeholder="e.g., Project ideas, Meeting notes..."
              required
            />
          </div>
          
          <div>
            <label htmlFor="content" className="block text-lg mb-2 font-medium">
              Content <span className="text-[var(--red-pen)]">*</span>
            </label>
            <textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-white/50 focus:outline-none focus:ring-2 focus:ring-[var(--ink)] min-h-[300px] font-mono text-sm"
              placeholder="Write your note here..."
              required
            />
          </div>
          
          <div>
            <label htmlFor="tags" className="block text-lg mb-2 font-medium">
              Tags
            </label>
            <input
              type="text"
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-white/50 focus:outline-none focus:ring-2 focus:ring-[var(--ink)]"
              placeholder="e.g., work, personal, ideas (comma-separated)"
            />
          </div>
          
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 paper-button paper-button--primary disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Note'}
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: '/notes' })}
              className="paper-button"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
