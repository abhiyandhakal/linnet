import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { DashboardLayout } from '../components/DashboardLayout'
import { getSession } from '../utils/auth'
import { useEffect, useState, FormEvent } from 'react'

export const Route = createFileRoute('/tasks/$id')({
  component: TaskDetailPage,
  loader: async () => {
    const session = await getSession()
    return { session }
  }
})

interface Task {
  id: string
  title: string
  description: string | null
  dueDate: string | null
  priority: 'low' | 'medium' | 'high' | null
  status: 'todo' | 'in_progress' | 'done' | 'cancelled'
  tags: string[]
  createdAt: string
  updatedAt: string
}

function TaskDetailPage() {
  const { session } = Route.useLoaderData()
  const { id } = Route.useParams()
  const navigate = useNavigate()
  
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    status: 'todo' as Task['status'],
    tags: '',
  })
  
  useEffect(() => {
    if (!session.user?.id) {
      const landingUrl = import.meta.env.VITE_LANDING_URL || 'http://localhost:3501'
      window.location.href = landingUrl
      return
    }
    
    fetchTask()
  }, [session.user?.id, id])
  
  const fetchTask = async () => {
    setLoading(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3500'
      const response = await fetch(`${apiUrl}/tasks/${id}?userId=${session.user?.id}`, {
        credentials: 'include',
      })
      
      if (response.ok) {
        const data = await response.json()
        setTask(data.task)
        setFormData({
          title: data.task.title,
          description: data.task.description || '',
          dueDate: data.task.dueDate ? new Date(data.task.dueDate).toISOString().split('T')[0] : '',
          priority: data.task.priority || 'medium',
          status: data.task.status,
          tags: data.task.tags.join(', '),
        })
      } else {
        setError('Task not found')
      }
    } catch (err) {
      setError('Failed to load task')
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
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3500'
      const response = await fetch(`${apiUrl}/tasks/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: session.user?.id,
          title: formData.title,
          description: formData.description || undefined,
          dueDate: formData.dueDate || undefined,
          priority: formData.priority,
          status: formData.status,
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setTask(data.task)
        setIsEditing(false)
      } else {
        setError('Failed to update task')
      }
    } catch (err) {
      setError('Failed to update task')
    } finally {
      setSaving(false)
    }
  }
  
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return
    }
    
    setDeleting(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3500'
      const response = await fetch(`${apiUrl}/tasks/${id}?userId=${session.user?.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      
      if (response.ok) {
        navigate({ to: '/tasks' })
      } else {
        setError('Failed to delete task')
        setDeleting(false)
      }
    } catch (err) {
      setError('Failed to delete task')
      setDeleting(false)
    }
  }
  
  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'text-[var(--red-pen)]'
      case 'medium': return 'text-[var(--muted-ink)]'
      case 'low': return 'text-[var(--border)]'
      default: return 'text-[var(--muted-ink)]'
    }
  }
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'todo': return 'To Do'
      case 'in_progress': return 'In Progress'
      case 'done': return 'Done'
      case 'cancelled': return 'Cancelled'
      default: return status
    }
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'bg-gray-100 text-gray-700'
      case 'in_progress': return 'bg-blue-100 text-blue-700'
      case 'done': return 'bg-green-100 text-green-700'
      case 'cancelled': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
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
            Loading task...
          </div>
        </div>
      </DashboardLayout>
    )
  }
  
  if (error && !task) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-3xl mx-auto">
          <div className="bg-red-100 border border-red-300 text-red-700 p-4 rounded-lg mb-4">
            {error}
          </div>
          <button
            onClick={() => navigate({ to: '/tasks' })}
            className="px-6 py-3 border border-[var(--border)] rounded-lg hover:bg-white/50 transition-colors"
          >
            Back to Tasks
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
            onClick={() => navigate({ to: '/tasks' })}
            className="text-[var(--muted-ink)] hover:text-[var(--ink)] transition-colors"
          >
            ← Back to Tasks
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
                  if (task) {
                    setFormData({
                      title: task.title,
                      description: task.description || '',
                      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
                      priority: task.priority || 'medium',
                      status: task.status,
                      tags: task.tags.join(', '),
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
        
        {error && task && (
          <div className="p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        {!isEditing && task ? (
          <div className="bg-white/50 p-8 rounded-lg border border-[var(--border)]">
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-4xl flex-1">{task.title}</h1>
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                {getStatusLabel(task.status)}
              </span>
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              {task.priority && (
                <span className={`text-sm font-medium ${getPriorityColor(task.priority)}`}>
                  Priority: {task.priority.toUpperCase()}
                </span>
              )}
              {task.dueDate && (
                <>
                  <span className="text-[var(--muted-ink)]">•</span>
                  <span className="text-sm text-[var(--muted-ink)]">
                    Due: {formatDate(task.dueDate)}
                  </span>
                </>
              )}
            </div>
            
            {task.description && (
              <div className="mb-6">
                <h2 className="text-lg font-medium mb-2">Description</h2>
                <p className="text-[var(--muted-ink)] whitespace-pre-wrap">{task.description}</p>
              </div>
            )}
            
            {task.tags.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-medium mb-2">Tags</h2>
                <div className="flex gap-2 flex-wrap">
                  {task.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-[var(--paper)] border border-[var(--border)] rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="text-sm text-[var(--muted-ink)] pt-6 border-t border-[var(--border)]">
              <div>Created: {formatDate(task.createdAt)}</div>
              <div>Updated: {formatDate(task.updatedAt)}</div>
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
                placeholder="e.g., Review project proposal"
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
                className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-white/50 focus:outline-none focus:ring-2 focus:ring-[var(--ink)] min-h-[120px]"
                placeholder="Add details about this task..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="dueDate" className="block text-lg mb-2 font-medium">
                  Due Date
                </label>
                <input
                  type="date"
                  id="dueDate"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-white/50 focus:outline-none focus:ring-2 focus:ring-[var(--ink)]"
                />
              </div>
              
              <div>
                <label htmlFor="priority" className="block text-lg mb-2 font-medium">
                  Priority
                </label>
                <select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-white/50 focus:outline-none focus:ring-2 focus:ring-[var(--ink)]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            
            <div>
              <label htmlFor="status" className="block text-lg mb-2 font-medium">
                Status
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-white/50 focus:outline-none focus:ring-2 focus:ring-[var(--ink)]"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="cancelled">Cancelled</option>
              </select>
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
                placeholder="e.g., work, urgent (comma-separated)"
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
