/**
 * The rendering half: a verified package, executed, painted.
 *
 * The steps are the host's steps from binding `mcp-apps.md`. The package has already been
 * read and its digest checked (`src/mcp.ts`); here its component sources are registered in
 * a runtime, the bridge is attached, and the entry component is drawn with the tool's
 * arguments as its props — which is the View channel, section 2.4.
 *
 * One honest caveat, stated because this is a specification repository. Section 4 requires
 * an isolated context per View, and on the web that is the sandboxed iframe of SEP-1865.
 * This runs the runtime in the page instead: the component sources are evaluated with
 * `new Function` in this document, so they share its globals. That is fine for a local
 * inspector and is not what a conforming host does.
 */
import { useEffect, useMemo } from 'react'
import { Renderer, useBindJSRuntime } from '@metabindai/bindjs-react'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'

/** The bridge (binding section 5). Every way out of a component goes through this. */
function makeBridge(client: Client, log: (line: string) => void) {
    return {
        /*
         * `toolCall` resolves to the tool's structured data directly, not the MCP envelope:
         * `structuredContent` when present, else the first text block parsed as JSON, else
         * the raw text. It throws when the tool reports an error (specification, ch. 05).
         */
        toolCall: async (name: string, args?: Record<string, unknown>) => {
            log(`toolCall ${name} ${JSON.stringify(args ?? {})}`)

            const result = (await client.callTool({ name, arguments: args ?? {} })) as {
                isError?: boolean
                structuredContent?: unknown
                content?: { type: string; text?: string }[]
            }

            if (result.isError) {
                throw new Error(result.content?.find((part) => part.type === 'text')?.text ?? `${name} failed`)
            }

            if (result.structuredContent !== undefined) {
                return result.structuredContent
            }

            const text = result.content?.find((part) => part.type === 'text')?.text ?? ''

            try {
                return JSON.parse(text)
            } catch {
                return text
            }
        },

        sendMessage: async (message: string) => log(`sendMessage ${JSON.stringify(message)}`),
        updateModelContext: async (content: Record<string, unknown>) =>
            log(`updateModelContext ${JSON.stringify(content)}`),
        openLink: async (url: string) => log(`openLink ${url}`),
        requestDisplayMode: async (mode: string) => log(`requestDisplayMode ${mode}`),
        sizeChanged: (height: number) => log(`sizeChanged ${height}`),
        log: (level: string, message: string) => log(`log[${level}] ${message}`),
        sendRequest: async (method: string) => log(`sendRequest ${method}`),
        sendNotification: (method: string) => log(`sendNotification ${method}`),
    }
}

interface Props {
    /** The verified package document body, as served. */
    packageBody: string
    /** The View's entry component. */
    component: string
    /** The tool's arguments — on the View channel these *are* the props (2.4). */
    props: Record<string, unknown>
    client: Client
    /** Bumped per call, so a repeat of the same call still re-renders. */
    version: string
    onBridge: (line: string) => void
}

export function BindJSView({ packageBody, component, props, client, version, onBridge }: Props) {
    const runtime = useBindJSRuntime(`view:${component}`)

    const components = useMemo(
        () => (JSON.parse(packageBody) as { components: Record<string, string> }).components,
        [packageBody]
    )

    useEffect(() => {
        // The package is the allowlist: these names, and nothing else, have an
        // implementation for this render (specification, chapter 10).
        runtime.registerComponents(components)
    }, [runtime, components])

    useEffect(() => {
        runtime.mcpHost = makeBridge(client, onBridge)
    }, [runtime, client, onBridge])

    /*
     * Host context to BindJS environment keys (binding 5.2): `theme` becomes
     * `colorScheme`, `locale` becomes `locale`, `containerDimensions` becomes `screen`.
     */
    const environment = useMemo(
        () => ({
            colorScheme: window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
            locale: navigator.language,
            platform: 'web',
        }),
        []
    )

    return (
        <Renderer
            runtime={runtime}
            componentName={component}
            props={props}
            usePreviews={false}
            version={version}
            environment={environment}
        />
    )
}
