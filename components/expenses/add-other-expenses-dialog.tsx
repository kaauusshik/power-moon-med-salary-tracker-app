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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const schema = z.object({
  category: z.string().min(1, "Category is required"),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine(
      (val) => !Number.isNaN(Number(val)) && Number(val) >= 0,
      "Invalid amount"
    ),
  date: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), "Invalid date"),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (expense: {
    id: string;
    category: string;
    amount: number;
    date?: string | null;
    description?: string | null;
  }) => Promise<void> | void;
}

export function AddOtherExpenseDialog({ open, onOpenChange, onAdd }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: "",
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      description: "",
    },
  });

  React.useEffect(() => {
    if (!open) {
      form.reset({
        category: "",
        amount: "",
        date: new Date().toISOString().slice(0, 10),
        description: "",
      });
    }
  }, [open, form]);

  const handleSubmit = (values: FormValues) => {
    const payload = {
      id: crypto.randomUUID(),
      category: values.category.trim(),
      amount: Number(values.amount),
      date: values.date && values.date.trim() !== "" ? values.date : null,
      description: values.description?.trim() ?? null,
    };

    onAdd(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add other expense</DialogTitle>
          <DialogDescription>
            Record any company-level expense not tied to an employee.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter Name Here" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input type="number" inputMode="decimal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date (optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (or Category)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional e.g. Monthly office rent, Printer ink"
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save expense</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
