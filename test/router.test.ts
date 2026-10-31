import { test } from "node:test";
import assert from "node:assert/strict";

import {
  basePrefix,
  href,
  parseLocation,
  parseRoute,
  routePath,
  safeNext,
  stripBase,
  withQuery,
} from "../src/lib/router.ts";

test("basePrefix normalises the deployment base", () => {
  assert.equal(basePrefix("/"), "");
  assert.equal(basePrefix(""), "");
  assert.equal(basePrefix("/chanasta/"), "/chanasta");
  assert.equal(basePrefix("chanasta"), "/chanasta");
});

test("stripBase removes the GitHub Pages prefix", () => {
  assert.equal(stripBase("/chanasta/@demo-teacher", "/chanasta/"), "/@demo-teacher");
  assert.equal(stripBase("/chanasta/", "/chanasta/"), "/");
  assert.equal(stripBase("/chanasta", "/chanasta/"), "/");
  assert.equal(stripBase("/@demo-teacher", "/"), "/@demo-teacher");
});

test("home route from / and /chanasta/", () => {
  assert.deepEqual(parseRoute({ pathname: "/" }), { name: "home" });
  assert.deepEqual(parseRoute({ pathname: "/chanasta/", base: "/chanasta/" }), { name: "home" });
  assert.deepEqual(parseRoute({ pathname: "", base: "/chanasta/" }), { name: "home" });
});

test("creator route accepts /@slug and strips trailing slashes", () => {
  assert.deepEqual(parseRoute({ pathname: "/@demo-teacher" }), { name: "creator", slug: "demo-teacher" });
  assert.deepEqual(parseRoute({ pathname: "/chanasta/@demo-teacher/", base: "/chanasta/" }), {
    name: "creator",
    slug: "demo-teacher",
  });
});

test("thanks and embed routes", () => {
  assert.deepEqual(parseRoute({ pathname: "/@demo-artist/thanks" }), { name: "thanks", slug: "demo-artist" });
  assert.deepEqual(parseRoute({ pathname: "/embed/@demo-teacher" }), { name: "embed", slug: "demo-teacher" });
  assert.deepEqual(parseRoute({ pathname: "/embed/demo-teacher" }), { name: "embed", slug: "demo-teacher" });
});

test("hash fallbacks for static hosts", () => {
  assert.deepEqual(parseRoute({ pathname: "/", hash: "#/@demo-writer" }), { name: "creator", slug: "demo-writer" });
  assert.deepEqual(parseRoute({ pathname: "/chanasta/", hash: "#/@demo-writer", base: "/chanasta/" }), {
    name: "creator",
    slug: "demo-writer",
  });
  assert.deepEqual(parseRoute({ pathname: "/", hash: "#/dashboard/payments" }), {
    name: "dashboard",
    section: "payments",
  });
});

test("query fallback ?c=slug and params parsing", () => {
  const parsed = parseLocation({ pathname: "/", search: "?c=demo-teacher&lang=en&theme=dark" });
  assert.deepEqual(parsed.route, { name: "creator", slug: "demo-teacher" });
  assert.equal(parsed.params.lang, "en");
  assert.equal(parsed.params.theme, "dark");
  assert.equal(parseRoute({ pathname: "/", search: "?c=INVALID SLUG" }).name, "home");
});

test("dashboard, legal and onboarding routes", () => {
  assert.deepEqual(parseRoute({ pathname: "/dashboard" }), { name: "dashboard", section: "inbox" });
  assert.deepEqual(parseRoute({ pathname: "/dashboard/profile" }), { name: "dashboard", section: "profile" });
  assert.deepEqual(parseRoute({ pathname: "/dashboard/payments" }), { name: "dashboard", section: "payments" });
  assert.deepEqual(parseRoute({ pathname: "/dashboard/settings" }), { name: "dashboard", section: "settings" });
  assert.deepEqual(parseRoute({ pathname: "/onboarding" }), { name: "onboarding" });
  assert.deepEqual(parseRoute({ pathname: "/login" }), { name: "login" });
  assert.deepEqual(parseRoute({ pathname: "/legal/privacy" }), { name: "legal", page: "privacy" });
  assert.deepEqual(parseRoute({ pathname: "/legal/how-it-works" }), { name: "legal", page: "how-it-works" });
});

test("unknown routes fall back to 404", () => {
  assert.deepEqual(parseRoute({ pathname: "/nope" }), { name: "notFound" });
  assert.deepEqual(parseRoute({ pathname: "/@ab" }), { name: "notFound" });
  assert.deepEqual(parseRoute({ pathname: "/legal/nope" }), { name: "notFound" });
  assert.deepEqual(parseRoute({ pathname: "/dashboard/nope" }), { name: "notFound" });
  assert.deepEqual(parseRoute({ pathname: "/@UPPER" }), { name: "notFound" });
  assert.deepEqual(parseRoute({ pathname: "/@demo-teacher/extra" }), { name: "notFound" });
});

test("routePath is base-free and href applies the base", () => {
  assert.equal(routePath({ name: "creator", slug: "demo-teacher" }), "/@demo-teacher");
  assert.equal(routePath({ name: "dashboard", section: "payments" }), "/dashboard/payments");
  assert.equal(href("/@demo-teacher", "/"), "/@demo-teacher");
  assert.equal(href("/@demo-teacher", "/chanasta/"), "/chanasta/@demo-teacher");
  assert.equal(href("/", "/chanasta/"), "/chanasta/");
  assert.equal(href("/dashboard?f=hidden", "/chanasta/"), "/chanasta/dashboard?f=hidden");
});

test("safeNext blocks open redirects", () => {
  assert.equal(safeNext("/dashboard/profile"), "/dashboard/profile");
  assert.equal(safeNext("/onboarding"), "/onboarding");
  assert.equal(safeNext("https://evil.example"), null);
  assert.equal(safeNext("//evil.example"), null);
  assert.equal(safeNext("/admin"), null);
  assert.equal(safeNext(null), null);
});

test("withQuery keeps the hash and existing params", () => {
  assert.equal(withQuery("/dashboard", { f: "hidden", x: null }), "/dashboard?f=hidden");
  assert.equal(withQuery("/dashboard?f=all", { f: "hidden" }), "/dashboard?f=all&f=hidden");
  assert.equal(withQuery("/@demo-teacher#pay", { lang: "en" }), "/@demo-teacher?lang=en#pay");
});
