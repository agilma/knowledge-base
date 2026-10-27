import test from "node:test";
import assert from "node:assert/strict";
import { Role } from "@prisma/client";
import { accessKey, canAccessCollection, canAccessDocument, documentReadableWhere, MAX_DOCUMENT_MEMBERS } from "./collection-access";

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

test("two restricted collections that swap places change the key, not only their times", () => {
  const viewer = { id: "u", role: Role.VIEWER };
  const t = new Date("2026-10-24T10:00:00Z");
  assert.notEqual(accessKey(viewer, [{ id: "a", updatedAt: t }], []), accessKey(viewer, [{ id: "b", updatedAt: t }], []));
});

// --- restricted documents ---


test("an open document in an open collection is readable by everyone", () => {
  for (const role of [Role.VIEWER, Role.EDITOR, Role.ADMIN]) {
    assert.equal(canAccessDocument(open, false, open, false, { role }), true);
  }
});

test("a restricted document needs a place in its own list, an admin does not", () => {
  const viewer = { role: Role.VIEWER };
  assert.equal(canAccessDocument(closed, false, open, false, viewer), false);
  assert.equal(canAccessDocument(closed, true, open, false, viewer), true);
  assert.equal(canAccessDocument(closed, false, open, false, { role: Role.ADMIN }), true);
});

test("both the collection and the document must allow the reader", () => {
  const viewer = { role: Role.VIEWER };
  // restricted document in a restricted collection: both lists
  assert.equal(canAccessDocument(closed, true, closed, true, viewer), true);
  assert.equal(canAccessDocument(closed, true, closed, false, viewer), false);
  assert.equal(canAccessDocument(closed, false, closed, true, viewer), false);
  // an open document inherits the collection's rule
  assert.equal(canAccessDocument(open, false, closed, false, viewer), false);
  assert.equal(canAccessDocument(open, false, closed, true, viewer), true);
  // being on the document's list does not open a closed collection
  assert.equal(canAccessDocument(closed, true, closed, false, { role: Role.EDITOR }), false);
});

test("the readable filter is empty for admins and has no top-level OR for others", () => {
  assert.deepEqual(documentReadableWhere({ id: "a", role: Role.ADMIN }), {});
  const where = documentReadableWhere({ id: "u", role: Role.VIEWER });
  // callers spread it next to their own conditions
  assert.ok(Array.isArray(where.AND));
  assert.equal("OR" in where, false);
});

test("the document limit matches the collection's", () => {
  assert.equal(MAX_DOCUMENT_MEMBERS, 200);
});

test("the access key covers restricted documents without moving when their text is edited", () => {
  const viewer = { id: "u", role: Role.VIEWER };
  assert.equal(accessKey(viewer, [], [], [], []), "open");
  const outside = accessKey(viewer, [], [], ["d1"], []);
  assert.notEqual(outside, "open");
  // another restricted document, or becoming a member, changes it; order and repeats do not
  assert.notEqual(accessKey(viewer, [], [], ["d1", "d2"], []), outside);
  assert.notEqual(accessKey(viewer, [], [], ["d1"], ["d1"]), outside);
  assert.equal(accessKey(viewer, [], [], ["d2", "d1"], []), accessKey(viewer, [], [], ["d1", "d2"], []));
  assert.equal(accessKey(viewer, [], [], ["d1", "d1"], ["d1", "d1"]), accessKey(viewer, [], [], ["d1"], ["d1"]));
  assert.equal(accessKey({ id: "x", role: Role.ADMIN }, [], [], ["d1"], ["d1"]), "admin");
  // a collection-only key is unchanged by the new arguments
  const c = { id: "c1", updatedAt: new Date("2026-10-24T10:00:00Z") };
  assert.equal(accessKey(viewer, [c], ["c1"]), accessKey(viewer, [c], ["c1"], [], []));
});
