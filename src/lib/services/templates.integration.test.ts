import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { DocumentStatus, DocumentType, Role } from "@prisma/client";
import { db } from "../db";
import type { Viewer } from "../collection-access";
import { cleanTemplateName, createTemplateFromDocument, deleteTemplate, getTemplate, listTemplates, MAX_TEMPLATES, renameTemplate, TEMPLATE_CONTENT_MAX } from "./templates";

/**
 * Templates: who may make and change them, what may become one, names. Against a real database;
 * skipped in CI.
 *
 *   KB_DB_TESTS=1 DATABASE_URL=postgresql://... npm test
 */
const enabled = process.env.KB_DB_TESTS === "1";
const tag = `tp${Date.now().toString(36)}`;
const T = { skip: !enabled };
const created = { users: [] as string[], collections: [] as string[] };
let admin: Viewer, editor: Viewer, other: Viewer, reader: Viewer;
let openId: string, restrictedDocId: string, inClosedId: string, longId: string;

async function user(name: string, role: Role): Promise<Viewer> {
  const row = await db.user.create({ data: { email: `${tag}-${name}@example.test`, name: `${name} ${tag}`, role } });
  created.users.push(row.id);
  return { id: row.id, role };
}

before(async () => {
  if (!enabled) return;
  admin = await user("admin", Role.ADMIN);
  editor = await user("editor", Role.EDITOR);
  other = await user("other", Role.EDITOR);
  reader = await user("reader", Role.VIEWER);
  const open = await db.collection.create({ data: { slug: `${tag}-open`, name: `Terbuka ${tag}` } });
  const closed = await db.collection.create({ data: { slug: `${tag}-closed`, name: `Tertutup ${tag}`, restricted: true } });
  created.collections.push(open.id, closed.id);
  const mk = (slug: string, collectionId: string, extra: { restricted?: boolean; content?: string; title?: string } = {}) =>
    db.document.create({
      data: { slug: `${tag}-${slug}`, title: extra.title ?? `SOP ${slug} ${tag}`, content: extra.content ?? "## Langkah\n\n```langkah\n1. Login | Masuk\n```\n\n## Perlu dikonfirmasi\n\n- ?", type: DocumentType.MASALAH, status: DocumentStatus.DRAFT, collectionId, restricted: extra.restricted ?? false },
    });
  openId = (await mk("open", open.id)).id;
  restrictedDocId = (await mk("restricted", open.id, { restricted: true })).id;
  inClosedId = (await mk("closed", closed.id)).id;
  longId = (await mk("long", open.id, { content: "x".repeat(TEMPLATE_CONTENT_MAX + 1) })).id;
});

after(async () => {
  if (!enabled) return;
  await db.documentTemplate.deleteMany({ where: { OR: [{ name: { contains: tag } }, { createdById: { in: created.users } }] } });
  await db.document.deleteMany({ where: { collectionId: { in: created.collections } } });
  await db.collection.deleteMany({ where: { id: { in: created.collections } } });
  await db.user.deleteMany({ where: { id: { in: created.users } } });
  await db.$disconnect();
});

test("a document becomes a template with its text and type; the name is the title, made unique", T, async () => {
  const first = await createTemplateFromDocument(openId, undefined, editor);
  assert.equal(first.name, `SOP open ${tag}`);
  const second = await createTemplateFromDocument(openId, undefined, editor);
  assert.equal(second.name, `SOP open ${tag} (2)`);
  const third = await createTemplateFromDocument(openId, `  ${first.name.toUpperCase()}  `, admin);
  assert.equal(third.name.toLowerCase(), `${first.name.toLowerCase()} (3)`, "same name in other capitals counts as taken");

  const got = await getTemplate(first.id, editor);
  assert.equal(got?.type, DocumentType.MASALAH);
  assert.ok(got?.content.includes("```langkah") && got.content.includes("Perlu dikonfirmasi"));
  assert.ok((await listTemplates(other)).some((t) => t.id === first.id && t.createdByName?.startsWith("editor")), "every editor sees it");
  assert.equal(await getTemplate("tidak-ada", editor), null);
});

test("only an open document can become a template, and only for editors and admins", T, async () => {
  await assert.rejects(createTemplateFromDocument(restrictedDocId, undefined, admin), /terbuka untuk semua/);
  await assert.rejects(createTemplateFromDocument(inClosedId, undefined, admin), /terbuka untuk semua/);
  await assert.rejects(createTemplateFromDocument(longId, undefined, editor), /terlalu panjang/);
  await assert.rejects(createTemplateFromDocument("tidak-ada", undefined, editor), /tidak ditemukan/);
  await assert.rejects(createTemplateFromDocument(openId, undefined, reader), /penyunting/);
  await assert.rejects(listTemplates(reader), /penyunting/);
  await assert.rejects(getTemplate("x", reader), /penyunting/);
});

test("the creator or an admin renames and deletes; another editor cannot", T, async () => {
  const { id } = await createTemplateFromDocument(openId, `Templat uji ${tag}`, editor);
  await assert.rejects(renameTemplate(id, "Nama baru", other), /pembuat/);
  await assert.rejects(deleteTemplate(id, other), /pembuat/);
  await assert.rejects(deleteTemplate(id, reader), /penyunting/);
  await renameTemplate(id, `Diganti ${tag}`, editor);
  assert.equal((await getTemplate(id, editor))?.name, `Diganti ${tag}`);
  const other2 = await createTemplateFromDocument(openId, `Lain ${tag}`, editor);
  await assert.rejects(renameTemplate(id, `LAIN ${tag}`, admin), /sudah dipakai/);
  await assert.rejects(renameTemplate(id, "x", editor), /minimal/);
  await renameTemplate(other2.id, `Oleh admin ${tag}`, admin);
  await deleteTemplate(id, admin);
  assert.equal(await getTemplate(id, editor), null);
  await assert.rejects(deleteTemplate(id, admin), /tidak ditemukan/);
});

test("names are cleaned, and the number of templates is limited", T, async () => {
  assert.equal(cleanTemplateName("  SOP   closing \n kasir "), "SOP closing kasir");
  assert.throws(() => cleanTemplateName("ab"), /minimal/);
  assert.throws(() => cleanTemplateName("x".repeat(81)), /maksimal/);
  assert.throws(() => cleanTemplateName(7), /wajib/);
  assert.ok(MAX_TEMPLATES >= 50);
});

test("a short title still makes a template; the source is remembered and flagged once it is restricted", T, async () => {
  const col = await db.collection.create({ data: { slug: `${tag}-col5`, name: `Lima ${tag}` } });
  created.collections.push(col.id);
  const doc = await db.document.create({ data: { slug: `${tag}-ab`, title: "AB", content: "## Isi\n\nteks", collectionId: col.id } });
  const { id, name } = await createTemplateFromDocument(doc.id, undefined, editor);
  assert.equal(name, "Templat AB");

  let item = (await listTemplates(admin)).find((t) => t.id === id)!;
  assert.deepEqual(item.source, { title: "AB", slug: `${tag}-ab` });
  assert.equal(item.size, "## Isi\n\nteks".length);

  // the document is restricted afterwards: the copy now says so, without showing the title
  await db.document.update({ where: { id: doc.id }, data: { restricted: true } });
  item = (await listTemplates(admin)).find((t) => t.id === id)!;
  assert.equal(item.source, "restricted");

  // the source is deleted: no source, the template stays
  await db.document.delete({ where: { id: doc.id } });
  item = (await listTemplates(admin)).find((t) => t.id === id)!;
  assert.equal(item.source, null);
  assert.equal((await getTemplate(id, editor))?.content, "## Isi\n\nteks");
});
