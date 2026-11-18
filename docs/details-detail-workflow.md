# What the Details showcase changed

On November 18, 2026, we compared Details’ public demo, a founder’s video, and Design Atlas 1.0.1. The founder starts with a polar-expedition site whose headline sits beside a rounded iceberg photograph. He lets the photograph fill the hero, places the headline over it, and simplifies the navigation. STRATA already used that composition. The Atlas field study therefore explores two narrower changes on the original page. [Details MCP](https://www.details.so/mcp) · [Founder’s post](https://x.com/koppkev/status/2122633959888851130) · [Interactive STRATA field study](https://tradelord223.github.io/design-atlas-mcp/field-study/)

## The public reference workflow

| Observed action | Evidence | What the evidence supports |
| --- | --- | --- |
| Find inspiration | The first tab returns Agrumea Farm, Vucko, Horeca Social, LxL Creative and SOHub for a request about presenting services. | A user can compare named references addressing the same design need. |
| Create variations and choose one | The next two tabs present four alternatives for a named reference, then a preloader result after the illustrated user selects Variant 4. | The promotional page demonstrates choosing a treatment for one interaction. A browser session exercised all four tabs. |
| Select a Vault resource | The fourth tab shows navigation resources. Individual public pages also identify [Morphing Drawer](https://www.details.so/vault/morphing-drawer), [Flood Navigation](https://www.details.so/vault/flood-navigation) and [Accordion Strips](https://www.details.so/vault/accordion-strips). | A named implementation is a separate route from reference exploration. Public pages establish the names and presentation. |
| Refine the foundation | In the founder’s film, a checklist covers decluttering, spacing, copy, alignment, type and imagery. The recognizable iceberg becomes full-bleed. | The visible change to composition precedes the interaction effects. |
| Add interaction | The film labels a navigation dropdown with an image preview, an arrow-shift button and a hero reveal. A small central iceberg crop opens into the finished hero. | The film shows these behaviors. Exact timing, original code and specific Vault records are unverified. |

The founder’s post is a likely match for the remembered showcase. Its publicly available video establishes the design changes independently of whether it was the exact tweet.

## What changed in Atlas

At [the 1.0.1 baseline](https://github.com/Tradelord223/design-atlas-mcp/blob/ca508a2cf71061edb8c24a5f887fada85ad696d8/src/remix.js), every reference offered the same three changes to typography, spacing and palette. That left a user asking for a different opening animation with no working alternative to select.

In 1.1.0, seven references each supply four working motion treatments. The reference, trigger and selected CSS travel with the export. The new Editorial Wayfinding pack contains an image reveal, destination preview menu and shifting link arrow. Its illustrated coastline and contour plates were created for Atlas.

The STRATA field study keeps the original aerial photograph, headline, telemetry and sensor positions. One control auditions four image openings on the same photograph. Another enables short field notes on hover or focus. Activating a sensor opens its full reading. The MCP checks supplied source selectors, returns the original markup and its checksum, and emits integration files for either the hero reveal or the field notes. An existing site can use these files independently of the Atlas gallery.

## Method and reproducibility

We used anonymous browser access to the official promotional page, its shipped JavaScript and the public clip. The authenticated Details protocol, private ranking and licensed implementation library were outside the evidence set.

- Chromium clicked each of the four official tabs and observed the corresponding conversation.
- The [shipped MCP browser module](https://www.details.so/_astro/mcp.Bk41J2zt.js) coordinates tab selection, reduced motion and result-video playback. The [layout module](https://www.details.so/_astro/Layout.astro_astro_type_script_index_0_lang.Dez5ISda.js) imports it. This identifies a scripted promotional interface. Its client code does not expose the private server’s implementation.
- The reverse-engineer-anything CLI analyzed each downloaded JavaScript artifact using the command below. The MCP module’s partial graph had one application-level unknown and 1,655 semantic unknowns. The broader layout analysis reached graph and alias-selection limits.
- [Public embed metadata](https://api.fxtwitter.com/koppkev/status/2122633959888851130) identified Twitter media ID `2122633876153716736`. We sampled frames from its first-party 960 × 720 rendition. Container duration was 28.949 seconds. The source footage stays with its publisher.

```sh
rea analyze-javascript-application ./artifact \
  --source-path mcp.js --detail summary \
  --evidence_output ./rea-mcp-evidence.json --format json
```

| Artifact | SHA-256 | REA evidence identity |
| --- | --- | --- |
| Official public MCP page | `7abb779c844f65217282aec357692607da6fc328617f83e8de14dedc96bd16eb` | Browser observation |
| MCP browser module | `94d009e17b25febbe2783df1484a36517d7ddee5933074395cab373951f29743` | `ev_4ba36aa9d840a88addf4a84581fe2b9812d6cd2221aa9dc3cb78bdd0269823c1` |
| Layout module | `b9ea98e89118706e61ed2000e8aa5f31c4007c7d571b0403600ddd7fe3c5a7dd` | `ev_395edcb168447ca0fc69c53d772a27870db3cfb06e3f6288283c47232fb7994b` |
| Founder clip | `06047ed632c874b3b0e90ea70a1e3a0bac7ceaedff9f1dc7a1890c1e9811e947` | Frame sampling |
