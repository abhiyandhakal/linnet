import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { DashboardLayout } from '../components/DashboardLayout'
import { getSession } from '../utils/auth'
import { useEffect, useState, FormEvent } from 'react'

export const Route = createFileRoute('/notes/$id')({
  component: NoteDetailPage,
  loader: async () => {
    const session = await getSession()
    return { session }
  }
})

interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

function NoteDetailPage() {
  const { session } = Route.useLoaderData()
  const { id } = Route.useParams()
  const navigate = useNavigate()
  
  const [note, setNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: '',
  })
  
  useEffect(() => {
    if (!session.user?.id) {
      const landingUrl = import.meta.env.VITE_LANDING_URL || 'http://localhost:3501'
      window.location.href = landingUrl
      return
    }
    
    fetchNote()
  }, [session.user?.id, id])
  
  const fetchNote = async () => {
    setLoading(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3500'
      const response = await fetch(`${apiUrl}/notes/${id}?userId=${session.user?.id}`, {
        credentials: 'include',
      })
      
      if (response.ok) {
        const data = await response.json()
        setNote(data.note)
        setFormData({
          title: data.note.title,
          content: data.note.content,
          tags: data.note.tags.join(', '),
        })
      } else {
        setError('Note not found')
      }
    } catch (err) {
      setError('Failed to load note')
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
    
    if (!formData.content.trim()) {
      setError('Content is required')
      setSaving(false)
      return
    }
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3500'
      const response = await fetch(`${apiUrl}/notes/${id}`, {
        method: 'PATCH',
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
        const data = await response.json()
        setNote(data.note)
        setIsEditing(false)
      } else {
        setError('Failed to update note')
      }
    } catch (err) {
      setError('Failed to update note')
    } finally {
      setSaving(false)
    }
  }
  
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
      return
    }
    
    setDeleting(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3500'
      const response = await fetch(`${apiUrl}/notes/${id}?userId=${session.user?.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      
      if (response.ok) {
        navigate({ to: '/notes' })
      } else {
        setError('Failed to delete note')
        setDeleting(false)
      }
    } catch (err) {
      setError('Failed to delete note')
      setDeleting(false)
    }
  }
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }
  
  if (!session.user) {
    return null
  }
  
  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-3xl mx-auto">
          <div className="text-center text-[var(--muted-ink)] py-12">
            Loading note...
          </div>
        </div>
      </DashboardLayout>
    )
  }
  
  if (error && !note) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-3xl mx-auto">
          <div className="bg-red-100 border border-red-300 text-red-700 p-4 rounded-lg mb-4">
            {error}
          </div>
          <button
            onClick={() => navigate({ to: '/notes' })}
            className="px-6 py-3 border border-[var(--border)] rounded-lg hover:bg-white/50 transition-colors"
          >
            Back to Notes
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
            onClick={() => navigate({ to: '/notes' })}
            className="text-[var(--muted-ink)] hover:text-[var(--ink)] transition-colors"
          >
            ← Back to Notes
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
                  if (note) {
                    setFormData({
                      title: note.title,
                      content: note.content,
                      tags: note.tags.join(', '),
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
        
        {error && note && (
          <div className="p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        {!isEditing && note ? (
          <div className="bg-white/50 p-8 rounded-lg border border-[var(--border)]">
            <h1 className="text-4xl mb-4">{note.title}</h1>
            
            <div className="flex gap-4 text-sm text-[var(--muted-ink)] mb-6">
              <span>Created: {formatDate(note.createdAt)}</span>
              <span>•</span>
              <span>Updated: {formatDate(note.updatedAt)}</span>
            </div>
            
            {note.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-6">
                {note.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-[var(--paper)] border border-[var(--border)] rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap font-mono text-sm bg-white/50 p-4 rounded border border-[var(--border)]">
                {note.content}
              </pre>
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
