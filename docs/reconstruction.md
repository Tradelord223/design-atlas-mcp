# Details reconstruction evidence

Research date 2026-11-18. This record describes the publicly observable Details MCP contract and the evidence available for an independent implementation. The implementation's own tool schemas and tests establish its behavior.

## Public product contract

Details documents two collections. Inspo contains captured sections and interactions from shipped websites. Vault contains packaged implementations with instructions and code. The public overview reported 3,569 inspirations and 71 Vault resources at inspection time. These are upstream inventory counts. [Inspo overview](https://www.details.so/inspo.md), [Vault overview](https://www.details.so/vault.md)

The documented transport is remote Streamable HTTP with JSON responses. The endpoint is `https://api.details.so/mcp`. Browser OAuth connects the user's Details account. The public guide describes paid tiers and a conditional free allowance. An unauthenticated initialize request returned HTTP 401 with the message `Connect your Details account before using this MCP server.` The response supplied OAuth protected resource metadata. [MCP guide](https://www.details.so/mcp.md), [OAuth metadata](https://api.details.so/.well-known/oauth-protected-resource)

## Tool inventory

Names and field spellings below are explicitly published in the first-party guide. The full JSON Schemas, exact response JSON shapes, defaults, and validation rules require authenticated discovery and remain unobserved.

| Public tool | Declared inputs or selectors | Declared result and workflow |
| --- | --- | --- |
| `search_inspirations` | `query`, `projectContext`, optional `projectBrief`; continuation with returned `nextSearchArguments` | Up to ten ordered candidates. Project brief includes business type, section purpose, and related industries. Refined searches preserve cumulative excluded IDs and use offset 0. |
| `get_inspiration` | Stable ID or slug, including slug extracted from `/inspo/<slug>` | One static image or seven ordered video frames and versioned evidence files. Consumers read `instructions.md`, inspect images, then read source excerpts before implementing. |
| `read_inspiration_bundle` | Files listed by retrieval, bounded reads, version selection | Instructions and evidence files. Transfer mode supports hash-checked saving. Exact transfer encoding and schema remain unobserved. |
| `read_inspiration_source` | Evidence files or selected source line range, character offset | Bounded pages within up to 400 numbered lines. Follow `nextOffset` before advancing lines. |
| `search_vault` | User request for a packaged Vault resource | Search across implementations such as accordions, text reveals, page transitions, and buttons. |
| `get_vault_resource` | Stable ID or slug, `content: "implementation"` explicitly documented | Canonical implementation prompt, documentation, or extra materials. Exact selectors for documentation and extras remain unobserved. |

The public guide describes four uses of a reference, including rebuilding with the user's content, selecting one detail, making variations, and combining parts from multiple references. Combining references requires recording which reference supplies which part and resolving conflicting layout or motion owners. A search preview supplies discovery context. Retrieval supplies implementation evidence. [MCP guide](https://www.details.so/mcp.md)

## Implementation coverage

| Documented capability | Atlas implementation | Verification |
| --- | --- | --- |
| Discovery and refinement | Project context, optional brief, pack/category/platform filtering, synonyms, ordered candidates and cumulative excluded IDs | The entire local catalog paginates exactly once. Search refinements retain their context. |
| Reference and visual inspection | Stable IDs and gallery links. Each original static study has a rendered PNG. Motion entries have seven timeline or scroll samples, captions in the manifest and file hashes. | The suite verifies the PNG signature, count and digest for every returned frame. The render job checks motion frames differ. |
| Versioned evidence and transfer | A content-derived version covers the source and image manifests. A source hash binds captures to the specimen document. Bounded transfer pages supply file and chunk SHA-256 digests. | Byte-for-byte transfer reconstruction, stale versions, invalid paths and Unicode-aware text offsets have regression coverage. |
| Source excerpts | Numbered lines and independent character continuation within a selected line range | Tests reconstruct a complete file through both continuation dimensions. |
| Vault | Search and retrieve implementation code, documentation or extras for each Atlas study | Official SDK clients exercise all three result types on both transports. |
| Rebuild, detail, vary and combine | Standalone HTML, DOM-subtree extraction, three comparison views and composition with attributed section and motion owners | Tool tests cover each mode, including a heading extraction that excludes unrelated content. |
| Server and clients | Stdio and Streamable HTTP, a catalog resource and a design-from-brief prompt | The official SDK exercises every tool on both transports. The HTTP suite also checks legacy initialization. |
| Additional brand workflows | Design systems and flows, SVG packs, brand identity extraction, source audit, brand kit generator and browser workshop | The test suite covers pack selection, source evidence, neutral/light accent contrast, browser interaction, downloads and local data handling. |
| Contributor content | A validated local pack import joins search, the Vault and the static gallery through the shared catalog | Import tests cover collisions, broken links, invalid manifests, rights notices and concurrent additions. See the [authoring guide](authoring.md). |

Atlas ranks local authored material using lexical and synonym matching. Account plans, credit enforcement and upstream private content belong to the original service. Links to Details and Mobbin open their official workflows. Atlas runs with no subscription and the public repository contains its own source, specimens and licensed icons.

## Evidence ledger

| ID | Evidence kind | Observation | Coverage |
| --- | --- | --- | --- |
| `PUB-MCP-20261118` | First-party documentation fetched over HTTPS | Six tool names and the behaviors above | Documentation only. Exact authenticated tool schemas remain unknown. |
| `HTTP-INIT-20261118` | Direct endpoint request | `POST /mcp`, JSON-RPC `initialize`, returned HTTP 401 | Authentication boundary observed. No authenticated retrieval or search response observed. |
| `PUB-OAUTH-20261118` | Direct discovery request | Resource `https://api.details.so/mcp`, bearer headers, declared authorization server | Public metadata only. No OAuth grant performed. |
| `ev_8c8958143e9360ddac0515ad5267c4759c18daf4483655954df505106d962000` | REA 6.9.0 static JavaScript application analysis | Parsed four public scripts, 338,761 text bytes, zero parse failures | Shared page shell and inline initialization. Alias limit 512 and semantic node limit 20,000 per file produced partial graph coverage. |
| `ev_7a3cf94eb8dc8f738dba731cfe73c525538b19915e05df68a0d55c9d04f7f0e1` | REA 6.9.0 static JavaScript application analysis | Parsed the public MCP page client, 10,150 bytes, zero parse failures | Public marketing interactions including connection instructions, clipboard feedback, variant animation, reduced-motion handling, and tabbed demos. Static semantic relationships remain conservative and contain unknowns. |

REA analyzed inert script text. Its static results do not establish server execution. The MCP page JavaScript implements the public marketing experience. Authenticated MCP handlers and private evidence storage were outside the supplied public artifacts.

REA analyzed the shipped scripts named by the public page. The ledger records the evidence identifiers, hashes and limits of those observations.

### Artifact identity

| Artifact | SHA-256 |
| --- | --- |
| Public `/mcp` HTML | `7abb779c844f65217282aec357692607da6fc328617f83e8de14dedc96bd16eb` |
| Public `/mcp.md` | `63432919db5ef09eb243952fcd8c24aad78936fc3596f417a79a05b612a51f4c` |
| Public `/_astro/mcp.Bk41J2zt.js` | `94d009e17b25febbe2783df1484a36517d7ddee5933074395cab373951f29743` |

## Remaining unknowns

Authenticated `tools/list` schemas, production search ranking, private capture and source extraction pipelines, corpus contents, credits enforcement internals, and exact private result formats remain unobserved. The upstream guide states that search context is sent to OpenAI for ranking. The underlying ranking prompt and implementation are unknown. Public pages expose metadata and media links. Full evidence, behavior summaries, source excerpts, and Vault code require the authenticated MCP. [MCP guide](https://www.details.so/mcp.md)

This evidence supports an independent reconstruction of the documented workflows and a clear parity checklist. Claims of exact authenticated service equivalence require authenticated protocol observations and comparison tests.
