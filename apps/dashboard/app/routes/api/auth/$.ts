import { createAPIFileRoute } from '@tanstack/start/api'

export const Route = createAPIFileRoute('/api/auth/$')({
  GET: ({ request }) => {
    // This is a proxy to the backend API
    const url = new URL(request.url)
    const backendUrl = `http://localhost:3500${url.pathname}${url.search}`
    return fetch(backendUrl, {
      method: request.method,
      headers: request.headers,
    })
  },
  POST: ({ request }) => {
     // This is a proxy to the backend API
    const url = new URL(request.url)
    const backendUrl = `http://localhost:3500${url.pathname}${url.search}`
    return fetch(backendUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body
    })
  }
})
