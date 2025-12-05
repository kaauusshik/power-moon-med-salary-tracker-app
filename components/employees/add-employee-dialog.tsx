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

// 👇 Form schema: keep everything as string, no transform here
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().optional(),
  baseSalary: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val || // empty allowed
        (!Number.isNaN(Number(val)) && Number(val) >= 0),
      "Must be a valid non-negative number"
    ),
});

type FormValues = z.infer<typeof formSchema>;

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (employee: Employee) => void;
}

export function AddEmployeeDialog({
  open,
  onOpenChange,
  onAdd,
}: AddEmployeeDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      role: "",
      baseSalary: "",
    },
  });

  const handleSubmit = (values: FormValues) => {
    // Convert string salary -> number | null
    let baseSalaryNumber: number | null = null;

    if (values.baseSalary && values.baseSalary.trim() !== "") {
      const parsed = Number(values.baseSalary);
      if (!Number.isNaN(parsed)) {
        baseSalaryNumber = parsed;
      }
    }

    const newEmployee: Employee = {
      id: crypto.randomUUID(),
      name: values.name,
      role: values.role || undefined,
      baseSalary: baseSalaryNumber,
    };

    onAdd(newEmployee);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add employee</DialogTitle>
          <DialogDescription>
            Create a new employee. You&apos;ll be able to add salary records
            afterwards.
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
                    <Input
                      placeholder="Enter Employee Name Here.."
                      {...field}
                    />
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
                    <Input placeholder="e.g. Technical Assistant" {...field} />
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
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder="e.g. 45000"
                      {...field}
                    />
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
              <Button type="submit">Save employee</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
