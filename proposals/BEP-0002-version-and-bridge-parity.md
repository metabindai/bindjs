# BEP-0002: Version identification, bridge parity, and tool-result delivery

Status: Draft. Target: 1.0 (publication blocker for the first two items), 1.1 (third item).

## Motivation

The 2026-09-06 inventories found that no shipping runtime or renderer can state which BindJS version it implements: there is no version constant in `@metabindai/bindjs-runtime`, and the vendored bundles in `bindjs-apple` and `bindjs-android` carry no stamp. The Android bridge also lacks four of the nine bridge methods, and `ui/notifications/tool-result` has no first-class hook.

## Specification

1. **Version globals (1.0).** Every runtime MUST define `BindJS.spec` (string, the specification version) and `BindJS.runtime` (string, the implementation version). The runtime bundle MUST begin with a comment `/*! BindJS runtime <version>; spec <version> */`. Renderers MUST expose the embedded runtime's version through their public API (`BindJSContext.runtimeVersion`, `JsRuntime.runtimeVersion`, `Renderer.runtimeVersion`).
2. **Bridge parity (1.0).** Every host bridge MUST implement the nine methods of the `MCPHost` interface. Methods that are not applicable on a platform (`sizeChanged` on natively laid-out hosts) MUST be present and MUST resolve as no-ops. `bindjs-android` adds `requestDisplayMode`, `sizeChanged`, `sendRequest`, `sendNotification`.
3. **Tool result and display mode (1.1).** Add `useMCPHost().onToolResult(callback)` delivering `ui/notifications/tool-result`, and the Recommended environment key `displayMode` (`'inline' | 'fullscreen' | 'pip'`) updated from `host-context-changed`.
4. **Registry hygiene (1.0).** `ComponentNames.js` includes `Color` and is sorted; a test asserts each renderer's registry against the Core lists in `conformance/README.md`.

## Backward compatibility

Additive. Content authored today runs unchanged.

## Reference implementation

`bindjs-runtime` PR (items 1, 4), `bindjs-apple` PR (item 1), `bindjs-android` PR (items 1, 2).
