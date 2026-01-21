import { ReactNode } from 'react'
import { Navigation } from './Navigation'

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-[var(--paper)]">
      <Navigation />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
