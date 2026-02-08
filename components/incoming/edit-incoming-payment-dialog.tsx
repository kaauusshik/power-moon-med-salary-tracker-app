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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface EditIncomingPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: IncomingPayment | null;
  onSave: (payment: IncomingPayment) => Promise<void> | void;
}

export function EditIncomingPaymentDialog({
  open,
  onOpenChange,
  payment,
  onSave,
}: EditIncomingPaymentDialogProps) {
  const [draft, setDraft] = React.useState<IncomingPayment | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open && payment) {
      setDraft({ ...payment });
      setError(null);
    }
    if (!open) {
      setDraft(null);
      setSaving(false);
      setError(null);
    }
  }, [open, payment]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!draft) return;

    // simple validation
    if (!draft.category || draft.category.trim() === "") {
      setError("Category is required.");
      return;
    }
    if (Number.isNaN(Number(draft.amount))) {
      setError("Amount must be a number.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({
        ...draft,
        amount: Number(draft.amount),
      });

      onOpenChange(false);
    } catch (err) {
      console.error("Error saving incoming payment:", err);
      setError("Failed to save. Check console for details.");
    } finally {
      setSaving(false);
    }
  };

  if (!payment) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit incoming payment</DialogTitle>
            <DialogDescription>No payment selected to edit.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit incoming payment</DialogTitle>
          <DialogDescription>
            Update category, amount, date or description.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Name
            </label>
            <Input
              value={draft?.category ?? ""}
              onChange={(e) =>
                setDraft((prev) =>
                  prev ? { ...prev, category: e.target.value } : prev,
                )
              }
              placeholder="e.g. Client payment, Consultation fee"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Amount
              </label>
              <Input
                type="number"
                inputMode="decimal"
                value={draft?.amount ?? 0}
                onChange={(e) =>
                  setDraft((prev) =>
                    prev
                      ? {
                          ...prev,
                          amount:
                            e.target.value === "" ? 0 : Number(e.target.value),
                        }
                      : prev,
                  )
                }
                placeholder="0"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Date (optional)
              </label>
              <Input
                type="date"
                value={draft?.date ?? ""}
                onChange={(e) =>
                  setDraft((prev) =>
                    prev ? { ...prev, date: e.target.value } : prev,
                  )
                }
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Description (optional)
            </label>
            <Input
              value={draft?.description ?? ""}
              onChange={(e) =>
                setDraft((prev) =>
                  prev ? { ...prev, description: e.target.value } : prev,
                )
              }
              placeholder="Short note about the payment"
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
