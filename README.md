# ensure-hopjs

A small Node.js CLI that audits and optionally rewrites compatible CDN imports to use [hop.js](https://bunny.net/blog/introducing-hop-js-a-safe-free-cdn-for-open-source-projects-without-the-privacy-tax/).

It scans common source files for static CDN URLs and converts supported jsDelivr npm and cdnjs URLs to `https://cdn.hopjs.net/...` using the URL formats documented by hop.js.

## Install

```bash
aube install -D ensure-hopjs
```

Or run directly with `aubr` (or others) after publishing:

```bash
aube ensure-hopjs
```

## Usage

Audit the current project:

```bash
ensure-hopjs
```

Rewrite supported CDN URLs:

```bash
ensure-hopjs --write
```

Fail CI when rewrite candidates or unsupported CDN URLs are found:

```bash
ensure-hopjs --check
```

Scan a specific directory:

```bash
ensure-hopjs --root ./src
```

## package.json scripts

```json
{
  "scripts": {
    "hopjs:check": "ensure-hopjs --check",
    "hopjs:fix": "ensure-hopjs --write"
  }
}
```

## hop.js URL formats this package targets

According to the hop.js docs, the canonical formats are:

```txt
https://cdn.hopjs.net/npm/{package_name}@{package_version}/{file_path}
https://cdn.hopjs.net/ajax/libs/{package_name}/{package_version}/{file_path}
```

For example:

```txt
https://cdn.hopjs.net/npm/jquery@3.7.1/dist/jquery.min.js
https://cdn.hopjs.net/ajax/libs/bootstrap/5.3.8/css/bootstrap.min.css
```

## What gets rewritten

jsDelivr npm URLs:

```js
import confetti from "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.module.mjs";
```

becomes:

```js
import confetti from "https://cdn.hopjs.net/npm/canvas-confetti@1.9.3/dist/confetti.module.mjs";
```

cdnjs URLs:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/0.180.0/three.module.min.js"></script>
```

becomes:

```html
<script src="https://cdn.hopjs.net/ajax/libs/three.js/0.180.0/three.module.min.js"></script>
```

## Supported automatic rewrites

This package intentionally rewrites only URL shapes that match hop.js's current npm/cdnjs compatibility scope:

- `https://cdn.jsdelivr.net/npm/...`
- `https://cdnjs.cloudflare.com/ajax/libs/...`

## Flagged for manual review

These are not automatically rewritten:

- jsDelivr non-npm paths such as `/gh/...`, `/wp/...`, and `/combine/...`
- cdnjs URLs that do not use `/ajax/libs/...`
- URLs with query strings, because they may depend on CDN-specific transformations, bundling, minification, or cache behavior
- `unpkg.com`
- `esm.sh`
- `cdn.skypack.dev`
- `jspm.dev`
- `ga.jspm.io`
- `cdn.pika.dev`

## Notes

This tool only checks static URL-based imports and asset references. It does not modify normal package imports like:

```js
import React from "react";
```

Those are resolved by your package manager or bundler, not directly from a browser CDN.

hop.js does not support advanced features such as on-the-fly minification, bundling, or transformation. This package therefore flags query-string URLs for manual review instead of rewriting them automatically. Prefer explicit pre-minified files such as `*.min.js` or `*.min.css` when the package ships them.

If an HTML tag already has an `integrity` attribute, the hash is content-based and may continue to work if the file bytes are identical after moving to hop.js. Still, test the page after rewriting; the hop.js package pages provide SHA-256 SRI values.

## Development

Run tests:

```bash
aubr test
```

Run the smoke check against the sample project:

```bash
aubr test:smoke
```

## License

MIT
