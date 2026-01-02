# RakNet3.5 API Documentation

## Scope
- Markdown documentation for External/RakNet3.5 Source headers.
- Unreal-style class references with signatures and summaries.
- Navigation pages and focused guides for core workflows.

## Success Metrics
- 100% Source/*.h reference pages present.
- Class index covers all classes/structs.
- Guides cover peer lifecycle, serialization, plugins, security, replication.

## Timeline
- Milestone 1: Inventory + scaffolding.
- Milestone 2: Reference pages generated.
- Milestone 3: Guides + QA pass.

## Dependencies
- External/RakNet3.5/Source headers.
- Existing Doxygen comments in headers.

## Milestones
1) Inventory + Scaffolding
- Spec sections: Problem, Goals, Architecture.
- Deliver README, Modules, ClassIndex.

2) Reference Pages
- Spec sections: Solution Sketch, Architecture.
- Generate per-header API references with signatures and summaries.

3) Guides + QA
- Spec sections: Goals, Risks, Mitigations, Metrics.
- Write guides and spot-check accuracy.

## Decision Log
- 12/30/25: Store docs under Docs/External/RakNet3.5 for repo-wide discovery.
- 12/30/25: Use header-derived Doxygen comments as primary source of truth.
