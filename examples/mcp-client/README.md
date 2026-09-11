# A browser client for the BindJS MCP server

An MCP inspector: session, resources, tools, and the View rendered.

```sh
cd ../mcp-server && npm install && npm run serve   # :8787/mcp
npm install && npm run dev                         # :5185
```

The sidebar switches between tools, resources, and the session. The middle pane shows the
selected item, and builds a form from a tool's `inputSchema`. The right pane renders the
View, over a bridge log.

The picker top right is what the client declares under `io.modelcontextprotocol/ui`. Switch
it to HTML-only and reconnect: the Views leave `resources/list`, and `_meta.ui.resourceUri`
leaves the tools.

## Files

| Path | What it is |
|---|---|
| `src/mcp.ts` | Connect, negotiate, read a resource, verify its digest. |
| `src/ToolForm.tsx` | Builds a form from a tool's `inputSchema`. |
| `src/BindJSView.tsx` | Registers the package, attaches the bridge, paints the component. |
| `src/App.tsx` | The three panes and the negotiation control. |
| `src/panes.css` | The grid, the cards, the sidebar rows. |
| `src/index.css` | Gives the app the viewport, so only the cards scroll. |

## Not a sandbox

The runtime runs in this page: component sources are evaluated with `new Function` in this
document and share its globals. Binding section 4 requires an isolated context per View, on
the web the sandboxed iframe of SEP-1865. Do not read `BindJSView.tsx` as the sandbox
reference.

UI is [Radix Themes](https://www.radix-ui.com/themes).
