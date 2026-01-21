import { createFileRoute, Link } from '@tanstack/react-router'
import { DashboardLayout } from '../components/DashboardLayout'
import { getSession } from '../utils/auth'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/tasks')({
  component: TasksPage,
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

function TasksPage() {
  const { session } = Route.useLoaderData()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    if (!session.user?.id) {
      const landingUrl = import.meta.env.VITE_LANDING_URL || 'http://localhost:3501'
      window.location.href = landingUrl
      return
    }
    
    fetchTasks()
  }, [session.user?.id])
  
  const fetchTasks = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3500'
      const response = await fetch(`${apiUrl}/tasks?userId=${session.user?.id}`, {
        credentials: 'include',
      })
      const data = await response.json()
      setTasks(data.tasks || [])
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3500'
      const response = await fetch(`${apiUrl}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: session.user?.id,
          status: newStatus,
        }),
      })
      
      if (response.ok) {
        fetchTasks()
      }
    } catch (error) {
      console.error('Failed to update task:', error)
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
  
  if (!session.user) {
    return null
  }
  
  return (
    <DashboardLayout>
      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl">Tasks</h1>
          <Link
            to="/tasks/new"
            className="px-6 py-3 bg-[var(--ink)] text-[var(--paper)] rounded-lg hover:opacity-90 transition-opacity"
          >
            + New Task
          </Link>
        </div>
        
        {loading ? (
          <div className="text-center text-[var(--muted-ink)] py-12">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="bg-white/50 p-12 rounded-lg border border-[var(--border)] text-center">
            <p className="text-[var(--muted-ink)] text-lg mb-4">No tasks yet</p>
            <Link
              to="/tasks/new"
              className="inline-block px-6 py-3 bg-[var(--ink)] text-[var(--paper)] rounded-lg hover:opacity-90 transition-opacity"
            >
              Create your first task
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="bg-white/50 p-6 rounded-lg border border-[var(--border)] hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <Link 
                    to={`/tasks/${task.id}`}
                    className="flex-1 hover:opacity-80 transition-opacity"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-medium">{task.title}</h3>
                      <span className={`text-sm ${getPriorityColor(task.priority)}`}>
                        {task.priority ? task.priority.toUpperCase() : ''}
                      </span>
                    </div>
                    
                    {task.description && (
                      <p className="text-[var(--muted-ink)] mb-3">{task.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-[var(--muted-ink)]">
                      <span>Status: {getStatusLabel(task.status)}</span>
                      {task.dueDate && (
                        <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                      )}
                    </div>
                    
                    {task.tags.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {task.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 bg-[var(--paper)] border border-[var(--border)] rounded-full text-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                  
                  <div className="flex flex-col gap-2">
                    {task.status !== 'done' && (
                      <button
                        onClick={() => updateTaskStatus(task.id, 'done')}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
                      >
                        ✓ Done
                      </button>
                    )}
                    {task.status === 'todo' && (
                      <button
                        onClick={() => updateTaskStatus(task.id, 'in_progress')}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                      >
                        ⟳ Start
                      </button>
                    )}
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
