import { auth } from "@/auth";
import { handleExportRequest } from "@/lib/export-handler";
import { createRateLimiter } from "@/lib/ai/rate-limit";
import { countExportable, exportBatch, resolveExportScope } from "@/lib/services/export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A large library takes a while to write out.
export const maxDuration = 300;

// An export reads every document: a few per ten minutes is plenty for a backup.
const rateLimit = createRateLimiter({ limit: 3, windowMs: 10 * 60 * 1000 });

export async function GET(request: Request) {
  const session = await auth();
  const actor = session?.user ? { id: session.user.id, role: session.user.role } : null;
  return handleExportRequest(request, {
    getUser: async () => actor,
    rateLimit,
    resolveScope: (slug) => resolveExportScope(actor ?? { id: "", role: "VIEWER" }, slug),
    count: (collectionId) => countExportable(actor ?? { id: "", role: "VIEWER" }, collectionId),
    batch: (options) => exportBatch(actor ?? { id: "", role: "VIEWER" }, options),
    now: () => new Date(),
  });
}
