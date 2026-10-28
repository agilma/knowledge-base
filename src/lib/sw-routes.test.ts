import { test } from "node:test";
import assert from "node:assert/strict";
import { isEditorRoute, isNetworkOnlyRequest, isPersonalRoute, isTargetPageRoute } from "./sw-routes";

test("readable pages are cached for offline reading", () => {
  for (const path of ["/", "/collections", "/collections/pos", "/docs/pos-gagal-closing"]) {
    assert.equal(isTargetPageRoute(path), true, path);
  }
});

test("editors are never cached, whatever the slug", () => {
  for (const path of ["/docs/new", "/collections/new", "/docs/abc/edit", "/collections/abc/edit", "/docs/abc/history", "/docs/abc/history/3"]) {
    assert.equal(isEditorRoute(path), true, path);
    assert.equal(isTargetPageRoute(path), false, path);
  }
});

test("a slug that merely contains 'edit' or 'new' is still a readable page", () => {
  for (const path of ["/docs/edit", "/docs/new-hire-guide", "/docs/abc/edit/notes", "/collections/newsletter", "/docs/history", "/docs/historyk"]) {
    assert.equal(isEditorRoute(path), false, path);
    assert.equal(isTargetPageRoute(path), true, path);
  }
});

test("unrelated routes are not cached as pages", () => {
  for (const path of ["/login", "/offline", "/api/auth/session", "/manifest.webmanifest", "/documents"]) {
    assert.equal(isTargetPageRoute(path), false, path);
  }
});

test("only GET reads of the session may use the cache among auth endpoints", () => {
  assert.equal(isNetworkOnlyRequest("GET", "/api/auth/session"), false);
  assert.equal(isNetworkOnlyRequest("GET", "/api/auth/signin"), true);
  assert.equal(isNetworkOnlyRequest("GET", "/api/auth/callback/google"), true);
  assert.equal(isNetworkOnlyRequest("POST", "/api/auth/session"), true);
});

test("login, editors and every write go straight to the network", () => {
  assert.equal(isNetworkOnlyRequest("GET", "/login"), true);
  assert.equal(isNetworkOnlyRequest("GET", "/api/admin/export"), true);
  // The assistant streams a paid, per-admin answer: never from or into a cache.
  assert.equal(isNetworkOnlyRequest("POST", "/api/ai/document-assistant"), true);
  assert.equal(isNetworkOnlyRequest("GET", "/docs/new"), true);
  assert.equal(isNetworkOnlyRequest("GET", "/docs/x/edit"), true);
  assert.equal(isNetworkOnlyRequest("POST", "/docs/x"), true);
  assert.equal(isNetworkOnlyRequest("GET", "/docs/x"), false);
});

test("per-user lists are never cached, or the next person on the browser would see them", () => {
  for (const path of ["/favorites", "/recent", "/search"]) {
    assert.equal(isPersonalRoute(path), true, path);
    assert.equal(isTargetPageRoute(path), false, path);
    assert.equal(isNetworkOnlyRequest("GET", path), true, path);
  }
  assert.equal(isPersonalRoute("/favorites/x"), false);
  assert.equal(isPersonalRoute("/searching"), false);
  assert.equal(isPersonalRoute("/docs/favorites"), false);
});
