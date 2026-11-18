# Publish an image-led edition

An edition pairs a photograph with an index of named points. Readers can select a point on the image or choose it from the list. Further down the page, a photographic chapter index changes the image and its accompanying story together. [STRATA Field Atlas](https://tradelord223.github.io/design-atlas-mcp/editions/strata/) · [Lunar Archive](https://tradelord223.github.io/design-atlas-mcp/editions/lunar/) · [Edition editor](https://tradelord223.github.io/design-atlas-mcp/atlas-editor/)

## Adapt a source

1. Give your agent the existing page HTML and its original HTTPS URL. Call `inspect_edition_source` with `html` and `pageUrl`. It resolves image paths and lists source headings, descriptions, passages and control labels. Line and column references let you check the original.
2. Choose a legible headline, a cover photograph with identifiable points of interest, and a small collection of images that tell distinct stories. Confirm each image, credit and value. Point locations are measured on the picture, from its left and top edges.
3. Use the edition editor or pass the brief to `create_image_atlas`. The result contains `filename` and `html`. Save the HTML directly. Its CSS and JavaScript are inline, and images load from the specified URLs. Use the editor’s file pickers to embed your own photos locally. An edition with all photos embedded opens offline.

The source inventory handles static markup, including relative image paths and a document’s base URL. Dynamic state, CSS background images, media licenses and marker placement require separate inspection. Neither source inspection nor rendering downloads media to the MCP server.

## Brief

| Field | Meaning |
| --- | --- |
| `brand`, `edition`, `date` | Publication identity, edition name and date or source context. |
| `headline`, `deck`, `accent` | Cover title, short introduction and six-digit hexadecimal brand color. |
| `theme` (optional) | Brand `paper` and `ink` colors with at least 4.5:1 text contrast, and `display` set to `serif` or `sans`. |
| `image` | An HTTPS URL or embedded JPEG, PNG or WebP in `src`, and descriptive `alt`. The limit is 320,000 characters per embedded image and 440,000 across the brief. |
| `readings` | One to eight entries with a stable lowercase `id`, `label`, `value`, `title`, `body`, and numeric `x` and `y` from 0 to 100. Each can also use one of twelve bundled Lucide icons. |
| `chapters` | One to eight entries with a stable lowercase `id`, `kicker`, `title`, `body`, and `image`. |
| `sourceUrl`, `sourceLabel` | Visible source credit and link. |

[STRATA source brief](../examples/strata-edition.json) · [Lunar source brief](../examples/lunar-edition.json)

## Why STRATA changed

The original STRATA site already had a full-bleed aerial hero and clickable sensors. Inspection of its public shipped page module showed that clicking a sensor set the selected reading, and a shared dialog displayed the record. A browser check confirmed that closing the dialog restored keyboard focus. The new edition uses that same imagery and sample data in an editorial composition with an indexed map and photographic chapters. Readers can move among readings in context. [Original STRATA site](https://strata-agrisystems.raqmanplentiful.chatgpt.site/)

The public Details founder showcase demonstrated evaluating the composition before selecting navigation, button and hero effects. NASA’s Earth Observatory pairs a large image with an account of what it shows. The USGS Earth As Art series treats a satellite image as both an observation and a visual subject. These public examples informed the hierarchy and treatment of imagery. The Atlas renderer and its interactions are independent implementations. [Details showcase investigation](details-detail-workflow.md) · [NASA Earth Observatory](https://science.nasa.gov/gallery/earth-observatory-image-of-the-day/) · [USGS Earth As Art](https://www.usgs.gov/educational-resources/earth-art-image-gallery)

The original STRATA shipped JavaScript used for comparison on November 18, 2026 was `page-Co972tOD.js`, SHA-256 `a7af93427de2e690953e491dabf60bf7b297f0e0332743ea5d8b763d2d2a0d96`. The reverse-engineer-anything CLI returned evidence record `ev_2913d6141237701885f0b1224f68ac2b652a8ac6762a260893195d076011c007`. Public STRATA photographs retain their original attribution and are linked at their source. The 2024 values remain illustrative.
