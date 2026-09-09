/**
 * Prints the whole conversation, in order.
 *
 * `bindings/mcp-apps-walkthrough.md` follows one tool from `initialize` to the first
 * render. This runs it: a client connected to the server in-process, over an in-memory
 * transport, printing what actually goes across. Read it beside the document — if the two
 * ever disagree, one of them is wrong.
 *
 * It stops where a real host would start executing. There is no runtime here, so nothing
 * renders; what it shows is everything up to the point where the host has verified bytes
 * it is willing to run.
 */
import { createHash } from 'node:crypto'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'

import { createServer, PACKAGE_URI, VIEWS, VIEW_MIME_TYPE } from './server.js'

const HTML_MIME_TYPE = 'text/html;profile=mcp-app'

function heading(step: string, title: string): void {
    console.log(`\n\x1b[1m${step}  ${title}\x1b[0m`)
}

function show(label: string, value: unknown): void {
    console.log(`\x1b[2m${label}\x1b[0m`)
    console.log(JSON.stringify(value, null, 2))
}

/** Connects a client that declares the given View content types, as a host would. */
async function connect(mimeTypes: string[]): Promise<Client> {
    const client = new Client(
        { name: 'bindjs-walkthrough', version: '1.0.0' },
        { capabilities: { extensions: { 'io.modelcontextprotocol/ui': { mimeTypes } } } }
    )

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()

    await Promise.all([createServer().connect(serverTransport), client.connect(clientTransport)])

    return client
}

async function main(): Promise<void> {
    heading('1.', 'Handshake — the host says what it renders')
    show('initialize params.capabilities (client)', {
        extensions: { 'io.modelcontextprotocol/ui': { mimeTypes: [VIEW_MIME_TYPE, HTML_MIME_TYPE] } },
    })

    const client = await connect([VIEW_MIME_TYPE, HTML_MIME_TYPE])

    heading('2.1', 'tools/list — the tool derived from the entry component')
    const { tools } = await client.listTools()
    show('result', tools)

    heading('2.2', 'resources/list — one View per tool, and the package they share')
    const { resources } = await client.listResources()
    show('result', resources)

    heading('3.a', 'resources/read — each View document names its own entry component')

    for (const view of Object.values(VIEWS)) {
        show(view.uri, await client.readResource({ uri: view.uri }))
    }

    heading('3.b', 'resources/read — the package')
    const read = await client.readResource({ uri: PACKAGE_URI })
    const contents = read.contents[0] as { uri: string; mimeType?: string; text: string }
    const body = contents.text
    const parsed = JSON.parse(body) as { components: Record<string, string> }

    show('result (component sources elided)', {
        contents: [
            {
                ...contents,
                text: JSON.stringify({
                    ...parsed,
                    components: Object.fromEntries(
                        Object.entries(parsed.components).map(([name, source]) => [
                            name,
                            `${source.slice(0, 48).replace(/\n/g, ' ')}… (${source.length} chars)`,
                        ])
                    ),
                }),
            },
        ],
    })

    heading('3.c', 'The host’s checks, before any code exists to constrain')
    const declared = (resources.find((resource) => resource.uri === PACKAGE_URI)?._meta as any).ui.bindjs
    const digest = createHash('sha256').update(body, 'utf8').digest('hex')

    console.log(`  sha256(text)  ${digest}`)
    console.log(`  _meta         ${declared.sha256}`)
    console.log(`  match         ${digest === declared.sha256 ? 'yes — safe to execute' : 'NO — do not execute'}`)
    console.log(`  size          ${Buffer.byteLength(body, 'utf8')} vs ${declared.size}`)
    console.log(`  spec major    ${declared.spec}`)
    console.log(`  components    ${Object.keys(parsed.components).join(', ')}`)

    heading('4.', 'tools/call product_card — the View channel')

    const cardArguments = {
        sku: 'woven-dusk-throw',
        height: 'large',
        badges: [{ _type: 'ComponentInstance', _component: 'NewBadge', _id: 'b1' }],
    }

    show('params.arguments — every field is one the model can actually decide', cardArguments)
    show(
        'result — only the model’s side; the arguments are the props',
        await client.callTool({ name: 'product_card', arguments: cardArguments })
    )

    /*
     * The next three are the host's, not the server's. They are printed because they are
     * what the tool call is *for*: the arguments reach the component as props while the
     * model is still writing them, so the card is on screen before anything is fetched.
     */
    console.log('\n\x1b[2m  host → View, while the model is still emitting (illustrated):\x1b[0m')
    console.log('  ui/notifications/tool-input-partial  { sku: "woven-dusk-th" }')
    console.log('  ui/notifications/tool-input-partial  { sku: "woven-dusk-throw", height: "large" }')
    console.log('  ui/notifications/tool-input          ' + JSON.stringify(cardArguments))
    console.log('\x1b[2m  ProductCard now has its props: right size, right badges, placeholders')
    console.log('  where the facts go. Then it fetches them itself.\x1b[0m')

    heading('5.', 'tools/call product_lookup — the component, through the bridge')
    console.log('\x1b[2m  View → host: useMCPHost().toolCall("product_lookup", { sku })\x1b[0m')
    show('result', await client.callTool({ name: 'product_lookup', arguments: { sku: 'woven-dusk-throw' } }))
    console.log('\x1b[2m  The runtime unwraps structuredContent, so the component gets this object')
    console.log('  directly. A component that could declare its own fetch would have had it')
    console.log('  with the first render, and this tool would not need to exist.\x1b[0m')

    heading('6.', 'tools/call product_search — the same construction, a different component')
    show('result', await client.callTool({ name: 'product_search', arguments: { query: 'walnut' } }))
    show(
        'and its component’s lookup',
        await client.callTool({ name: 'product_lookup', arguments: { query: 'walnut' } })
    )

    heading('7.', 'tools/call add_to_cart — the card calling back through the bridge')
    show('result', await client.callTool({ name: 'add_to_cart', arguments: { sku: 'woven-dusk-throw' } }))

    await client.close()

    heading('8.', 'The same server to a host that did not negotiate the type')
    const htmlOnly = await connect([HTML_MIME_TYPE])

    show('resources/list', (await htmlOnly.listResources()).resources)
    show(
        'tools/list — no ui.resourceUri, so nothing to render into',
        (await htmlOnly.listTools()).tools.map((tool) => ({ name: tool.name, _meta: tool._meta }))
    )
    show(
        'tools/call product_lookup — the data tool is unaffected',
        await htmlOnly.callTool({ name: 'product_lookup', arguments: { query: 'walnut' } })
    )

    await htmlOnly.close()
}

await main()
