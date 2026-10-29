import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { getDocumentBySlug } from "@/lib/services/documents";
import { StepRunner } from "@/components/document/StepRunner";
import { extractStepFlow, flowKey } from "@/lib/step-mode";

export const dynamic = "force-dynamic";

/** The steps of a document one to a screen (roadmap 7). Read like the document: the same access, drafts only for those who see drafts. */
export default async function StepModePage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  const viewer = { id: user.id, role: user.role };
  const canSeeDrafts = user.role === Role.EDITOR || user.role === Role.ADMIN;

  const { slug } = await params;
  const doc = await getDocumentBySlug(slug, { includeDrafts: canSeeDrafts, viewer });
  if (!doc) notFound();

  const items = extractStepFlow(doc.content);
  if (items.length === 0) notFound();

  return <StepRunner items={items} storageKey={`kb:steps:${user.id}:${doc.id}:${flowKey(items)}`} title={doc.title} backHref={`/docs/${doc.slug}`} />;
}
