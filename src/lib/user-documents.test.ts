import { test } from "node:test";
import assert from "node:assert/strict";
import { DocumentStatus, Role } from "@prisma/client";
import {
  canSeeUnpublished,
  idsToPrune,
  isDocumentVisible,
  orderByIds,
} from "./user-documents";

test("a viewer sees published documents only", () => {
  assert.equal(isDocumentVisible(DocumentStatus.PUBLISHED, Role.VIEWER), true);
  assert.equal(isDocumentVisible(DocumentStatus.DRAFT, Role.VIEWER), false);
  assert.equal(isDocumentVisible(DocumentStatus.ARCHIVED, Role.VIEWER), false);
  assert.equal(isDocumentVisible(DocumentStatus.DRAFT, undefined), false);
});

test("editors and admins see drafts and archived documents", () => {
  for (const role of [Role.EDITOR, Role.ADMIN]) {
    assert.equal(canSeeUnpublished(role), true);
    assert.equal(isDocumentVisible(DocumentStatus.DRAFT, role), true);
    assert.equal(isDocumentVisible(DocumentStatus.ARCHIVED, role), true);
  }
});

test("orderByIds keeps the order of the ids, not of the documents", () => {
  const docs = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(orderByIds(["c", "a", "b"], docs), [{ id: "c" }, { id: "a" }, { id: "b" }]);
});

test("orderByIds drops ids that no longer resolve", () => {
  const docs = [{ id: "a" }, { id: "c" }];
  assert.deepEqual(orderByIds(["a", "gone", "c"], docs), [{ id: "a" }, { id: "c" }]);
  assert.deepEqual(orderByIds([], docs), []);
});

test("idsToPrune returns only what is beyond the limit, newest kept", () => {
  const rows = ["1", "2", "3", "4", "5"].map((id) => ({ id }));
  assert.deepEqual(idsToPrune(rows, 3), ["4", "5"]);
  assert.deepEqual(idsToPrune(rows, 5), []);
  assert.deepEqual(idsToPrune(rows, 10), []);
});
