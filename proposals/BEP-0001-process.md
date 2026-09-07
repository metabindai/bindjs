# BEP-0001: The BindJS Enhancement Proposal process

Status: Accepted (by publication). Author: Trevor Stout (Metabind).

## Purpose

BindJS changes in public. A BEP is the unit of change to the specification, its bindings, or its conformance surface. The process is deliberately small and follows the shape the MCP community uses for SEPs so that reviewers from that community recognize it.

## When a BEP is required

- Adding, removing, or changing a Core component, modifier, hook, global, environment key, or AST contract.
- Adding or changing a binding (MCP Apps, A2UI) or registering a new one.
- Changing conformance levels or the statement format.

Editorial fixes, examples, and renderer gap closures (an implementation catching up to 1.0) do not need a BEP; they are pull requests.

## Lifecycle

`Draft` (PR opened under `proposals/BEP-NNNN-<slug>.md`) to `Review` (at least 14 days, where an implementer outside the author's organization exists, at least one has commented) to `Accepted` (merged; the specification text is updated in the same PR) or `Rejected` (kept for the record). An accepted BEP that adds surface targets the next minor version and is marked `Final` when two renderers ship it.

## Template

Title, status, author, target version, motivation, specification text (the exact diff to the chapters), backward compatibility, security considerations, reference implementation, open questions.

## Roles

Editors: the maintainers of `metabindai/bindjs`, initially Trevor Stout, Ollie Wagner, Dave Fumberger, and Emory Al-Imam (Metabind), listed in `AUTHORS.md`. Editors merge; they do not have a veto over a proposal that meets the bar and has two shipping implementations.
