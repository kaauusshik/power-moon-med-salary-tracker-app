"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Employee } from "@/lib/types";

interface DeleteEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  onConfirmDelete: (id: string) => void;
}

export function DeleteEmployeeDialog({
  open,
  onOpenChange,
  employee,
  onConfirmDelete,
}: DeleteEmployeeDialogProps) {
  const [confirmName, setConfirmName] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setConfirmName("");
    }
  }, [open]);

  if (!employee) return null;

  const isMatch =
    confirmName.trim().toLowerCase() === employee.name.trim().toLowerCase();

  const handleDelete = () => {
    if (!isMatch) return;
    onConfirmDelete(employee.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete employee</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete{" "}
            <span className="font-medium text-foreground">{employee.name}</span>{" "}
            and all salary records associated with them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            To confirm, type the employee&apos;s name exactly and press
            <span className="font-semibold"> Delete</span>.
          </p>

          <Input
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={employee.name}
            autoFocus
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={!isMatch}
            >
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
