import { Link, useRouterState } from '@tanstack/react-router'

export function Navigation() {
  const router = useRouterState()
  const pathname = router.location.pathname
  
  const navItems = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/tasks', label: 'Tasks', icon: '✓' },
    { href: '/events', label: 'Events', icon: '📅' },
    { href: '/notes', label: 'Notes', icon: '📝' },
  ]
  
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }
  
  return (
    <nav className="w-64 bg-white/50 border-r border-[var(--border)] min-h-screen p-6 flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-[var(--ink)] mb-1">Linnet</h1>
        <p className="text-sm text-[var(--muted-ink)]">Your AI Secretary</p>
      </div>
      
      <ul className="space-y-2 flex-1">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link
              to={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.href)
                  ? 'bg-[var(--ink)] text-[var(--paper)]'
                  : 'text-[var(--ink)] hover:bg-[var(--paper)] hover:shadow-sm'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      
      <div className="mt-auto pt-6 border-t border-[var(--border)]">
        <a
          href="/api/auth/signout"
          className="flex items-center gap-3 px-4 py-3 text-[var(--muted-ink)] hover:text-[var(--red-pen)] transition-colors rounded-lg hover:bg-white/50"
        >
          <span className="text-xl">↗</span>
          <span>Sign out</span>
        </a>
      </div>
    </nav>
  )
}
