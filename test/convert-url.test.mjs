import assert from "node:assert/strict";
import { test } from "node:test";
import { convertUrl } from "../src/convert-url.mjs";

test("rewrites jsDelivr npm URLs", () => {
  assert.deepEqual(
    convertUrl("https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.module.mjs"),
    {
      type: "rewrite",
      from: "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.module.mjs",
      to: "https://cdn.hopjs.net/npm/canvas-confetti@1.9.3/dist/confetti.module.mjs",
      source: "jsDelivr npm",
    }
  );
});

test("rewrites jsDelivr scoped npm URLs", () => {
  assert.equal(
    convertUrl("https://cdn.jsdelivr.net/npm/@picocss/pico@2.0.6/css/pico.min.css").to,
    "https://cdn.hopjs.net/npm/@picocss/pico@2.0.6/css/pico.min.css"
  );
});

test("rewrites cdnjs ajax/libs URLs", () => {
  assert.equal(
    convertUrl("https://cdnjs.cloudflare.com/ajax/libs/three.js/0.180.0/three.module.min.js").to,
    "https://cdn.hopjs.net/ajax/libs/three.js/0.180.0/three.module.min.js"
  );
});

test("does not rewrite jsDelivr GitHub URLs", () => {
  const result = convertUrl("https://cdn.jsdelivr.net/gh/user/repo@1.0.0/file.js");

  assert.equal(result.type, "unsupported-cdn");
  assert.equal(result.host, "cdn.jsdelivr.net");
});

test("does not rewrite jsDelivr combine URLs", () => {
  const result = convertUrl("https://cdn.jsdelivr.net/combine/npm/pkg@1/a.js,npm/pkg@1/b.js");

  assert.equal(result.type, "unsupported-cdn");
  assert.equal(result.host, "cdn.jsdelivr.net");
});

test("does not rewrite non-cdnjs cloudflare URLs", () => {
  const result = convertUrl("https://cdnjs.cloudflare.com/some/custom/file.js");

  assert.equal(result.type, "unsupported-cdn");
  assert.equal(result.host, "cdnjs.cloudflare.com");
});



test("rewrites documented hop.js npm example source shape", () => {
  assert.equal(
    convertUrl("https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js").to,
    "https://cdn.hopjs.net/npm/jquery@3.7.1/dist/jquery.min.js"
  );
});

test("rewrites documented hop.js cdnjs example source shape", () => {
  assert.equal(
    convertUrl("https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.8/css/bootstrap.min.css").to,
    "https://cdn.hopjs.net/ajax/libs/bootstrap/5.3.8/css/bootstrap.min.css"
  );
});

test("flags supported-host URLs with query strings for manual review", () => {
  const result = convertUrl("https://cdn.jsdelivr.net/npm/pkg@1/index.js?module");

  assert.equal(result.type, "unsupported-cdn");
  assert.equal(result.host, "cdn.jsdelivr.net");
  assert.match(result.reason, /query string/);
});

test("flags other CDN hosts for manual review", () => {
  const result = convertUrl("https://unpkg.com/react@18/umd/react.production.min.js");

  assert.equal(result.type, "unsupported-cdn");
  assert.equal(result.host, "unpkg.com");
});

test("counts existing hop.js URLs", () => {
  assert.deepEqual(convertUrl("https://cdn.hopjs.net/npm/lit@3/index.js"), {
    type: "already-hop",
    from: "https://cdn.hopjs.net/npm/lit@3/index.js",
  });
});

test("ignores non-CDN URLs", () => {
  assert.equal(convertUrl("https://example.com/app.js"), null);
});
