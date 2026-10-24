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

test("the access key follows the restricted collections, for members and for outsiders", () => {
  const viewer = { id: "u", role: Role.VIEWER };
  const t0 = new Date("2026-10-24T10:00:00Z");
  const c1 = { id: "c1", updatedAt: t0 };
  const c2 = { id: "c2", updatedAt: t0 };

  assert.equal(accessKey(viewer, [], []), "open");
  // a collection turning restricted changes it for someone who is not in it
  const outsideOne = accessKey(viewer, [c1], []);
  assert.notEqual(outsideOne, "open");
  assert.notEqual(accessKey(viewer, [c1, c2], []), outsideOne);
  // and again when it changes (a member, or a document moved in or out)
  assert.notEqual(accessKey(viewer, [{ ...c1, updatedAt: new Date(+t0 + 1000) }], []), outsideOne);
  // order does not matter, being added does
  assert.equal(accessKey(viewer, [c2, c1], []), accessKey(viewer, [c1, c2], []));
  assert.notEqual(accessKey(viewer, [c1], ["c1"]), outsideOne);
  assert.equal(accessKey(viewer, [c1], ["c1", "c1"]), accessKey(viewer, [c1], ["c1"]));
  assert.equal(accessKey({ id: "x", role: Role.ADMIN }, [c1], ["c1"]), "admin");
});
