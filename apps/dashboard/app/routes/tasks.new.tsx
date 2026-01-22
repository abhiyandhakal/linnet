import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { DashboardLayout } from '../components/DashboardLayout'
import { getSession } from '../utils/auth'
import { useState, FormEvent } from 'react'

export const Route = createFileRoute('/tasks/new')({
  component: NewTaskPage,
  loader: async () => {
    const session = await getSession()
    return { session }
  }
})

function NewTaskPage() {
  const { session } = Route.useLoaderData()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState('')
  const [quickInput, setQuickInput] = useState('')
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    tags: '',
  })
  
  const handleParseQuickInput = async () => {
    if (!quickInput.trim()) return
    
    setParsing(true)
    setError('')
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3500'
      const response = await fetch(`${apiUrl}/ai/parse-task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ text: quickInput }),
      })
      
      const data = await response.json()
      
      if (data.error) {
        setError(data.error)
      } else if (data.task) {
        // Populate form with parsed data
        setFormData({
          title: data.task.title || '',
          description: data.task.description || '',
          dueDate: data.task.dueDate || '',
          priority: data.task.priority || 'medium',
          tags: data.task.tags ? data.task.tags.join(', ') : '',
        })
        setQuickInput('') // Clear quick input after parsing
      }
    } catch (err) {
      setError('Failed to parse task')
    } finally {
      setParsing(false)
    }
  }
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    if (!formData.title.trim()) {
      setError('Title is required')
      setLoading(false)
      return
    }
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3500'
      const response = await fetch(`${apiUrl}/tasks`, {
        method: 'POST',
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
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        }),
      })
      
      if (response.ok) {
        navigate({ to: '/tasks' })
      } else {
        setError('Failed to create task')
      }
    } catch (err) {
      setError('Failed to create task')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <DashboardLayout>
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-4xl mb-8">Create New Task</h1>
        
        {/* AI Quick Input */}
        <div className="mb-8 paper-card paper-card--soft">
          <h2 className="text-lg font-medium mb-3 flex items-center gap-2">
            <span>✨</span>
            <span>Quick Create with AI</span>
          </h2>
          <p className="text-sm text-[var(--muted-ink)] mb-4">
            Describe your task naturally, e.g., "Review project proposal tomorrow" or "High priority: Fix login bug by Friday"
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleParseQuickInput()}
              className="flex-1 px-4 py-3 border border-[var(--border)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe your task..."
              disabled={parsing}
            />
            <button
              type="button"
              onClick={handleParseQuickInput}
              disabled={parsing || !quickInput.trim()}
              className="paper-button paper-button--primary disabled:opacity-50"
            >
              {parsing ? 'Parsing...' : 'Parse'}
            </button>
          </div>
        </div>
        
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
              disabled={loading}
              className="flex-1 paper-button paper-button--primary disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: '/tasks' })}
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
