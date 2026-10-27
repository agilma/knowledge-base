import { test } from "node:test";
import assert from "node:assert/strict";
import { inviteSchema } from "./invite";

test("an invited email is trimmed and lower-cased", () => {
  const r = inviteSchema.parse({ email: "  Lala@Gmail.COM ", role: "EDITOR" });
  assert.deepEqual(r, { email: "lala@gmail.com", role: "EDITOR" });
});

test("empty, malformed and over-long emails are refused", () => {
  for (const email of ["", "   ", "tanpa-at", "a@", `${"a".repeat(250)}@x.id`]) {
    assert.equal(inviteSchema.safeParse({ email, role: "VIEWER" }).success, false, email);
  }
});

test("only the three roles are accepted", () => {
  for (const role of ["VIEWER", "EDITOR", "ADMIN"]) {
    assert.ok(inviteSchema.safeParse({ email: "a@x.id", role }).success, role);
  }
  for (const role of ["ROOT", "", undefined, null]) {
    assert.equal(inviteSchema.safeParse({ email: "a@x.id", role }).success, false, String(role));
  }
});
