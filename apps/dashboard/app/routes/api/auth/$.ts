import { createAPIFileRoute } from '@tanstack/start/api'

const API_URL = process.env.VITE_API_URL || 'http://localhost:3500'

export const Route = createAPIFileRoute('/api/auth/$')({
  GET: ({ request }) => {
    // This is a proxy to the backend API
    const url = new URL(request.url)
    const backendUrl = `${API_URL}${url.pathname}${url.search}`
    return fetch(backendUrl, {
      method: request.method,
      headers: request.headers,
    })
  },
  POST: ({ request }) => {
     // This is a proxy to the backend API
    const url = new URL(request.url)
    const backendUrl = `${API_URL}${url.pathname}${url.search}`
    return fetch(backendUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body
    })
  }
})
