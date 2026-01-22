import { Auth } from '@auth/core'
import { eventHandler } from 'vinxi/http'
import { authConfig } from './lib/auth.config'

export default eventHandler(async (event) => {
  const request = event.node.req
  const host = request.headers.host ?? 'localhost'
  const url = new URL(request.url ?? '/', `http://${host}`)

  const pathname = url.pathname
  if (!pathname.startsWith('/api/auth') && !pathname.startsWith('/auth')) {
    return new Response('Not found', { status: 404 })
  }

  const authUrl = pathname.startsWith('/auth')
    ? new URL(`/api${pathname}${url.search}`, url)
    : url

  const method = request.method ?? 'GET'
  const headers = request.headers as HeadersInit
  const hasBody = method !== 'GET' && method !== 'HEAD'
  const body = hasBody ? (request as any) : undefined

  const webRequest = new Request(authUrl, {
    method,
    headers,
    body,
    ...(hasBody ? { duplex: 'half' } : {}),
  })

  return await Auth(webRequest, authConfig)
})
