import { test } from "node:test";
import assert from "node:assert/strict";
import { cacheOwner, shouldClearCache } from "./cache-owner";

test("the owner combines person and role", () => {
  assert.equal(cacheOwner({ id: "u1", role: "EDITOR" }), "u1:EDITOR");
  assert.equal(cacheOwner(null), null);
  assert.equal(cacheOwner(undefined), null);
});

test("membership of restricted collections is part of the owner", () => {
  const user = { id: "u1", role: "VIEWER" };
  assert.equal(cacheOwner(user, "open"), "u1:VIEWER");
  assert.equal(cacheOwner({ id: "u1", role: "ADMIN" }, "admin"), "u1:ADMIN");
  assert.equal(cacheOwner(user, "k3j"), "u1:VIEWER:k3j");
  assert.equal(shouldClearCache("u1:VIEWER:k3j", cacheOwner(user, "open")), true);
  assert.equal(shouldClearCache("u1:VIEWER", cacheOwner(user, "k3j")), true);
});

test("the same person with the same role keeps the cache", () => {
  assert.equal(shouldClearCache("u1:EDITOR", "u1:EDITOR"), false);
});

test("a different person empties the cache", () => {
  assert.equal(shouldClearCache("u1:EDITOR", "u2:VIEWER"), true);
});

test("a change of role empties the cache, up or down", () => {
  assert.equal(shouldClearCache("u1:VIEWER", "u1:EDITOR"), true);
  assert.equal(shouldClearCache("u1:EDITOR", "u1:VIEWER"), true);
});

test("nothing recorded is treated as unknown ownership", () => {
  assert.equal(shouldClearCache(null, "u1:VIEWER"), true);
});

test("a page with nobody signed in never clears: signing out already did", () => {
  assert.equal(shouldClearCache("u1:EDITOR", null), false);
  assert.equal(shouldClearCache(null, null), false);
});
