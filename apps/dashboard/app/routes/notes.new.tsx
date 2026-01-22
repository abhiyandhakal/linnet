import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { DashboardLayout } from '../components/DashboardLayout'
import { getSession } from '../utils/auth'
import { useState, FormEvent } from 'react'

export const Route = createFileRoute('/notes/new')({
  component: NewNotePage,
  loader: async () => {
    const session = await getSession()
    return { session }
  }
})

function NewNotePage() {
  const { session } = Route.useLoaderData()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: '',
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
    
    if (!formData.content.trim()) {
      setError('Content is required')
      setLoading(false)
      return
    }
    
    try {
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
