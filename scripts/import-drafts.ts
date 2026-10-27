/**
 * Imports content/drafts/*.md as draft documents.
 *
 *   DATABASE_URL=postgresql://... npm run docs:import [-- --as admin@example.com] [-- --dir path]
 *
 * Creates only what does not exist yet and never overwrites. The author shown
 * in the history is the admin or editor named by --as (for documents someone
 * else wrote), or else the first admin.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Role } from "@prisma/client";
import { db } from "../src/lib/db";
import { parseDraft } from "../src/lib/draft-import";
import { importDrafts } from "../src/lib/services/draft-import";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main() {
  const dir = arg("dir") ?? join(process.cwd(), "content", "drafts");
  const files = readdirSync(dir).filter((f) => f.endsWith(".md") && f !== "README.md").sort();
  if (files.length === 0) {
    console.log(`Tidak ada berkas .md di ${dir}`);
    return;
  }

  // a bad file stops everything before anything is written
  const drafts = files.map((f) => parseDraft(readFileSync(join(dir, f), "utf8"), f.replace(/\.md$/, "")));

  const email = arg("as");
  const author = await db.user.findFirst({
    where: email
      ? { role: { in: [Role.ADMIN, Role.EDITOR] }, email: email.toLowerCase() }
      : { role: Role.ADMIN },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, role: true },
  });
  if (!author) {
    throw new Error(
      email
        ? `Pengguna ${email} tidak ditemukan atau bukan editor/admin (undang dan naikkan perannya di /admin/users, lalu minta ia masuk sekali)`
        : "Belum ada pengguna admin"
    );
  }

  console.log(`Mengimpor ${drafts.length} draf sebagai ${author.email}...`);
  const result = await importDrafts(drafts, { id: author.id, role: author.role });

  for (const slug of result.created) console.log(`  dibuat   ${slug}`);
  for (const slug of result.skipped) console.log(`  dilewati ${slug} (sudah ada)`);
  for (const f of result.failed) console.log(`  GAGAL    ${f.slug}: ${f.error}`);
  console.log(`Selesai: ${result.created.length} dibuat, ${result.skipped.length} dilewati, ${result.failed.length} gagal.`);
  if (result.failed.length > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
