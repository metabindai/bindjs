/**
 * The MCP half of the client: connect, negotiate, and keep what the server said.
 *
 * The handshake is where this differs from any other MCP client. The client declares what
 * it renders under `io.modelcontextprotocol/ui`, and the server answers accordingly — with
 * the Views listed and `_meta.ui.resourceUri` on the tools that have one, or without them
 * if we had asked for something else. Everything below that is ordinary MCP.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { Resource, Tool } from '@modelcontextprotocol/sdk/types.js'

export const VIEW_MIME_TYPE = 'application/bindjs+json'
export const PACKAGE_MIME_TYPE = 'application/bindjs-package+json'
export const UI_EXTENSION = 'io.modelcontextprotocol/ui'

const SERVER_URL = import.meta.env.VITE_MCP_URL || 'http://localhost:8787/mcp'

/** `_meta.ui` as this server writes it (binding `mcp-apps.md`, section 3). */
export interface UiMeta {
    resourceUri?: string
    csp?: { connectDomains?: string[]; resourceDomains?: string[] }
    contentMimeTypes?: string[]
    bindjs?: {
        spec: string
        component?: string
        package?: string
        name?: string
        version?: string
        sha256?: string
        size?: number
    }
}

export function uiMeta(carrier: { _meta?: unknown } | undefined): UiMeta | undefined {
    return (carrier?._meta as { ui?: UiMeta } | undefined)?.ui
}

/**
 * Everything the handshake settled, kept so it can be inspected afterwards.
 *
 * The SDK performs `initialize` inside `connect()` and does not hand back the raw
 * exchange, so this reassembles it from what the client retained — which is all of it
 * except the request we know because we sent it.
 */
export interface Handshake {
    /** The client capabilities we sent, verbatim. */
    request: Record<string, unknown>
    protocolVersion: string | undefined
    serverInfo: { name: string; version: string } | undefined
    capabilities: Record<string, unknown> | undefined
    instructions: string | undefined
    transport: { url: string; sessionId: string | undefined }
}

export interface Connection {
    client: Client
    serverInfo: { name: string; version: string } | undefined
    resources: Resource[]
    tools: Tool[]
    /** What we asked for in `initialize`. Shown so the negotiation is visible. */
    declared: string[]
    handshake: Handshake
}

export async function connect(declared: string[]): Promise<Connection> {
    // What this host renders. The server keys everything it lists off this.
    const capabilities = { extensions: { [UI_EXTENSION]: { mimeTypes: declared } } }

    const client = new Client({ name: 'bindjs-mcp-inspector', version: '1.0.0' }, { capabilities })
    const transport = new StreamableHTTPClientTransport(new URL(SERVER_URL))

    await client.connect(transport)

    // A server that renders nothing for us simply lists no resources; that is the
    // negotiation working, not an error.
    const [resources, tools] = await Promise.all([
        client.listResources().then((result) => result.resources),
        client.listTools().then((result) => result.tools),
    ])

    return {
        client,
        serverInfo: client.getServerVersion() as Connection['serverInfo'],
        resources,
        tools,
        declared,
        handshake: {
            request: capabilities,
            protocolVersion: transport.protocolVersion,
            serverInfo: client.getServerVersion() as Connection['serverInfo'],
            capabilities: client.getServerCapabilities() as Record<string, unknown> | undefined,
            instructions: client.getInstructions(),
            transport: { url: SERVER_URL, sessionId: transport.sessionId },
        },
    }
}

/**
 * Reads a resource, returning both halves of the content item.
 *
 * The body is not the whole story: a View document is `{ spec, component }` and says
 * nothing about which package implements it. The package reference is in `_meta` beside
 * the text, and binding 2.1 accepts either that or an inline `package` in the body, so a
 * client that reads only `text` cannot resolve a View that uses the reference form.
 */
export async function readResource(
    client: Client,
    uri: string
): Promise<{ text: string; meta: UiMeta | undefined; result: unknown }> {
    const result = await client.readResource({ uri })
    const first = result.contents[0] as { text?: string; _meta?: unknown } | undefined

    if (typeof first?.text !== 'string') {
        throw new Error(`${uri} has no text body`)
    }

    return { text: first.text, meta: uiMeta(first), result }
}

/**
 * The integrity check from binding section 4, run in the browser.
 *
 * The digest is over the `text` field bytes as served, so it is computed on exactly the
 * string that came back — not on a re-serialization of the parsed object.
 */
export async function sha256(body: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body))

    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')
}
