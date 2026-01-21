import { createFileRoute, Link } from '@tanstack/react-router'
import { DashboardLayout } from '../components/DashboardLayout'
import { getSession } from '../utils/auth'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/notes')({
  component: NotesPage,
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
  similarity?: number
}

function NotesPage() {
  const { session } = Route.useLoaderData()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searchMode, setSearchMode] = useState<'text' | 'semantic'>('text')
  
  useEffect(() => {
    if (!session.user?.id) {
      const landingUrl = import.meta.env.VITE_LANDING_URL || 'http://localhost:3501'
      window.location.href = landingUrl
      return
    }
    
    fetchNotes()
  }, [session.user?.id, debouncedSearch, searchMode])
  
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [searchQuery])
  
  const fetchNotes = async () => {
    setLoading(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3500'
      
      let url: string
      if (debouncedSearch && searchMode === 'semantic') {
        // Use semantic search
        url = `${apiUrl}/ai/search-notes?userId=${session.user?.id}&query=${encodeURIComponent(debouncedSearch)}`
      } else {
        // Use text search (default)
        const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ''
        url = `${apiUrl}/notes?userId=${session.user?.id}${searchParam}`
      }
      
      const response = await fetch(url, {
        credentials: 'include',
      })
      const data = await response.json()
      setNotes(data.notes || [])
    } catch (error) {
      console.error('Failed to fetch notes:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }
  
  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }
  
  if (!session.user) {
    return null
  }
  
  return (
    <DashboardLayout>
      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl">Notes</h1>
          <Link
            to="/notes/new"
            className="px-6 py-3 bg-[var(--ink)] text-[var(--paper)] rounded-lg hover:opacity-90 transition-opacity"
          >
            + New Note
          </Link>
        </div>
        
        <div className="mb-6">
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setSearchMode('text')}
              className={`px-4 py-2 rounded-lg border transition-all ${
                searchMode === 'text'
                  ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]'
                  : 'bg-white/50 text-[var(--ink)] border-[var(--border)] hover:border-[var(--ink)]'
              }`}
            >
              Text Search
            </button>
            <button
              onClick={() => setSearchMode('semantic')}
              className={`px-4 py-2 rounded-lg border transition-all ${
                searchMode === 'semantic'
                  ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]'
                  : 'bg-white/50 text-[var(--ink)] border-[var(--border)] hover:border-[var(--ink)]'
              }`}
            >
              Semantic Search
            </button>
            {searchMode === 'semantic' && (
              <span className="text-sm text-[var(--muted-ink)] self-center">
                AI-powered similarity search
              </span>
            )}
          </div>
          
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchMode === 'semantic' ? 'Describe what you\'re looking for...' : 'Search notes...'}
            className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-white/50 focus:outline-none focus:ring-2 focus:ring-[var(--ink)]"
          />
        </div>
        
        {loading ? (
          <div className="text-center text-[var(--muted-ink)] py-12">
            {debouncedSearch ? 'Searching...' : 'Loading notes...'}
          </div>
        ) : notes.length === 0 ? (
          <div className="bg-white/50 p-12 rounded-lg border border-[var(--border)] text-center">
            <p className="text-[var(--muted-ink)] text-lg mb-4">
              {debouncedSearch ? `No notes found matching "${debouncedSearch}"` : 'No notes yet'}
            </p>
            {!debouncedSearch && (
              <Link
                to="/notes/new"
                className="inline-block px-6 py-3 bg-[var(--ink)] text-[var(--paper)] rounded-lg hover:opacity-90 transition-opacity"
              >
                Create your first note
              </Link>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {notes.map((note) => (
              <Link
                key={note.id}
                to={`/notes/${note.id}`}
                className="bg-white/50 p-6 rounded-lg border border-[var(--border)] hover:shadow-md transition-all hover:-translate-y-0.5 block"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h3 className="text-xl font-medium flex-1">{note.title}</h3>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm text-[var(--muted-ink)]">
                      {formatDate(note.updatedAt)}
                    </span>
                    {searchMode === 'semantic' && note.similarity !== undefined && (
                      <span className="text-xs text-[var(--red-pen)] font-medium">
                        {(note.similarity * 100).toFixed(0)}% match
                      </span>
                    )}
                  </div>
                </div>
                
                <p className="text-[var(--muted-ink)] mb-3">
                  {truncateContent(note.content)}
                </p>
                
                {note.tags.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
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
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
