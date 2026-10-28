import { test } from "node:test";
import assert from "node:assert/strict";
import { documentUrl } from "./share";

test("builds the canonical document address", () => {
  assert.equal(documentUrl("https://kb.example.com", "pos-gagal-closing"), "https://kb.example.com/docs/pos-gagal-closing");
});

test("a slug is never able to add path, query or hash parts", () => {
  assert.equal(documentUrl("https://kb.example.com", "a/b?x#y"), "https://kb.example.com/docs/a%2Fb%3Fx%23y");
});
