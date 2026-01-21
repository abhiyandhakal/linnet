import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import type { IncomingMessage } from 'http'

export function createRouter() {
  const router = createTanStackRouter({
    routeTree,
  })
  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
  
  interface RouterContext {
    head: string
    request?: IncomingMessage
  }
}
