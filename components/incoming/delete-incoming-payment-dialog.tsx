"use client";

import * as React from "react";
import type { IncomingPayment } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteIncomingPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: IncomingPayment | null;
  onConfirmDelete: (id: string) => Promise<void> | void;
}

export function DeleteIncomingPaymentDialog({
  open,
  onOpenChange,
  payment,
  onConfirmDelete,
}: DeleteIncomingPaymentDialogProps) {
  const [loading, setLoading] = React.useState(false);

  const handleDelete = async () => {
    if (!payment) return;
    setLoading(true);

    try {
      await onConfirmDelete(payment.id);
      onOpenChange(false);
    } catch (err) {
      console.error("Error deleting incoming payment:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete incoming payment</DialogTitle>
          <DialogDescription>
            {payment ? (
              <>
                This will permanently delete the payment{" "}
                <strong>{payment.category}</strong>{" "}
                {payment.amount
                  ? `of ₹ ${payment.amount.toLocaleString("en-IN")}`
                  : ""}
                . This action cannot be undone.
              </>
            ) : (
              "No payment selected."
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
            disabled={!payment || loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
