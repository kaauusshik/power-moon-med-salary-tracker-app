"use client";

import { useMemo, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { generateSalarySlipPdf } from "@/lib/export-utils";
import {
  ArrowLeft,
  CalendarDays,
  ReceiptIndianRupee,
  UsersIcon,
  Pencil,
} from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import type { Employee, SalaryRecord, SalaryExpense } from "@/lib/types";
import { EditSalaryRecordDialog } from "@/components/salary/edit-salary-record-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export function EmployeeSpecificDetailPageClient() {
  const router = useRouter();
  const pathname = usePathname();

  // extract last segment as id, from /employees/<id>
  const id = useMemo(() => {
    if (!pathname) return "";
    const segments = pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] ?? "";
  }, [pathname]);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [records, setRecords] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editRecord, setEditRecord] = useState<SalaryRecord | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleSaveRecord = async (updated: SalaryRecord) => {
    try {
      // get current user id (for user_id filter)
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;

      if (!userId) {
        console.error("No authenticated user, cannot update salary record.");
        return;
      }

      // 1. Update main salary record row
      const { error: recordError } = await supabase
        .from("salary_records")
        .update({
          employee_id: updated.employeeId,
          year: updated.year,
          month: updated.month,
          base_salary: updated.baseSalary,
          total_expenses: updated.totalExpenses,
          grand_total: updated.grandTotal,
          updated_at: new Date().toISOString(),
        })
        .eq("id", updated.id)
        .eq("user_id", userId);

      if (recordError) {
        console.error("Error updating salary record:", recordError.message);
        return;
      }

      // 2. Replace all expenses for this record
      const { error: deleteExpError } = await supabase
        .from("salary_expenses")
        .delete()
        .eq("salary_record_id", updated.id)
        .eq("user_id", userId);

      if (deleteExpError) {
        console.error(
          "Error deleting old salary expenses:",
          deleteExpError.message
        );
        return;
      }

      if (updated.expenses && updated.expenses.length > 0) {
        const expensesPayload = updated.expenses.map((exp) => ({
          id: exp.id,
          salary_record_id: updated.id,
          category: exp.category,
          amount: exp.amount,
          expense_date: exp.date || null,
          user_id: userId,
        }));

        const { error: insertExpError } = await supabase
          .from("salary_expenses")
          .insert(expensesPayload);

        if (insertExpError) {
          console.error(
            "Error inserting updated salary expenses:",
            insertExpError.message
          );
          return;
        }
      }

      // 3. Sync local state so UI updates immediately
      setRecords((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
    } catch (err) {
      console.error("Unexpected error updating salary record:", err);
    }
  };

  const [deletingRecord, setDeletingRecord] = useState<SalaryRecord | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  const totalPaid = useMemo(
    () => records.reduce((sum, r) => sum + r.grandTotal, 0),
    [records]
  );

  const totalExpenses = useMemo(
    () => records.reduce((sum, r) => sum + r.totalExpenses, 0),
    [records]
  );

  const formatMonthYear = (month: number, year: number) => {
    const names = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const label = names[month - 1] ?? String(month);
    return `${label} ${year}`;
  };

  const handleDeleteRecord = async () => {
    if (!deletingRecord) return;
    setDeleting(true);

    try {
      const { error } = await supabase
        .from("salary_records")
        .delete()
        .eq("id", deletingRecord.id);

      if (error) {
        console.error("Error deleting salary record:", error.message);
        setDeleting(false);
        return;
      }

      // Remove from local state
      setRecords((prev) => prev.filter((r) => r.id !== deletingRecord.id));
      setDeletingRecord(null);
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setError("No employee id in URL.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      // 1) employee
      const { data: emp, error: empError } = await supabase
        .from("employees")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (empError) {
        setError(`Error loading employee: ${empError.message}`);
        setLoading(false);
        return;
      }

      if (!emp) {
        setError("Employee not found.");
        setLoading(false);
        return;
      }

      const employeeObj: Employee = {
        id: emp.id,
        name: emp.name,
        role: emp.role ?? undefined,
        baseSalary: emp.base_salary ?? null,
      };
      setEmployee(employeeObj);

      // 2) records
      const { data: recordsData, error: recError } = await supabase
        .from("salary_records")
        .select("*")
        .eq("employee_id", id)
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (recError) {
        setError(`Error loading salary records: ${recError.message}`);
        setLoading(false);
        return;
      }

      const recordRows = recordsData ?? [];

      // 3) expenses
      let expensesRows: any[] = [];
      if (recordRows.length > 0) {
        const recordIds = recordRows.map((r) => r.id);
        const { data: expData, error: expError } = await supabase
          .from("salary_expenses")
          .select("*")
          .in("salary_record_id", recordIds);

        if (expError) {
          setError(`Error loading salary expenses: ${expError.message}`);
          setLoading(false);
          return;
        }

        expensesRows = expData ?? [];
      }

      const expensesByRecord: Record<string, SalaryExpense[]> = {};
      expensesRows.forEach((row) => {
        const recId = row.salary_record_id as string;
        if (!expensesByRecord[recId]) {
          expensesByRecord[recId] = [];
        }
        expensesByRecord[recId].push({
          id: row.id,
          category: row.category,
          amount: row.amount,
          date: row.expense_date ?? "",
        });
      });

      const recordObjs: SalaryRecord[] = recordRows.map((row) => ({
        id: row.id,
        employeeId: row.employee_id,
        year: row.year,
        month: row.month,
        baseSalary: row.base_salary,
        totalExpenses: row.total_expenses,
        grandTotal: row.grand_total,
        expenses: expensesByRecord[row.id] ?? [],
      }));

      setRecords(recordObjs);
      setLoading(false);
    };

    load();
  }, [id]);

  // UI states
  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <header className="border-b border-border bg-background/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => router.push("/")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-semibold tracking-tight">
                Employee details
              </div>
            </div>
          </div>
        </header>
        <section className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted-foreground">
          Loading employee…
        </section>
      </main>
    );
  }

  if (error || !employee) {
    return (
      <main className="min-h-screen bg-background">
        <header className="border-b border-border bg-background/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => router.push("/")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-semibold tracking-tight">
                Employee details
              </div>
            </div>
          </div>
        </header>
        <section className="mx-auto max-w-6xl px-4 py-10 text-sm">
          <p className="mb-2 font-medium text-red-600">
            {error ?? "Employee not found."}
          </p>
          <Button variant="outline" size="sm" onClick={() => router.push("/")}>
            Back to dashboard
          </Button>
        </section>
      </main>
    );
  }

  // Normal render
  return (
    <main className="min-h-screen bg-background">
      {/* top bar */}
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => router.push("/")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-semibold tracking-tight">
              Employee details
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* content */}
      <section className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
        {/* Employee summary */}
        <Card className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <UsersIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight">
                  {employee.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {employee.role || "No role specified"}
                </p>
              </div>
            </div>

            <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
              <div className="rounded-md border border-border/60 px-2 py-1">
                Records:{" "}
                <span className="font-medium text-foreground">
                  {records.length}
                </span>
              </div>
              <div className="rounded-md border border-border/60 px-2 py-1">
                Total paid:{" "}
                <span className="font-medium text-foreground">
                  ₹ {totalPaid.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="rounded-md border border-border/60 px-2 py-1">
                Total expenses:{" "}
                <span className="font-medium text-foreground">
                  ₹ {totalExpenses.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Records table */}
        <Card className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ReceiptIndianRupee className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Salary history</span>
            </div>
          </div>

          <Separator className="mb-4" />

          {records.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No salary records yet for this employee.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Period</TableHead>
                    <TableHead>Salary</TableHead>
                    <TableHead>Expenses</TableHead>
                    <TableHead>Grand total</TableHead>
                    <TableHead className="table-cell">
                      Expenses detail
                    </TableHead>
                    <TableHead className="w-[90px] text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="align-top text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          {formatMonthYear(record.month, record.year)}
                        </div>
                      </TableCell>
                      <TableCell className="align-top text-sm">
                        ₹ {(record.baseSalary ?? 0).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="align-top text-sm">
                        ₹ {record.totalExpenses.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="align-top text-sm font-semibold">
                        ₹ {record.grandTotal.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="align-top text-xs text-muted-foreground table-cell">
                        {record.expenses.length === 0 ? (
                          <span>No expenses</span>
                        ) : (
                          <ul className="space-y-1">
                            {record.expenses.map((exp) => (
                              <li key={exp.id}>
                                {exp.category} – ₹{" "}
                                {exp.amount.toLocaleString("en-IN")}
                                {exp.date ? ` • ${exp.date}` : ""}
                              </li>
                            ))}
                          </ul>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditRecord(record);
                              setIsEditOpen(true);
                            }}
                            aria-label={`Edit record ${formatMonthYear(
                              record.month,
                              record.year
                            )}`}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-500 hover:text-red-500"
                            onClick={() => setDeletingRecord(record)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 rounded-lg text-[11px]"
                            onClick={() => {
                              if (!employee) return;
                              generateSalarySlipPdf({ employee, record });
                            }}
                          >
                            PDF
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </section>

      <EditSalaryRecordDialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setEditRecord(null);
        }}
        record={editRecord}
        employees={[employee]} // only this employee in this page
        onSave={handleSaveRecord}
      />

      <AlertDialog
        open={!!deletingRecord}
        onOpenChange={(open) => {
          if (!open) setDeletingRecord(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this salary record?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will permanently delete this salary record and its expenses
              for this employee. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRecord}
              disabled={deleting}
              className="bg-red-500 text-white hover:bg-red-500/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
