import test from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { userMessage } from "./errors";

test("a message written for the user passes through", () => {
  assert.equal(userMessage(new Error("Dokumen tidak ditemukan"), "Gagal"), "Dokumen tidak ditemukan");
});

test("what the database driver raised is replaced", () => {
  const validation = new Prisma.PrismaClientValidationError("Invalid `prisma.document.findUnique()` invocation", {
    clientVersion: "5.22.0",
  });
  assert.equal(userMessage(validation, "Gagal memperbarui dokumen"), "Gagal memperbarui dokumen");
  const known = new Prisma.PrismaClientKnownRequestError("Unique constraint failed on the fields: (`slug`)", {
    code: "P2002",
    clientVersion: "5.22.0",
  });
  assert.equal(userMessage(known, "Gagal"), "Gagal");
});

test("anything that is not an error, or has no message, uses the fallback", () => {
  assert.equal(userMessage("x", "Gagal"), "Gagal");
  assert.equal(userMessage(new Error(""), "Gagal"), "Gagal");
  assert.equal(userMessage(undefined, "Gagal"), "Gagal");
});
