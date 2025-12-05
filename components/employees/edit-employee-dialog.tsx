"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Employee } from "@/lib/types";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().optional(),
  baseSalary: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!Number.isNaN(Number(val)) && Number(val) >= 0),
      "Must be a valid non-negative number"
    ),
});

type FormValues = z.infer<typeof formSchema>;

interface EditEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  onSave: (employee: Employee) => void;
}

export function EditEmployeeDialog({
  open,
  onOpenChange,
  employee,
  onSave,
}: EditEmployeeDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      role: "",
      baseSalary: "",
    },
  });

  // when employee changes / dialog opens, sync form values
  React.useEffect(() => {
    if (employee) {
      form.reset({
        name: employee.name ?? "",
        role: employee.role ?? "",
        baseSalary:
          typeof employee.baseSalary === "number"
            ? String(employee.baseSalary)
            : "",
      });
    }
  }, [employee, form, open]);

  if (!employee) return null;

  const handleSubmit = (values: FormValues) => {
    let baseSalaryNumber: number | null = null;

    if (values.baseSalary && values.baseSalary.trim() !== "") {
      const parsed = Number(values.baseSalary);
      if (!Number.isNaN(parsed)) {
        baseSalaryNumber = parsed;
      }
    }

    const updatedEmployee: Employee = {
      ...employee,
      name: values.name,
      role: values.role || undefined,
      baseSalary: baseSalaryNumber,
    };

    onSave(updatedEmployee);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit employee</DialogTitle>
          <DialogDescription>
            Update this employee&apos;s details.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="baseSalary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base monthly salary (optional)</FormLabel>
                  <FormControl>
                    <Input type="number" inputMode="decimal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save changes</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
