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
import type { Employee, SalaryExpense, SalaryRecord } from "@/lib/types";
import { Trash2 } from "lucide-react";

const recordSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  date: z
    .string()
    .min(10, "Date is required")
    .refine((val) => {
      // basic check for YYYY-MM-DD from input[type=date]
      return /^\d{4}-\d{2}-\d{2}$/.test(val);
    }, "Invalid date"),
  salary: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!Number.isNaN(Number(val)) && Number(val) >= 0),
      "Must be a valid non-negative number"
    ),
});
type RecordFormValues = z.infer<typeof recordSchema>;

// simple expense draft type for inside the dialog
type ExpenseDraft = {
  id: string;
  category: string;
  amount: string; // keep as string for inputs
  date: string; // "YYYY-MM-DD"
};

interface AddSalaryRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  onAdd: (record: SalaryRecord) => Promise<void> | void;
}

export function AddSalaryRecordDialog({
  open,
  onOpenChange,
  employees,
  onAdd,
}: AddSalaryRecordDialogProps) {
  const form = useForm<RecordFormValues>({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      employeeId: "",
      date: new Date().toISOString().slice(0, 10), // today's date "YYYY-MM-DD"
      salary: "",
    },
  });

  // expenses managed separately from react-hook-form for simplicity
  const [expenseDraft, setExpenseDraft] = React.useState<ExpenseDraft>({
    id: "",
    category: "",
    amount: "",
    date: "",
  });
  const [expenses, setExpenses] = React.useState<ExpenseDraft[]>([]);

  React.useEffect(() => {
    if (!open) {
      form.reset({
        employeeId: "",
        date: new Date().toISOString().slice(0, 10), // reset to today
        salary: "",
      });
      setExpenses([]);
      setExpenseDraft({ id: "", category: "", amount: "", date: "" });
    }
  }, [open, form]);

  const totalExpensesNumber = expenses.reduce((sum, e) => {
    const n = Number(e.amount);
    if (Number.isNaN(n)) return sum;
    return sum + n;
  }, 0);

  const salaryNumber = form.watch("salary") ? Number(form.watch("salary")) : 0;

  const grandTotal = salaryNumber + totalExpensesNumber;

  const canAddExpense =
    expenseDraft.category.trim() !== "" &&
    expenseDraft.amount.trim() !== "" &&
    !Number.isNaN(Number(expenseDraft.amount)) &&
    Number(expenseDraft.amount) >= 0;

  const handleAddExpense = () => {
    if (!canAddExpense) return;
    setExpenses((prev) => [
      ...prev,
      {
        ...expenseDraft,
        id: crypto.randomUUID(),
      },
    ]);
    setExpenseDraft({ id: "", category: "", amount: "", date: "" });
  };

  const handleRemoveExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const handleSubmit = (values: RecordFormValues) => {
    const baseSalary =
      values.salary && values.salary.trim() !== ""
        ? Number(values.salary)
        : null;

    // month/year derived from values.date (YYYY-MM-DD)
    const dateObj = new Date(values.date);
    const monthNumber = dateObj.getMonth() + 1; // 1..12
    const yearNumber = dateObj.getFullYear();

    const normalizedExpenses: SalaryExpense[] = expenses
      .map((e) => {
        const amt = Number(e.amount);
        if (Number.isNaN(amt)) return null;
        return {
          id: e.id,
          category: e.category,
          amount: amt,
          date: e.date || "",
        } as SalaryExpense;
      })
      .filter((e): e is SalaryExpense => e !== null);

    const totalExpenses = normalizedExpenses.reduce(
      (sum, e) => sum + e.amount,
      0
    );

    const record: SalaryRecord = {
      id: crypto.randomUUID(),
      employeeId: values.employeeId,
      year: yearNumber,
      month: monthNumber,
      baseSalary,
      expenses: normalizedExpenses,
      totalExpenses,
      grandTotal: (baseSalary ?? 0) + totalExpenses,
      date: values.date, // store ISO YYYY-MM-DD
    };

    onAdd(record);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add salary record</DialogTitle>
          <DialogDescription>
            Record this month's salary and any additional expenses for an
            employee.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {/* Employee + period */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee</FormLabel>
                    <FormControl>
                      <select
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="block w-full rounded-md border border-input px-3 py-2 text-sm"
                      >
                        <option value="" disabled>
                          Select employee
                        </option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name}
                            {emp.role ? ` (${emp.role})` : ""}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="salary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salary</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="decimal"
                          placeholder="Enter salary amount"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Expenses */}
            <div className="space-y-3 rounded-lg border border-border/60 bg-muted/40 p-4">
              <div className="text-sm font-medium">Other expenses</div>

              <div className="grid gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Expense category
                    </label>
                    <Input
                      placeholder="e.g. Fuel, Food, Travel"
                      value={expenseDraft.category}
                      onChange={(e) =>
                        setExpenseDraft((prev) => ({
                          ...prev,
                          category: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Amount
                    </label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder="Enter amount"
                      value={expenseDraft.amount}
                      onChange={(e) =>
                        setExpenseDraft((prev) => ({
                          ...prev,
                          amount: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Expense date (optional)
                  </label>
                  <Input
                    type="date"
                    value={expenseDraft.date}
                    onChange={(e) =>
                      setExpenseDraft((prev) => ({
                        ...prev,
                        date: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-lg text-xs font-medium"
                    onClick={handleAddExpense}
                    disabled={!canAddExpense}
                  >
                    + Add expense
                  </Button>
                </div>
              </div>

              {expenses.length > 0 && (
                <div className="space-y-2 text-xs">
                  <div className="text-[11px] font-medium uppercase text-muted-foreground">
                    Added expenses
                  </div>
                  <ul className="space-y-1">
                    {expenses.map((e) => (
                      <li
                        key={e.id}
                        className="flex items-center justify-between rounded-md border border-border/60 bg-background px-2 py-1"
                      >
                        <div>
                          <div className="font-medium text-xs">
                            {e.category}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            ₹ {Number(e.amount).toLocaleString("en-IN")}
                            {e.date ? ` • ${e.date}` : ""}
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-red-500 hover:text-red-500"
                          onClick={() => handleRemoveExpense(e.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="space-y-1 rounded-lg p-3 text-xs">
              <div>
                Salary:{" "}
                <span className="font-medium">
                  ₹ {salaryNumber.toLocaleString("en-IN")}
                </span>
              </div>
              <div>
                Expenses:{" "}
                <span className="font-medium">
                  ₹ {totalExpensesNumber.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="text-xl font-semibold text-green-500">
                Grand total: ₹ {grandTotal.toLocaleString("en-IN")}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save record</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
