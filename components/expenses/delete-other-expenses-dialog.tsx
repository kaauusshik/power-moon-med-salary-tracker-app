"use client";

import * as React from "react";
import type { OtherExpense } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteOtherExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: OtherExpense | null;
  onConfirmDelete: (id: string) => Promise<void> | void;
}

export function DeleteOtherExpenseDialog({
  open,
  onOpenChange,
  expense,
  onConfirmDelete,
}: DeleteOtherExpenseDialogProps) {
  const [loading, setLoading] = React.useState(false);

  const handleDelete = async () => {
    if (!expense) return;
    setLoading(true);
    try {
      await onConfirmDelete(expense.id);
      onOpenChange(false);
    } catch (err) {
      console.error("Error deleting other expense:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete other expense</DialogTitle>
          <DialogDescription>
            {expense ? (
              <>
                This will permanently delete the expense{" "}
                <strong>{expense.category}</strong>{" "}
                {expense.amount
                  ? `of ₹ ${expense.amount.toLocaleString("en-IN")}`
                  : ""}
                . This action cannot be undone.
              </>
            ) : (
              "No expense selected."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!expense || loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
