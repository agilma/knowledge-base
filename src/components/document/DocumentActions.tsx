"use client";

import { useState } from "react";
import Link from "next/link";
import { Role, DocumentStatus } from "@prisma/client";
import { Edit, Archive, CheckCircle, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { setDocumentStatusAction, deleteDocumentAction } from "@/app/docs/actions";

interface DocumentActionsProps {
  documentId: string;
  documentSlug: string;
  status: DocumentStatus;
  userRole: Role;
}

export function DocumentActions({
  documentId,
  documentSlug,
  status,
  userRole,
}: DocumentActionsProps) {
  const isEditorOrAdmin = userRole === Role.EDITOR || userRole === Role.ADMIN;
  const isAdmin = userRole === Role.ADMIN;

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  if (!isEditorOrAdmin) return null;

  const handleTogglePublish = async () => {
    setIsPending(true);
    const newStatus =
      status === DocumentStatus.PUBLISHED
        ? DocumentStatus.DRAFT
        : DocumentStatus.PUBLISHED;
    await setDocumentStatusAction(documentId, newStatus);
    setIsPending(false);
  };

  const handleToggleArchive = async () => {
    setIsPending(true);
    const newStatus =
      status === DocumentStatus.ARCHIVED
        ? DocumentStatus.DRAFT
        : DocumentStatus.ARCHIVED;
    await setDocumentStatusAction(documentId, newStatus);
    setIsPending(false);
  };

  const handleDelete = async () => {
    setIsPending(true);
    setDeleteError(null);
    const res = await deleteDocumentAction(documentId);
    if (res?.error) {
      setDeleteError(res.error);
      setIsPending(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Link
          href={`/docs/${documentSlug}/edit`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Edit className="w-4 h-4 mr-1.5" />
          Edit
        </Link>

        <Button
          variant="outline"
          size="sm"
          onClick={handleTogglePublish}
          disabled={isPending}
        >
          <CheckCircle className="w-4 h-4 mr-1.5" />
          {status === DocumentStatus.PUBLISHED ? "Jadikan Draf" : "Publish"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleToggleArchive}
          disabled={isPending}
        >
          <Archive className="w-4 h-4 mr-1.5" />
          {status === DocumentStatus.ARCHIVED ? "Buka Arsip" : "Arsipkan"}
        </Button>

        {isAdmin && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsDeleting(true)}
            disabled={isPending}
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Hapus
          </Button>
        )}
      </div>

      {isAdmin && (
        <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
          <DialogContent showCloseButton>
            <DialogHeader>
              <DialogTitle>Hapus Dokumen</DialogTitle>
              <DialogDescription>
                Apakah Anda yakin ingin menghapus dokumen ini? Tindakan ini tidak dapat dibatalkan.
              </DialogDescription>
            </DialogHeader>

            {deleteError && (
              <p className="text-xs text-destructive">{deleteError}</p>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleting(false)}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                {isPending ? "Menghapus..." : "Hapus Permanen"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
