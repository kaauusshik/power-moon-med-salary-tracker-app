"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { SalaryRecord } from "@/lib/types";

interface DeleteSalaryRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: SalaryRecord | null;
  onConfirmDelete: (id: string) => Promise<void> | void;
}

export function DeleteSalaryRecordDialog({
  open,
  onOpenChange,
  record,
  onConfirmDelete,
}: DeleteSalaryRecordDialogProps) {
  const handleDelete = () => {
    if (!record) return;
    onConfirmDelete(record.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete salary record</DialogTitle>
          <DialogDescription>
            This will permanently delete this salary record and its expenses.
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!record}
          >
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
