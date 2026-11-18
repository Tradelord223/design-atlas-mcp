# Add a contributor design pack

Contributor packs extend the same catalog used by MCP search, retrieval, brand kits, the gallery and the browser workbench. Import a reviewed JSON file into a trusted local source checkout, render its previews, and rebuild the gallery. The importer writes one static module at `src/extensions.js`. All earlier imports and the bundled library stay available offline.

## Import and verify

Run these commands from the repository root with Node.js 22.16 or later. The JSON path must be absolute.

```sh
npm ci
node scripts/add-pack.js /absolute/path/to/pack.json
npm run render -- harbor-newsletter
npm run gallery
npm test
```

The render command accepts all new reference IDs printed by the importer. It uses a locally installed Chromium browser. Set `CHROME_PATH` to its executable when your browser is installed elsewhere. The renderer's current default is Google Chrome on macOS. Generate previews before retrieving a new reference through MCP. Image evidence is built from the authored specimen.

Restart a running MCP server after an import. The catalog loads once at startup. Open `dist/site/index.html` through a local HTTP server to review the rebuilt gallery. The workbench is available at `dist/site/workbench.html`. Include `src/extensions.js` and the new directories under `assets/previews/` when sharing the source or building a release.

## Manifest format

A manifest has `schemaVersion: 1`, a `patterns` array, a nonempty `packs` array, and an optional `flows` array. Each collection accepts at most 200 items. The JSON file limit is 2 MB. IDs use lowercase words separated by hyphens and are unique across all three collections, the bundled catalog and previous imports.

The example below supplies one original reference and one pack. Save it as your JSON input and replace the content and attribution with your actual work.

```json
{
  "schemaVersion": 1,
  "patterns": [
    {
      "id": "harbor-newsletter",
      "title": "A clear newsletter invitation",
      "summary": "A visible label and a single subscription action for a local journal.",
      "category": "forms",
      "tags": ["newsletter", "editorial"],
      "platform": "web",
      "sourceName": "Harbor Journal design study",
      "sourceUrl": "https://example.com/harbor-design-study",
      "provenance": "Original layout, copy and code authored by the contributor. The source page documents the study.",
      "rights": { "kind": "original", "license": "MIT" },
      "observedAt": "2026-11-18",
      "html": "<section class=\"atlas-specimen\"><h2>Dispatches from the harbor</h2><form><label for=\"harbor-email\">Email address</label><input id=\"harbor-email\" type=\"email\" autocomplete=\"email\" required><button type=\"submit\">Subscribe</button></form></section>",
      "css": ".atlas-specimen{--paper:#fffdf7;--ink:#243b35;--accent:#215c47;background:var(--paper);color:var(--ink);padding:32px;font:16px/1.5 system-ui}.atlas-specimen label{display:block}.atlas-specimen input,.atlas-specimen button{font:inherit;min-height:44px;margin-top:8px}.atlas-specimen button{background:var(--accent);color:white;border:0;padding:10px 18px}.atlas-specimen :focus-visible{outline:3px solid #6b4f17;outline-offset:3px}",
      "implementation": ["Connect the form to the actual subscription endpoint and show pending, success and retry states."],
      "accessibility": ["Keep the visible label, autocomplete hint and keyboard focus indicator."],
      "states": ["default", "invalid email", "submitting", "success", "failure"],
      "responsive": "Allow the form controls to stack at narrow widths.",
      "specimenBehavior": "Native form validation is available. Subscription delivery requires an application endpoint."
    }
  ],
  "packs": [
    {
      "id": "harbor-editorial",
      "title": "Harbor editorial",
      "summary": "Warm paper, clear typography and restrained green accents for a small publication.",
      "tags": ["editorial", "local"],
      "patterns": ["harbor-newsletter"],
      "tokens": {
        "colors": {
          "background": "#fffdf7",
          "surface": "#ffffff",
          "text": "#243b35",
          "muted": "#59675c",
          "accent": "#215c47",
          "border": "#c6cec0"
        },
        "radius": { "control": "4px" }
      },
      "principles": ["Use the publication’s actual reporting to explain its value.", "Keep reading measure and form labels clear."],
      "sourceName": "Harbor Journal design study",
      "sourceUrl": "https://example.com/harbor-design-study",
      "provenance": "Original token choices and composition authored by the contributor.",
      "rights": { "kind": "original", "license": "MIT" }
    }
  ],
  "flows": []
}
```

Every reference must belong to an existing or newly imported pack. Pack `patterns` and flow `steps[].pattern` can link to bundled references and previous imports. References resolve after validating the entire manifest, so declaration order has no effect.

A flow includes the common ID, title, summary, tags, source and rights fields, plus `steps` and `successMetric`. Each step requires `title`, `pattern`, `goal` and `failure`. Provide one to forty steps. An example step is `{"title":"Enter an address","pattern":"harbor-newsletter","goal":"Subscribe with a valid email address.","failure":"Keep the address and offer retry after a failed request."}`.

## Attribution and distribution

Every reference, pack and flow requires a descriptive `sourceName`, HTTPS `sourceUrl`, and `provenance` explaining what was authored and what the cited source informed. URL validation checks syntax and credentials. It performs no network requests or ownership verification.

The `rights` object declares `kind` as `original` or `licensed` and supplies a `license`. Licensed material also requires complete `licenseText`, including attribution notices. Import only material you can redistribute in this public repository and package. A URL or a screenshot of someone’s site supplies reference context. Confirm the rights for any code or assets you include. The importer validates the declaration and retains it with the catalog entry. The contributor remains responsible for its accuracy.

## Trusted JavaScript and rendering

The importer reads JSON and checks JavaScript syntax without executing the imported code. It does load the trusted checkout’s existing catalog modules to validate references.

A pattern can provide optional `js` containing ordinary browser JavaScript. When `js`, script tags, HTML event handlers or JavaScript URLs are present, the manifest must explicitly declare `"trustedJavaScript": true`. Set this after reviewing the complete manifest. Contributor code executes when the specimen is rendered, when an exported HTML file opens, and when it becomes part of a brand kit. The gallery uses an iframe sandbox for previews. The renderer and generated standalone pages execute as their own browser documents.

Keep scripts self-contained. Prefix DOM IDs, scope queries to the specimen, and avoid external services, credentials or assumptions about a parent document. Use `.atlas-specimen` and CSS variables `--paper`, `--ink`, `--muted`, `--accent` and `--line` when the specimen should adapt to brand-kit colors. The importer accepts original HTML and CSS directly and preserves their content. It does not fetch remote media. Imported references receive static poster evidence from the renderer. The importer currently accepts still specimens, including interactive JavaScript. Seven-frame motion capture configuration requires an authored source module.

## Failure and concurrency behavior

Validation finishes before replacing `src/extensions.js`. Duplicate IDs, broken references, unknown fields, missing attribution, invalid dates or colors, and invalid script syntax leave the existing module intact. A successful import atomically replaces that one module with the merged catalog data.

A lock at `src/.extensions-import.lock` permits one importer at a time. A concurrent importer exits with a clear message and can be retried after the first finishes. If a process is terminated abruptly, confirm that it has stopped before removing a leftover lock directory. Then rerun the same import. Ordinary success and failure paths remove their temporary files and lock.

Review an imported specimen in the browser with real content, keyboard navigation, narrow widths and reduced motion. `npm test` checks declared references and preview integrity across the full catalog. Keep the preview files and their manifests together so retrieval can verify their hashes.
