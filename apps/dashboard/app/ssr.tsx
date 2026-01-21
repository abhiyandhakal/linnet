/// <reference types="vinxi/types/server" />
import { eventHandler, getRequestURL } from 'vinxi/http'
import { renderToString } from 'react-dom/server'
import { createMemoryHistory } from '@tanstack/react-router'
import { RouterProvider } from '@tanstack/react-router'
import { createRouter } from './router'

export default eventHandler(async (event) => {
  const url = getRequestURL(event)
  const router = createRouter()
  
  const memoryHistory = createMemoryHistory({
    initialEntries: [url.pathname + url.search],
  })

  router.update({
    history: memoryHistory,
    context: {
      head: '',
      request: event.node.req, // Pass the Node.js request object
    },
  })

  await router.load()

  const html = renderToString(<RouterProvider router={router as any} />)

  return new Response(
    `<!DOCTYPE html>${html}`,
    {
      status: router.state.statusCode || 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    }
  )
})
