/**
 * The same server, over HTTP, so a browser can reach it.
 *
 * `src/index.ts` speaks stdio, which is what a host launching a subprocess wants and what
 * a browser cannot use. This is the other entry point: Streamable HTTP on a local port,
 * with CORS, for the client in `examples/mcp-client`.
 *
 * `createServer()` is unchanged — the transport is the only difference between the two
 * entry points, which is the whole point of MCP's transport split.
 */
import { randomUUID } from 'node:crypto'
import { createReadStream, existsSync } from 'node:fs'
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { basename, dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'

import { createServer } from './server.js'

const PORT = Number(process.env.PORT ?? 8787)

/**
 * Origins allowed to talk to this server, and hostnames it will answer to.
 *
 * A local MCP server with no authorization is reachable by any page the user happens to
 * have open, so both checks matter. The Host allowlist is DNS-rebinding protection: a
 * malicious site can point a domain it controls at 127.0.0.1, and the browser will send
 * that domain in `Host` — refusing anything but a localhost name closes it. The origin
 * allowlist is the other half; echoing back whatever `Origin` arrived would hand every
 * site a working CORS grant.
 */
const ALLOWED_ORIGINS = new Set(
    (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5185,http://127.0.0.1:5185').split(',').map((o) => o.trim())
)

const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

/** The bundled product images, which the Views allowlist as `csp.resourceDomains`. */
const IMAGES = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'images')

const IMAGE_TYPES: Record<string, string> = { '.jpg': 'image/jpeg', '.png': 'image/png' }

/** The Host header without its port, which is what the allowlist is written against. */
function hostname(host: string | undefined): string {
    if (host === undefined) {
        return ''
    }

    return host.startsWith('[') ? (host.split(']')[0] ?? '') + ']' : (host.split(':')[0] ?? '')
}

/** One transport per connected client, kept so its later POSTs route to the same session. */
const sessions = new Map<string, StreamableHTTPServerTransport>()

/**
 * The browser talks to this server directly rather than through a dev proxy, so it needs
 * the session header both allowed and *exposed* — the client reads `mcp-session-id` off
 * the initialize response and echoes it on every later request.
 *
 * Only known origins get the grant. A request with no `Origin` at all (curl, MCP
 * Inspector over stdio-style tooling) is left without CORS headers, which is correct:
 * it is not a browser and does not need them.
 */
function applyCors(response: ServerResponse, origin: string | undefined): void {
    if (origin !== undefined && ALLOWED_ORIGINS.has(origin)) {
        response.setHeader('access-control-allow-origin', origin)
        response.setHeader('vary', 'origin')
    }

    response.setHeader('access-control-allow-methods', 'GET, POST, DELETE, OPTIONS')
    response.setHeader('access-control-allow-headers', 'content-type, mcp-session-id, mcp-protocol-version, accept')
    response.setHeader('access-control-expose-headers', 'mcp-session-id')
}

async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const url = new URL(request.url ?? '/', `http://localhost:${PORT}`)

    // DNS-rebinding protection, before anything else looks at the request.
    if (!ALLOWED_HOSTS.has(hostname(request.headers.host))) {
        response.writeHead(403).end('Forbidden host')

        return
    }

    applyCors(response, request.headers.origin)

    if (request.method === 'OPTIONS') {
        response.writeHead(204).end()

        return
    }

    /*
     * The product images. `basename` is the path traversal guard: whatever the request
     * asks for, only the final segment is used, so `../../etc/passwd` resolves to
     * `passwd` inside the images directory and is simply not found.
     */
    if (url.pathname.startsWith('/assets/')) {
        const file = join(IMAGES, basename(url.pathname))
        const type = IMAGE_TYPES[extname(file).toLowerCase()]

        if (type === undefined || !existsSync(file)) {
            response.writeHead(404).end('Not found')

            return
        }

        response.writeHead(200, { 'content-type': type, 'cache-control': 'public, max-age=3600' })
        createReadStream(file).pipe(response)

        return
    }

    if (url.pathname !== '/mcp') {
        response.writeHead(404).end('Not found')

        return
    }

    const sessionId = request.headers['mcp-session-id']
    const existing = typeof sessionId === 'string' ? sessions.get(sessionId) : undefined

    if (existing) {
        await existing.handleRequest(request, response)

        return
    }

    // No session yet: this is an initialize. A fresh server and transport per client, so
    // each one negotiates its own content types.
    const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id: string): void => {
            sessions.set(id, transport)
        },
    })

    transport.onclose = () => {
        if (transport.sessionId) {
            sessions.delete(transport.sessionId)
        }
    }

    await createServer().connect(transport)
    await transport.handleRequest(request, response)
}

createHttpServer((request, response) => {
    handle(request, response).catch((error: Error) => {
        console.error('mcp server:', error.message)

        if (!response.headersSent) {
            response.writeHead(500).end(error.message)
        }
    })
})
    // Bound to loopback, so it is not reachable from the network at all.
    .listen(PORT, '127.0.0.1', () => {
        console.log(`MCP server on http://localhost:${PORT}/mcp`)
        console.log(`Product images on http://localhost:${PORT}/assets/`)
    })
    .on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
            console.error(`Port ${PORT} is already in use. Stop the other process, or run with PORT=8788.`)
            process.exit(1)
        }

        throw error
    })
