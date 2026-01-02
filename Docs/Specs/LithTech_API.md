# LithTech API Documentation Spec

## Problem
External/LithTech contains a large C/C++ API surface without Markdown documentation. Developers need a de-glossed, Unreal-style reference to understand the full API and how to use it.

## Goals
- Document the public API for all headers under External/LithTech (.h/.H/.hpp).
- Provide Unreal-style class references with clear summaries and signatures.
- Add navigation: README, module map, and class index.
- Add focused usage guides for core LithTech workflows.

## Non-goals
- No changes to LithTech source code or behavior.
- No FoM-specific reverse engineering beyond referencing LithTech APIs.
- No HTML output (Markdown only).

## Solution Sketch
- Parse headers to extract classes, structs, enums, free functions, macros, and Doxygen comments.
- Generate per-header reference pages under Docs/External/LithTech/Reference (mirroring directory paths).
- Write curated guides and top-level navigation pages.

## Architecture
- Docs/External/LithTech/README.md
- Docs/External/LithTech/Modules.md
- Docs/External/LithTech/ClassIndex.md
- Docs/External/LithTech/Guides/*.md
- Docs/External/LithTech/Reference/**/<header>.md

## Risks
- Parser misses complex declarations or conditional APIs.
- The reference set is large and may be hard to navigate without strong indexes.

## Mitigations
- Create module map by top-level folders.
- Generate a class index with direct links.
- Spot-check key SDK headers (engine/sdk/inc).

## Alternatives
- Use existing README/TODO or build Doxygen HTML (rejected: Markdown requirement).

## Rollout
- Phase 1: LithTech documentation only.
- Phase 2: Extend to other External modules as requested.

## Metrics
- Coverage: 100% of headers under External/LithTech documented.
- Accuracy: Spot-check at least 5 key SDK headers.
- Usability: README links to Modules and ClassIndex.
