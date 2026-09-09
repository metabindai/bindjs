/**
 * A three-pane inspector for the BindJS MCP server.
 *
 * Left: what the server listed, resources or tools, switched by the segmented control.
 * Middle: the selected thing in full — a resource's `_meta` and body, or a tool's schema
 * and a form built from it. Right: the View, executed and painted.
 *
 * The grid is the app's ground rather than one pane's decoration: the sidebar, the detail
 * pane and the bridge log float on it as cards, and the rendered View sits on it directly,
 * so the right-hand side reads as the background continuing rather than as a fourth panel.
 * The app owns the viewport, and nothing scrolls but the cards themselves.
 *
 * The negotiation is a control rather than a constant. Switch it to HTML-only and
 * reconnect: the Views leave `resources/list`, `_meta.ui.resourceUri` leaves the tools, and
 * the stage has nothing to draw — because this server has one representation of each View
 * and does not offer a host something it cannot render. That is binding section 1, in a
 * dropdown.
 */
import { useCallback, useEffect, useState } from 'react'
import {
    Badge,
    Box,
    Button,
    Callout,
    Code,
    Flex,
    Heading,
    IconButton,
    ScrollArea,
    SegmentedControl,
    Select,
    Separator,
    Spinner,
    Text,
} from '@radix-ui/themes'
import type { Resource, Tool } from '@modelcontextprotocol/sdk/types.js'

import { BindJSView } from './BindJSView'
import {
    connect,
    PACKAGE_MIME_TYPE,
    readResource,
    sha256,
    uiMeta,
    VIEW_MIME_TYPE,
    type Connection,
    type UiMeta,
} from './mcp'

import { initialValues, ToolForm, toArguments, type FieldValues, type JsonSchema } from './ToolForm'

import './panes.css'

const HTML_MIME_TYPE = 'text/html;profile=mcp-app'

const NEGOTIATIONS = {
    bindjs: { label: 'BindJS + HTML', types: [VIEW_MIME_TYPE, HTML_MIME_TYPE] },
    html: { label: 'HTML only', types: [HTML_MIME_TYPE] },
}

function Json({ value, maxHeight }: { value: unknown; maxHeight?: number }) {
    return (
        <ScrollArea scrollbars="vertical" style={maxHeight ? { maxHeight } : undefined}>
            <Box className="code-block" p="2">
                {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            </Box>
        </ScrollArea>
    )
}

type Pane = 'tools' | 'resources' | 'session'

/**
 * A read response, with an over-long `text` shortened.
 *
 * The package body is thirteen kilobytes of component source on one line, which buries the
 * rest of the message. Everything else is left exactly as it arrived — including `text`
 * being a *string*, because the digest is computed over those bytes and not over a
 * re-serialization of the object inside them.
 */
function elideSources(result: unknown): unknown {
    const contents = (result as { contents?: { text?: string }[] })?.contents

    if (!Array.isArray(contents)) {
        return result
    }

    return {
        ...(result as object),
        contents: contents.map((item) =>
            typeof item.text === 'string' && item.text.length > 600
                ? { ...item, text: `${item.text.slice(0, 600)}… (${item.text.length} chars)` }
                : item
        ),
    }
}

/**
 * What the handshake settled, as inspectable entries.
 *
 * The `initialize` exchange is where a host says what it can render, and it is the reason
 * everything below it looks the way it does — so it is worth being able to read rather
 * than infer from the panes it shapes.
 */
function sessionEntries(connection: Connection, pkg: { body: string; verified: boolean } | null) {
    const { handshake } = connection

    const entries: { name: string; hint: string; value: unknown }[] = [
        {
            name: 'initialize · client',
            hint: 'what this host declared it renders',
            value: {
                clientInfo: { name: 'bindjs-mcp-inspector', version: '1.0.0' },
                capabilities: handshake.request,
            },
        },
        {
            name: 'initialize · server',
            hint: 'protocol version, capabilities, server info',
            value: {
                protocolVersion: handshake.protocolVersion,
                serverInfo: handshake.serverInfo,
                capabilities: handshake.capabilities,
                instructions: handshake.instructions ?? null,
            },
        },
        {
            name: 'transport',
            hint: 'Streamable HTTP, one session',
            value: handshake.transport,
        },
    ]

    if (pkg) {
        // The package is the allowlist for every render (specification, chapter 10), so
        // what it shipped is worth seeing on its own rather than only inside a resource.
        const parsed = JSON.parse(pkg.body) as {
            name: string
            version: string
            spec: string
            entry?: string
            components: Record<string, string>
        }

        entries.push({
            name: 'package',
            hint: `${Object.keys(parsed.components).length} components, verified`,
            value: {
                name: parsed.name,
                version: parsed.version,
                spec: parsed.spec,
                entry: parsed.entry,
                digestVerified: pkg.verified,
                bytes: new TextEncoder().encode(pkg.body).length,
                components: Object.fromEntries(
                    Object.entries(parsed.components).map(([name, source]) => [name, `${source.length} chars`])
                ),
            },
        })
    }

    return entries
}

/**
 * What the digest on a resource actually claims.
 *
 * On a package resource, `sha256` is over that resource's own body, so reading it is a
 * real integrity check (binding section 4). On a *View*, `sha256` describes the package
 * the View references, not the View's own body — so hashing the body and comparing would
 * always disagree. There the useful check is whether the View points at the package this
 * client already fetched and verified.
 */
async function verdict(
    resource: Resource,
    body: string,
    declared: UiMeta['bindjs'],
    pkg: { body: string; verified: boolean } | null
): Promise<{ ok: boolean | null; text: string }> {
    if (!declared?.sha256) {
        return { ok: null, text: 'no digest declared' }
    }

    if (resource.mimeType === PACKAGE_MIME_TYPE) {
        const actual = await sha256(body)

        return actual === declared.sha256
            ? { ok: true, text: `sha256 matches (${actual.slice(0, 16)}…)` }
            : { ok: false, text: 'sha256 MISMATCH — do not execute' }
    }

    if (!pkg) {
        return { ok: null, text: `digest describes ${declared.package ?? 'the package'}, not this View` }
    }

    return (await sha256(pkg.body)) === declared.sha256
        ? { ok: true, text: 'references the package this client holds, digest matches' }
        : { ok: false, text: 'references a package digest this client does not hold' }
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <Box>
            <Text as="p" size="1" color="gray" mb="1">
                {label}
            </Text>
            {children}
        </Box>
    )
}

export function App() {
    const [negotiation, setNegotiation] = useState<keyof typeof NEGOTIATIONS>('bindjs')
    const [connection, setConnection] = useState<Connection | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(true)

    /*
     * What is in flight, if anything. `busy` drives the spinner; this disables just the
     * one control that started the request, so a slow connect cannot leave Read or Call
     * permanently greyed out.
     */
    const [pending, setPending] = useState<'read' | 'call' | null>(null)

    const [pane, setPane] = useState<Pane>('tools')
    const [tool, setTool] = useState<Tool | null>(null)
    const [resource, setResource] = useState<Resource | null>(null)
    const [entry, setEntry] = useState<string>('initialize · client')

    const [values, setValues] = useState<FieldValues>({})
    const [result, setResult] = useState<unknown>(null)
    const [reading, setReading] = useState<{
        uri: string
        result: unknown
        meta: UiMeta | undefined
        verified: { ok: boolean | null; text: string }
    } | null>(null)

    /** The verified package, and what to draw from it. */
    const [pkg, setPkg] = useState<{ body: string; verified: boolean } | null>(null)
    const [render, setRender] = useState<{
        component: string
        props: Record<string, unknown>
        version: string
    } | null>(null)
    const [bridge, setBridge] = useState<string[]>([])
    const [bridgeOpen, setBridgeOpen] = useState(true)

    const onBridge = useCallback((line: string) => setBridge((lines) => [...lines, line]), [])

    const open = useCallback(async (which: keyof typeof NEGOTIATIONS) => {
        setBusy(true)
        setError(null)
        setResult(null)
        setReading(null)
        setTool(null)
        setResource(null)
        setRender(null)
        setPkg(null)
        setBridge([])

        try {
            const next = await connect(NEGOTIATIONS[which].types)

            setConnection(next)

            /*
             * Fetch and verify the package now, the way a host would: before there is any
             * code to constrain, and once for both Views, since both reference it.
             */
            const entry = next.resources.find((candidate) => candidate.mimeType === PACKAGE_MIME_TYPE)

            if (entry) {
                const { text: body } = await readResource(next.client, entry.uri)
                const declared = uiMeta(entry)?.bindjs?.sha256

                setPkg({ body, verified: declared === (await sha256(body)) })
            }
        } catch (cause) {
            setConnection(null)
            setError(cause instanceof Error ? cause.message : String(cause))
        } finally {
            setBusy(false)
            setPending(null)
        }
    }, [])

    useEffect(() => {
        void open(negotiation)
    }, [negotiation, open])

    /** Jump to a resource by uri — the pill under a tool's description. */
    const showResource = (uri: string) => {
        const found = connection?.resources.find((candidate) => candidate.uri === uri)

        if (found) {
            setPane('resources')
            setResource(found)
            setReading(null)
        }
    }

    const chooseTool = (next: Tool) => {
        setTool(next)
        setValues(initialValues(next.inputSchema as JsonSchema))
        setResult(null)
        setRender(null)
        setBridge([])
    }

    const run = async () => {
        if (!connection || !tool) {
            return
        }

        setBusy(true)
        setPending('call')
        setError(null)

        try {
            const args = toArguments(tool.inputSchema as JsonSchema, values)

            setResult(await connection.client.callTool({ name: tool.name, arguments: args }))

            /*
             * The View channel: the arguments the server just validated are the entry
             * component's props. Which component comes from the View this tool points at —
             * `_meta.ui.resourceUri` on the tool, then `_meta.ui.bindjs.component` on the
             * resource. A tool with no View simply draws nothing.
             */
            const view = connection.resources.find((candidate) => candidate.uri === uiMeta(tool)?.resourceUri)
            const component = uiMeta(view)?.bindjs?.component

            setBridge([])
            setRender(component ? { component, props: args, version: String(Date.now()) } : null)
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : String(cause))
        } finally {
            setBusy(false)
            setPending(null)
        }
    }

    /** Read a resource and check its digest, the way a host would before executing. */
    const read = async (which: Resource) => {
        if (!connection) {
            return
        }

        setBusy(true)
        setPending('read')
        setError(null)

        try {
            const { text: body, meta, result } = await readResource(connection.client, which.uri)

            // The content item's own `_meta` wins over the listing's (binding section 3).
            const declared = (meta ?? uiMeta(which))?.bindjs

            setReading({
                uri: which.uri,
                result,
                meta: meta ?? uiMeta(which),
                verified: await verdict(which, body, declared, pkg),
            })
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : String(cause))
        } finally {
            setBusy(false)
            setPending(null)
        }
    }

    return (
        <Flex direction="column" className="app" p="3" gap="3" style={{ overflow: 'hidden' }}>
            {/* ── Bar. Sits on the grid rather than in a card. ─────────────────── */}
            <Flex align="center" justify="between" px="1" gap="3" style={{ flexShrink: 0 }}>
                <Flex align="baseline" gap="3">
                    <Heading size="3">BindJS MCP inspector</Heading>
                    <Text size="1" color="gray">
                        {connection?.serverInfo
                            ? `${connection.serverInfo.name} ${connection.serverInfo.version}`
                            : 'not connected'}
                    </Text>
                </Flex>

                <Flex align="center" gap="3">
                    {busy && <Spinner size="1" />}
                    {pkg && (
                        <Badge color={pkg.verified ? 'grass' : 'red'}>
                            {pkg.verified ? 'package verified' : 'digest mismatch'}
                        </Badge>
                    )}
                    <Text size="1" color="gray">
                        host declares
                    </Text>
                    <Select.Root
                        size="1"
                        value={negotiation}
                        onValueChange={(value) => setNegotiation(value as keyof typeof NEGOTIATIONS)}
                    >
                        <Select.Trigger />
                        <Select.Content>
                            {Object.entries(NEGOTIATIONS).map(([key, option]) => (
                                <Select.Item key={key} value={key}>
                                    {option.label}
                                </Select.Item>
                            ))}
                        </Select.Content>
                    </Select.Root>
                    <Button size="1" variant="soft" onClick={() => void open(negotiation)}>
                        Reconnect
                    </Button>
                </Flex>
            </Flex>

            {error && (
                <Callout.Root color="red" size="1" style={{ flexShrink: 0 }}>
                    <Callout.Text>{error}</Callout.Text>
                </Callout.Root>
            )}

            {/* ── Three panes ──────────────────────────────────────────────────── */}
            <Flex gap="3" style={{ flex: 1, minHeight: 0 }}>
                {/* Sidebar */}
                <Flex direction="column" className="card" style={{ width: 300, flexShrink: 0, minHeight: 0 }}>
                    <Box p="4" pb="2" style={{ flexShrink: 0 }}>
                        <SegmentedControl.Root
                            size="1"
                            value={pane}
                            onValueChange={(value) => setPane(value as Pane)}
                            style={{ width: '100%' }}
                        >
                            <SegmentedControl.Item value="tools">Tools</SegmentedControl.Item>
                            <SegmentedControl.Item value="resources">Resources</SegmentedControl.Item>
                            <SegmentedControl.Item value="session">Session</SegmentedControl.Item>
                        </SegmentedControl.Root>
                    </Box>

                    <ScrollArea scrollbars="vertical" style={{ flex: 1, minHeight: 0 }}>
                        <Flex direction="column" gap="1" px="3" pb="4">
                            {pane === 'session'
                                ? connection &&
                                  sessionEntries(connection, pkg).map((item) => (
                                      <button
                                          key={item.name}
                                          className="row"
                                          data-selected={entry === item.name}
                                          onClick={() => setEntry(item.name)}
                                      >
                                          <Text as="p" size="2" weight="medium" mb="1">
                                              {item.name}
                                          </Text>
                                          <Text as="p" size="1" color="gray">
                                              {item.hint}
                                          </Text>
                                      </button>
                                  ))
                                : pane === 'tools'
                                ? connection?.tools.map((candidate) => {
                                      const view = uiMeta(candidate)?.resourceUri

                                      return (
                                          <button
                                              key={candidate.name}
                                              className="row"
                                              data-selected={tool?.name === candidate.name}
                                              onClick={() => chooseTool(candidate)}
                                          >
                                              <Flex align="center" gap="2" mb="1">
                                                  {/* ghost: monospace for an identifier,
                                                      without a chip behind every row */}
                                                  <Code size="2" variant="ghost" weight="medium">
                                                      {candidate.name}
                                                  </Code>
                                                  {view ? (
                                                      <Badge size="1">renders</Badge>
                                                  ) : (
                                                      <Badge size="1" color="gray">
                                                          data
                                                      </Badge>
                                                  )}
                                              </Flex>
                                              <Text as="p" size="1" color="gray">
                                                  {candidate.description}
                                              </Text>
                                          </button>
                                      )
                                  })
                                : connection?.resources.map((candidate) => {
                                      const bindjs = uiMeta(candidate)?.bindjs

                                      return (
                                          <button
                                              key={candidate.uri}
                                              className="row"
                                              data-selected={resource?.uri === candidate.uri}
                                              onClick={() => {
                                                  setResource(candidate)
                                                  setReading(null)
                                              }}
                                          >
                                              <Flex align="center" gap="2" mb="1">
                                                  <Text size="2" weight="medium">
                                                      {candidate.title ?? candidate.name}
                                                  </Text>
                                                  {bindjs?.spec && <Badge size="1">{bindjs.spec}</Badge>}
                                              </Flex>
                                              <Text as="p" size="1" color="gray">
                                                  {candidate.uri}
                                              </Text>
                                          </button>
                                      )
                                  })}

                            {connection && pane === 'resources' && connection.resources.length === 0 && (
                                <Callout.Root color="gray" size="1" m="1">
                                    <Callout.Text>
                                        Nothing listed. This host did not declare{' '}
                                        <Code size="1">{VIEW_MIME_TYPE}</Code>.
                                    </Callout.Text>
                                </Callout.Root>
                            )}
                        </Flex>
                    </ScrollArea>
                </Flex>

                {/* Detail + run — 2 of the remaining 5 */}
                <Box className="card" style={{ flex: 2, minWidth: 320, overflowY: 'auto' }}>
                    <Box p="4">
                        {pane === 'session' ? (
                            connection ? (
                                (() => {
                                    const entries = sessionEntries(connection, pkg)
                                    const current = entries.find((item) => item.name === entry) ?? entries[0]

                                    return (
                                        <Flex direction="column" gap="3">
                                            <Box>
                                                <Heading size="3">{current.name}</Heading>
                                                <Text as="p" size="2" color="gray" mt="1">
                                                    {current.hint}
                                                </Text>
                                            </Box>
                                            <Json value={current.value} />
                                        </Flex>
                                    )
                                })()
                            ) : (
                                <Text size="2" color="gray">
                                    Not connected.
                                </Text>
                            )
                        ) : pane === 'tools' ? (
                            tool ? (
                                <Flex direction="column" gap="3">
                                    <Box>
                                        <Heading size="3">{tool.title ?? tool.name}</Heading>
                                        <Text as="p" size="2" color="gray" mt="1">
                                            {tool.description}
                                        </Text>
                                        {/* The View this tool renders into and a way to go
                                            read it, then the hints the server sent about
                                            how the tool behaves. */}
                                        <Flex mt="2" gap="2" wrap="wrap" align="center">
                                            {uiMeta(tool)?.resourceUri && (
                                                <button
                                                    className="pill-button"
                                                    title="Show this resource"
                                                    onClick={() => showResource(uiMeta(tool)!.resourceUri!)}
                                                >
                                                    <Badge size="1" variant="soft" radius="full" color="gray">
                                                        {uiMeta(tool)?.resourceUri}
                                                    </Badge>
                                                </button>
                                            )}

                                            {Object.entries(tool.annotations ?? {})
                                                .filter(([, value]) => typeof value === 'boolean')
                                                .map(([name, value]) => (
                                                    <Badge
                                                        key={name}
                                                        size="1"
                                                        variant="soft"
                                                        radius="full"
                                                        color={value ? undefined : 'gray'}
                                                    >
                                                        {value ? name : `not ${name}`}
                                                    </Badge>
                                                ))}
                                        </Flex>
                                    </Box>

                                    <Separator size="4" />

                                    {/* The form is generated from a schema that was itself
                                        generated from a component (binding 2.5). */}
                                    <ToolForm
                                        inputSchema={tool.inputSchema as JsonSchema}
                                        values={values}
                                        onChange={setValues}
                                    />

                                    <Button onClick={() => void run()} disabled={pending === 'call'}>
                                        Call tool
                                    </Button>

                                    {result != null && (
                                        <Labelled label="result">
                                            <Json value={result} maxHeight={280} />
                                        </Labelled>
                                    )}

                                    {/* The listing entry as it arrived: schemas,
                                        annotations and `_meta` in one payload. */}
                                    <Labelled label="tools/list entry">
                                        <Json value={tool} maxHeight={340} />
                                    </Labelled>
                                </Flex>
                            ) : (
                                <Text size="2" color="gray">
                                    Pick a tool to build a form from its input schema.
                                </Text>
                            )
                        ) : resource ? (
                            <Flex direction="column" gap="3">
                                <Box>
                                    <Heading size="3">{resource.title ?? resource.name}</Heading>
                                    <Text as="p" size="1" color="gray" mt="1">
                                        {resource.uri}
                                    </Text>
                                    <Text as="p" size="1" color="gray">
                                        {resource.mimeType}
                                    </Text>
                                </Box>

                                {/* Everything a host can act on before it fetches
                                    anything, `_meta.ui` included. */}
                                <Labelled label="resources/list entry">
                                    <Json value={resource} maxHeight={300} />
                                </Labelled>

                                <Button variant="soft" onClick={() => void read(resource)} disabled={pending === 'read'}>
                                    Read resource
                                </Button>

                                {reading?.uri === resource.uri && (
                                    <>
                                        <Flex>
                                            <Badge
                                                color={
                                                    reading.verified.ok === null
                                                        ? 'gray'
                                                        : reading.verified.ok
                                                          ? 'grass'
                                                          : 'red'
                                                }
                                            >
                                                {reading.verified.text}
                                            </Badge>
                                        </Flex>

                                        {/* The whole response, as it came back. `_meta`
                                            and `text` sit side by side in `contents[0]`,
                                            which is the thing worth seeing: a View
                                            document names its component and nothing else,
                                            and the package it needs is in `_meta`. */}
                                        <Labelled label="resources/read">
                                            <Json value={elideSources(reading.result)} maxHeight={420} />
                                        </Labelled>
                                    </>
                                )}
                            </Flex>
                        ) : (
                            <Text size="2" color="gray">
                                Pick a resource to see the metadata a host decides on.
                            </Text>
                        )}
                    </Box>
                </Box>

                {/* Stage — 3 of the remaining 5 */}
                <Flex direction="column" gap="3" style={{ flex: 3, minWidth: 380, minHeight: 0 }}>
                    <Box style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                        <Flex align="center" justify="center" p="4" style={{ minHeight: '100%' }}>
                            {render && pkg?.verified && connection ? (
                                <Box className="stage-frame" p="4">
                                    <BindJSView
                                        key={render.version}
                                        packageBody={pkg.body}
                                        component={render.component}
                                        props={render.props}
                                        client={connection.client}
                                        version={render.version}
                                        onBridge={onBridge}
                                    />
                                </Box>
                            ) : (
                                <Box className="stage-empty" p="5">
                                    <Text as="p" size="2" color="gray">
                                        {!pkg
                                            ? 'No package — this host declared no type the server can serve.'
                                            : !pkg.verified
                                              ? 'Digest mismatch: nothing will be executed.'
                                              : 'Run a tool that carries a resourceUri to draw its View here.'}
                                    </Text>
                                </Box>
                            )}
                        </Flex>
                    </Box>

                    {/* Everything the rendered component sent back out (binding section 5). */}
                    <Box className="card" style={{ flexShrink: 0 }}>
                        <Flex
                            align="center"
                            justify="between"
                            px="4"
                            py="3"
                            onClick={() => setBridgeOpen((open) => !open)}
                            style={{ cursor: 'pointer' }}
                        >
                            <Flex align="center" gap="2">
                                <Text size="1" color="gray">
                                    bridge
                                </Text>
                                {bridge.length > 0 && (
                                    <Badge size="1" variant="soft">
                                        {bridge.length}
                                    </Badge>
                                )}
                            </Flex>
                            <IconButton size="1" variant="ghost" aria-label={bridgeOpen ? 'Minimise' : 'Maximise'}>
                                <Text size="1">{bridgeOpen ? '▾' : '▴'}</Text>
                            </IconButton>
                        </Flex>

                        {bridgeOpen && (
                            <Box px="4" pb="4">
                                <ScrollArea scrollbars="vertical" style={{ height: 104 }}>
                                    <Box className="code-block" p="2">
                                        {bridge.length === 0 ? '—' : bridge.join('\n')}
                                    </Box>
                                </ScrollArea>
                            </Box>
                        )}
                    </Box>
                </Flex>
            </Flex>
        </Flex>
    )
}
