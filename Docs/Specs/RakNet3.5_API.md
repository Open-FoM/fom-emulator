# RakNet3.5 API Documentation Spec

## Problem
External/RakNet3.5 ships a large C++ API surface without Markdown documentation. Developers need a de-glossed, Unreal-style reference to understand the full API and how to use it.

## Goals
- Document the public API for all Source headers in External/RakNet3.5.
- Provide Unreal-style class references with clear summaries and signatures.
- Add navigation: README, module map, and class index.
- Add focused usage guides for core workflows (peer lifecycle, serialization, plugins, security, replication).

## Non-goals
- No changes to RakNet source code or behavior.
- No FoM-specific reverse engineering beyond referencing RakNet APIs.
- No HTML output (Markdown only).

## Solution Sketch
- Parse Source headers to extract classes, structs, enums, free functions, macros, and Doxygen comments.
- Generate per-header reference pages under Docs/External/RakNet3.5/Reference.
- Write curated guides and top-level navigation pages.

## Architecture
- Docs/External/RakNet3.5/README.md
- Docs/External/RakNet3.5/Modules.md
- Docs/External/RakNet3.5/ClassIndex.md
- Docs/External/RakNet3.5/Guides/*.md
- Docs/External/RakNet3.5/Reference/*.md

## Risks
- Parser misses complex declarations or conditional APIs.
- Reference pages become too dense for quick scanning.

## Mitigations
- Spot-check critical headers (RakPeerInterface, BitStream, ReliabilityLayer, MessageIdentifiers).
- Keep consistent formatting and linkable indexes.

## Alternatives
- Use Help/ HTML or Doxygen output as-is (rejected: Markdown requirement).

## Rollout
- Phase 1: RakNet3.5 documentation only.
- Phase 2: Extend to other External modules.

## Metrics
- Coverage: 100% of Source/*.h reference pages created.
- Accuracy: Spot-check at least 5 critical headers.
- Usability: Navigation paths from README to class pages.
