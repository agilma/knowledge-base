"use client";

import { useState } from "react";
import Link from "next/link";
import { Role, CollectionStatus } from "@prisma/client";
import { Edit, Archive, Trash2, Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { setCollectionStatusAction, deleteCollectionAction } from "@/app/collections/actions";

interface CollectionActionsProps {
  collectionId: string;
  collectionSlug: string;
  status: CollectionStatus;
  userRole: Role;
}

export function CollectionActions({
  collectionId,
  collectionSlug,
  status,
  userRole,
}: CollectionActionsProps) {
  const isAdmin = userRole === Role.ADMIN;
  const isEditorOrAdmin = userRole === Role.EDITOR || userRole === Role.ADMIN;

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {isEditorOrAdmin && (
        <Link
          href={`/docs/new?collection=${collectionSlug}`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Dokumen Baru
        </Link>
      )}

      {isAdmin && (
        <>
          <Link
            href={`/collections/${collectionSlug}/edit`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Edit className="w-4 h-4 mr-1.5" />
            Edit
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              setIsPending(true);
              const newStatus =
                status === CollectionStatus.ARCHIVED
                  ? CollectionStatus.ACTIVE
                  : CollectionStatus.ARCHIVED;
              await setCollectionStatusAction(collectionId, newStatus);
              setIsPending(false);
            }}
            disabled={isPending}
          >
            <Archive className="w-4 h-4 mr-1.5" />
            {status === CollectionStatus.ARCHIVED ? "Aktifkan" : "Arsipkan"}
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsDeleting(true)}
            disabled={isPending}
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Hapus
          </Button>

          <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
            <DialogContent showCloseButton>
              <DialogHeader>
                <DialogTitle>Hapus Koleksi</DialogTitle>
                <DialogDescription>
                  Apakah Anda yakin ingin menghapus koleksi ini? Koleksi hanya dapat dihapus jika tidak lagi memiliki dokumen.
                </DialogDescription>
              </DialogHeader>

              {deleteError && (
                <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">{deleteError}</p>
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
                  onClick={async () => {
                    setIsPending(true);
                    setDeleteError(null);
                    const res = await deleteCollectionAction(collectionId);
                    if (res?.error) {
                      setDeleteError(res.error);
                      setIsPending(false);
                    }
                  }}
                  disabled={isPending}
                >
                  {isPending ? "Menghapus..." : "Hapus Permanen"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
