# Security

BindJS content carries executable JavaScript that runs in an isolated context. Reports about the sandbox contract (`bindings/mcp-apps.md`, section 4), a renderer that exposes more than the contract allows, or a component that can reach the host beyond the bridge, are security issues.

Report privately to security@metabind.ai. Do not open a public issue. We acknowledge within three business days and publish a fix and an advisory once affected implementations have shipped.

Renderer defects that make content misbehave without crossing the sandbox (a missing modifier, a wrong layout) are conformance gaps and belong in the tracker.
