import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeLike } from "./like";

test("wildcards and the escape character are matched literally", () => {
  assert.equal(escapeLike("100% sales"), "100\\% sales");
  assert.equal(escapeLike("a_c"), "a\\_c");
  assert.equal(escapeLike("a\\b"), "a\\\\b");
  assert.equal(escapeLike("biasa"), "biasa");
});
