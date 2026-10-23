import { test } from "node:test";
import assert from "node:assert/strict";
import { isAdminEmail, isEmailAllowed, parseEmailList } from "./access";

test("an email on the allowed domain may sign in", () => {
  assert.equal(isEmailAllowed("budi@contoh.com", { allowedDomain: "contoh.com" }), true);
});

test("the domain match is case-insensitive and tolerates a leading @", () => {
  assert.equal(isEmailAllowed("Budi@Contoh.COM", { allowedDomain: "@Contoh.com" }), true);
});

test("a look-alike domain does not pass", () => {
  const config = { allowedDomain: "contoh.com" };
  assert.equal(isEmailAllowed("x@evil-contoh.com", config), false);
  assert.equal(isEmailAllowed("x@contoh.com.evil.io", config), false);
  assert.equal(isEmailAllowed("contoh.com@gmail.com", config), false);
});

test("an explicitly listed email outside the domain may sign in", () => {
  const config = { allowedDomain: "contoh.com", allowedEmails: " ani@gmail.com , Citra@Gmail.com " };
  assert.equal(isEmailAllowed("ani@gmail.com", config), true);
  assert.equal(isEmailAllowed("citra@gmail.com", config), true);
  assert.equal(isEmailAllowed("dewi@gmail.com", config), false);
});

test("an empty domain leaves the email list as the only way in, never everyone", () => {
  assert.equal(isEmailAllowed("ani@gmail.com", { allowedDomain: "", allowedEmails: "ani@gmail.com" }), true);
  assert.equal(isEmailAllowed("dewi@gmail.com", { allowedDomain: "", allowedEmails: "ani@gmail.com" }), false);
  assert.equal(isEmailAllowed("dewi@gmail.com", {}), false);
});

test("an empty email is refused", () => {
  assert.equal(isEmailAllowed("", { allowedDomain: "contoh.com", allowedEmails: "," }), false);
  assert.equal(isEmailAllowed("  ", { allowedEmails: "" }), false);
});

test("admin emails are matched case-insensitively", () => {
  assert.equal(isAdminEmail("Admin@Contoh.com", { adminEmails: "admin@contoh.com" }), true);
  assert.equal(isAdminEmail("budi@contoh.com", { adminEmails: "admin@contoh.com" }), false);
  assert.equal(isAdminEmail("budi@contoh.com", {}), false);
});

test("parseEmailList drops blanks", () => {
  assert.deepEqual(parseEmailList(" A@x.com,, b@x.com ,"), ["a@x.com", "b@x.com"]);
  assert.deepEqual(parseEmailList(undefined), []);
});
