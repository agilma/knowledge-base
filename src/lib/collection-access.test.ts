import test from "node:test";
import assert from "node:assert/strict";
import { Role } from "@prisma/client";
import { accessKey, canAccessCollection } from "./collection-access";

const open = { restricted: false };
const closed = { restricted: true };

test("an open collection is readable by everyone", () => {
  for (const role of [Role.VIEWER, Role.EDITOR, Role.ADMIN]) {
    assert.equal(canAccessCollection(open, false, { role }), true);
  }
});

test("a restricted collection is readable by members and admins only", () => {
  assert.equal(canAccessCollection(closed, false, { role: Role.VIEWER }), false);
  assert.equal(canAccessCollection(closed, false, { role: Role.EDITOR }), false);
  assert.equal(canAccessCollection(closed, true, { role: Role.VIEWER }), true);
  assert.equal(canAccessCollection(closed, true, { role: Role.EDITOR }), true);
  assert.equal(canAccessCollection(closed, false, { role: Role.ADMIN }), true);
});

test("the access key changes with the list and not with its order", () => {
  const viewer = { id: "u", role: Role.VIEWER };
  assert.equal(accessKey(viewer, []), "open");
  const a = accessKey(viewer, ["c1", "c2"]);
  assert.equal(accessKey(viewer, ["c2", "c1", "c1"]), a);
  assert.notEqual(accessKey(viewer, ["c1"]), a);
  assert.notEqual(accessKey(viewer, ["c1"]), "open");
  assert.equal(accessKey({ id: "x", role: Role.ADMIN }, ["c1"]), "admin");
});
