import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import { StartClient } from '@tanstack/start'
import * as React from 'react'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <html>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        <Outlet />
      </body>
    </html>
  )
}
