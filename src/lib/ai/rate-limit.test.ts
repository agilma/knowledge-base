import { test } from "node:test";
import assert from "node:assert/strict";
import { createRateLimiter } from "./rate-limit";

test("allows up to the limit, then says how long to wait", () => {
  let t = 0;
  const limiter = createRateLimiter({ limit: 2, windowMs: 1000, now: () => t });
  assert.deepEqual(limiter.take("a"), { ok: true });
  t = 100;
  assert.deepEqual(limiter.take("a"), { ok: true });
  t = 200;
  assert.deepEqual(limiter.take("a"), { ok: false, retryAfterMs: 800 });
});

test("keys are independent and the window slides", () => {
  let t = 0;
  const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => t });
  assert.equal(limiter.take("a").ok, true);
  assert.equal(limiter.take("b").ok, true);
  assert.equal(limiter.take("a").ok, false);
  t = 1000;
  assert.equal(limiter.take("a").ok, true);
});
