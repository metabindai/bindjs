import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * No proxy. The client talks to the MCP server directly on :8787, which is why that server
 * sets CORS headers — Streamable HTTP hands back a session id in a response header, and a
 * dev proxy would have to forward that as well as the request.
 */
export default defineConfig({
    plugins: [react()],
    server: { port: 5185 },
})
