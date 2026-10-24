import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDate } from "./format";

test("dates read in Indonesian", () => {
  assert.equal(formatDate(new Date("2026-10-24T05:00:00Z")), "24 Oktober 2026");
  assert.equal(formatDate("2026-01-05T05:00:00Z"), "5 Januari 2026");
});

test("a late-evening UTC instant is already the next day in Jakarta", () => {
  assert.equal(formatDate(new Date("2026-10-23T20:00:00Z")), "24 Oktober 2026");
});

test("the result does not depend on the zone of the machine", () => {
  const instant = new Date("2026-10-23T20:00:00Z");
  const original = process.env.TZ;
  try {
    const results = new Set<string>();
    for (const tz of ["UTC", "Asia/Jakarta", "America/Los_Angeles", "Pacific/Auckland"]) {
      process.env.TZ = tz;
      results.add(formatDate(instant));
    }
    assert.deepEqual([...results], ["24 Oktober 2026"]);
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});
