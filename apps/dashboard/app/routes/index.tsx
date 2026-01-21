import { createFileRoute } from '@tanstack/react-router'
// import { getSession } from '../utils/auth'

export const Route = createFileRoute('/')({
  component: Home,
  // loader: async ({ context }) => {
    // In a real app, we'd check auth here
    // return { user: await getSession(context.request) }
  // }
})

function Home() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-12">
        <h1 className="text-4xl md:text-5xl mb-2">Good morning</h1>
        <p className="text-[var(--muted-ink)] text-xl">Here's your briefing for today.</p>
      </header>
      
      <div className="grid md:grid-cols-2 gap-8">
        <section className="bg-white/50 p-6 rounded-lg border border-[var(--border)]">
          <h2 className="text-2xl mb-4">Tasks</h2>
          <div className="text-[var(--muted-ink)] italic">No tasks yet. Use capture to add some.</div>
        </section>
        
        <section className="bg-white/50 p-6 rounded-lg border border-[var(--border)]">
          <h2 className="text-2xl mb-4">Events</h2>
          <div className="text-[var(--muted-ink)] italic">No upcoming events.</div>
        </section>
      </div>
    </div>
  )
}
