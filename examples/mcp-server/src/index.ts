/**
 * stdio entry point. This is what a host launches.
 *
 * stdio because the interesting part of the example is the messages, and stdio is the
 * transport every host can start without a port, a certificate, or a CORS policy. The
 * server itself is transport-agnostic — hand `createServer()` a Streamable HTTP transport
 * instead and nothing above changes.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { createServer } from './server.js'

await createServer().connect(new StdioServerTransport())
