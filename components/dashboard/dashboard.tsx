"use client";

import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import {
  LogOut,
  UsersIcon,
  Pencil,
  Trash2,
  ArrowRight,
  ReceiptIndianRupee,
} from "lucide-react";
import type { Employee, SalaryRecord, SalaryExpense } from "@/lib/types";
import { AddEmployeeDialog } from "@/components/employees/add-employee-dialog";
import { EditEmployeeDialog } from "@/components/employees/edit-employee-dialog";
import { DeleteEmployeeDialog } from "@/components/employees/delete-employee-dialog";
import { AddSalaryRecordDialog } from "@/components/salary/add-salary-record-dialog";
import { EditSalaryRecordDialog } from "@/components/salary/edit-salary-record-dialog";
import { DeleteSalaryRecordDialog } from "@/components/salary/delete-salary-record-dialog";
import { supabase } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { exportRecordsCsv } from "@/lib/export-utils";

type DashboardClientProps = {
  initialUserEmail?: string;
};

export default function DashboardClient({
  initialUserEmail,
}: DashboardClientProps) {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [deleteEmployee, setDeleteEmployee] = useState<Employee | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [editRecord, setEditRecord] = useState<SalaryRecord | null>(null);
  const [isEditRecordOpen, setIsEditRecordOpen] = useState(false);

  const [deleteRecord, setDeleteRecord] = useState<SalaryRecord | null>(null);
  const [isDeleteRecordOpen, setIsDeleteRecordOpen] = useState(false);

  const [records, setRecords] = useState<SalaryRecord[]>([]);
  const [isRecordOpen, setIsRecordOpen] = useState(false);

  const hasEmployees = employees.length > 0;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  };

  const handleAddEmployee = async (employee: Employee) => {
    if (!userId) return; // or show error

    const { data, error } = await supabase
      .from("employees")
      .insert({
        id: employee.id,
        name: employee.name,
        role: employee.role ?? null,
        base_salary: employee.baseSalary ?? null,
        user_id: userId, // 👈 important
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting employee:", error.message);
      return;
    }

    setEmployees((prev) => [
      ...prev,
      {
        id: data.id,
        name: data.name,
        role: data.role ?? undefined,
        baseSalary: data.base_salary ?? null,
      },
    ]);
  };

  const handleSaveEmployee = async (updated: Employee) => {
    const { data, error } = await supabase
      .from("employees")
      .update({
        name: updated.name,
        role: updated.role ?? null,
        base_salary: updated.baseSalary ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", updated.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating employee:", error.message);
      return;
    }

    // keep local state in sync with whatever DB has
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === data.id
          ? {
              id: data.id,
              name: data.name,
              role: data.role ?? undefined,
              baseSalary: data.base_salary ?? null,
            }
          : emp
      )
    );
  };

  const handleConfirmDelete = async (id: string) => {
    const { error } = await supabase.from("employees").delete().eq("id", id);

    if (error) {
      console.error("Error deleting employee:", error.message);
      return;
    }

    setEmployees((prev) => prev.filter((emp) => emp.id !== id));
    setRecords((prev) => prev.filter((rec) => rec.employeeId !== id));
  };

  const handleAddRecord = async (record: SalaryRecord) => {
    if (!userId) return;

    const { error: recordError } = await supabase
      .from("salary_records")
      .insert({
        id: record.id,
        employee_id: record.employeeId,
        year: record.year,
        month: record.month,
        base_salary: record.baseSalary,
        total_expenses: record.totalExpenses,
        grand_total: record.grandTotal,
        user_id: userId, // 👈 tie to user
      });

    if (recordError) {
      console.error("Error inserting salary record:", recordError.message);
      return;
    }

    if (record.expenses.length > 0) {
      const expensesPayload = record.expenses.map((exp) => ({
        id: exp.id,
        salary_record_id: record.id,
        category: exp.category,
        amount: exp.amount,
        expense_date: exp.date || null,
        user_id: userId, // 👈 also set here
      }));

      const { error: expError } = await supabase
        .from("salary_expenses")
        .insert(expensesPayload);

      if (expError) {
        console.error("Error inserting salary expenses:", expError.message);
      }
    }

    setRecords((prev) => [...prev, record]);
  };

  const openAddDialog = () => setIsAddOpen(true);

  const openEditDialog = (employee: Employee) => {
    setEditEmployee(employee);
    setIsEditOpen(true);
  };

  const openDeleteDialog = (employee: Employee) => {
    setDeleteEmployee(employee);
    setIsDeleteOpen(true);
  };

  const handleEditOpenChange = (open: boolean) => {
    setIsEditOpen(open);
    if (!open) setEditEmployee(null);
  };

  const handleDeleteOpenChange = (open: boolean) => {
    setIsDeleteOpen(open);
    if (!open) setDeleteEmployee(null);
  };

  const getEmployeeName = (employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    return emp ? emp.name : "Unknown employee";
  };

  const getEmployeeRole = (employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    return emp?.role ?? "";
  };

  const formatMonthYear = (month: number, year: number) => {
    const monthNames = [
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
    const label = monthNames[month - 1] ?? String(month);
    return `${label} ${year}`;
  };

  const openEditRecordDialog = (record: SalaryRecord) => {
    setEditRecord(record);
    setIsEditRecordOpen(true);
  };

  const openDeleteRecordDialog = (record: SalaryRecord) => {
    setDeleteRecord(record);
    setIsDeleteRecordOpen(true);
  };

  const handleEditRecordOpenChange = (open: boolean) => {
    setIsEditRecordOpen(open);
    if (!open) setEditRecord(null);
  };

  const handleDeleteRecordOpenChange = (open: boolean) => {
    setIsDeleteRecordOpen(open);
    if (!open) setDeleteRecord(null);
  };

  const handleSaveRecord = async (updated: SalaryRecord) => {
    if (!userId) return;

    // 1. Update the main salary record row
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
      .eq("user_id", userId); // optional but safer

    if (recordError) {
      console.error("Error updating salary record:", recordError.message);
      return;
    }

    // 2. Replace existing expenses for this record
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

    // 3. Sync local React state
    setRecords((prev) =>
      prev.map((rec) => (rec.id === updated.id ? updated : rec))
    );
  };

  const handleConfirmDeleteRecord = async (id: string) => {
    if (!userId) return;

    // First delete expenses for this record
    const { error: expError } = await supabase
      .from("salary_expenses")
      .delete()
      .eq("salary_record_id", id)
      .eq("user_id", userId);

    if (expError) {
      console.error("Error deleting salary expenses:", expError.message);
      return;
    }

    // Then delete the salary record itself
    const { error: recError } = await supabase
      .from("salary_records")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (recError) {
      console.error("Error deleting salary record:", recError.message);
      return;
    }

    // Remove from local state
    setRecords((prev) => prev.filter((rec) => rec.id !== id));
  };

  // effect for loading employees from supabase
  useEffect(() => {
    if (!userId) return;

    const loadEmployees = async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", userId) // 👈 filter by user
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching employees:", error.message);
        return;
      }

      if (data) {
        setEmployees(
          data.map((row) => ({
            id: row.id,
            name: row.name,
            role: row.role ?? undefined,
            baseSalary: row.base_salary ?? null,
          }))
        );
      }
    };

    loadEmployees();
  }, [userId]);

  // effect for loading salary records from supabase
  useEffect(() => {
    if (!userId) return;

    const loadRecords = async () => {
      const { data: recordsData, error: recordsError } = await supabase
        .from("salary_records")
        .select("*")
        .eq("user_id", userId) // filter by user
        .order("created_at", { ascending: true });

      if (recordsError) {
        console.error("Error fetching salary records:", recordsError.message);
        return;
      }

      const recordRows = recordsData ?? [];
      const recordIds = recordRows.map((r) => r.id);

      // only fetch expenses for these records
      const { data: expensesData, error: expensesError } = await supabase
        .from("salary_expenses")
        .select("*")
        .in("salary_record_id", recordIds);

      if (expensesError) {
        console.error("Error fetching salary expenses:", expensesError.message);
        return;
      }

      // Group expenses by salary_record_id
      const expensesByRecord: Record<string, SalaryExpense[]> = {};
      (expensesData ?? []).forEach((row) => {
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

      // Build our SalaryRecord[]
      const normalized: SalaryRecord[] = recordRows.map((row) => ({
        id: row.id,
        employeeId: row.employee_id,
        year: row.year,
        month: row.month,
        baseSalary: row.base_salary,
        totalExpenses: row.total_expenses,
        grandTotal: row.grand_total,
        expenses: expensesByRecord[row.id] ?? [],
      }));

      setRecords(normalized);
    };

    loadRecords();
  }, [userId]);

  // effect for checking auth state
  useEffect(() => {
    const checkAuth = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        setAuthChecked(true);
        router.push("/auth");
        return;
      }

      setUserEmail(data.session.user.email ?? null);
      setUserId(data.session.user.id); // 👈 store user id
      setAuthChecked(true);
    };

    checkAuth();
  }, [router]);

  const currentYear = new Date().getFullYear();

  const {
    totalSalaryThisYear,
    totalExpensesThisYear,
    monthlyChartData,
    topEmployees,
  } = useMemo(() => {
    let salaryYear = 0;
    let expensesYear = 0;

    const monthlyTotals: Record<string, number> = {};
    const perEmployeeTotals: Record<string, number> = {};

    for (const rec of records) {
      const base = rec.baseSalary ?? 0;

      if (rec.year === currentYear) {
        salaryYear += base;
        expensesYear += rec.totalExpenses;

        const key = `${rec.year}-${String(rec.month).padStart(2, "0")}`;
        monthlyTotals[key] = (monthlyTotals[key] ?? 0) + rec.grandTotal;
      }

      perEmployeeTotals[rec.employeeId] =
        (perEmployeeTotals[rec.employeeId] ?? 0) + rec.grandTotal;
    }

    const monthNames = [
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

    const monthlyChartData = Array.from({ length: 12 }, (_, idx) => {
      const month = idx + 1;
      const key = `${currentYear}-${String(month).padStart(2, "0")}`;
      return {
        label: monthNames[idx],
        total: monthlyTotals[key] ?? 0,
      };
    });

    const employeeTotals = employees.map((e) => ({
      id: e.id,
      name: e.name,
      role: e.role,
      total: perEmployeeTotals[e.id] ?? 0,
    }));

    const topEmployees = employeeTotals
      .filter((e) => e.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);

    return {
      totalSalaryThisYear: salaryYear,
      totalExpensesThisYear: expensesYear,
      monthlyChartData,
      topEmployees,
    };
  }, [records, employees, currentYear]);

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">
        Checking session…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="text-sm font-semibold tracking-tight">
            <Image
              src="/pmtmed_icon_512px.png"
              alt="Logo"
              width={24}
              height={24}
              className="inline-block mr-2"
            />
            Power Moon TechMed Pvt.Ltd
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground md:inline">
              {userEmail ? `Signed in as ${userEmail}` : "Signed in"}
            </span>

            <ThemeToggle />

            {/* sign out */}
            <Button size="icon" variant="outline" onClick={handleLogout}>
              <LogOut />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <section className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
        {/* Header card */}
        <Card className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                Salary Tracker
              </h1>
              <p className="text-sm text-muted-foreground">
                Track monthly salaries and expenses for your employees.
              </p>
            </div>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <div className="rounded-md border border-border/60 px-2 py-1">
                Employees: {employees.length}
              </div>
              <div className="rounded-md border border-border/60 px-2 py-1">
                Records this month: {records.length}
              </div>
            </div>
          </div>
        </Card>

        {/* Stats: Monthly spend & Top employees */}
        <Card className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Monthly spend chart */}
            <div>
              <div className="mb-3 text-sm font-medium">
                Monthly spend ({currentYear})
              </div>
              <div className="space-y-1">
                {(() => {
                  const maxTotal = Math.max(
                    0,
                    ...monthlyChartData.map((m) => m.total)
                  );

                  return monthlyChartData.map((m) => (
                    <div
                      key={m.label}
                      className="flex items-center gap-2 text-[11px]"
                    >
                      <div className="w-8 text-muted-foreground">{m.label}</div>
                      <div className="flex-1 rounded-full bg-muted/60 h-2 overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width:
                              maxTotal > 0
                                ? `${(m.total / maxTotal) * 100}%`
                                : "0%",
                          }}
                        />
                      </div>
                      <div className="w-20 text-right tabular-nums">
                        ₹ {m.total.toLocaleString("en-IN")}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Top employees */}
            <div>
              <div className="mb-3 text-sm font-medium">
                Top employees by payout
              </div>
              {topEmployees.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No salary records yet to compare employees.
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {topEmployees.map((emp, idx) => (
                    <li
                      key={emp.id}
                      className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
                    >
                      <div>
                        <div className="font-medium">
                          {idx + 1}. {emp.name}
                        </div>
                        {emp.role && (
                          <div className="text-[11px] text-muted-foreground">
                            {emp.role}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ₹ {emp.total.toLocaleString("en-IN")}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>

        {/* Stats summary */}
        <div className="grid gap-3 md:grid-cols-3">
          <Card className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
            <div className="text-[11px] font-medium text-muted-foreground">
              Total salary paid ({currentYear})
            </div>
            <div className="mt-1 text-lg font-semibold tracking-tight tabular-nums">
              ₹ {totalSalaryThisYear.toLocaleString("en-IN")}
            </div>
          </Card>

          <Card className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
            <div className="text-[11px] font-medium text-muted-foreground">
              Total expenses reimbursed ({currentYear})
            </div>
            <div className="mt-1 text-lg font-semibold tracking-tight tabular-nums">
              ₹ {totalExpensesThisYear.toLocaleString("en-IN")}
            </div>
          </Card>

          <Card className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
            <div className="text-[11px] font-medium text-muted-foreground">
              Net payout ({currentYear})
            </div>
            <div className="mt-1 text-lg font-semibold tracking-tight tabular-nums">
              ₹{" "}
              {(totalSalaryThisYear + totalExpensesThisYear).toLocaleString(
                "en-IN"
              )}
            </div>
          </Card>
        </div>

        {/* Actions */}
        <div className="grid gap-3 md:grid-cols-2">
          <Button
            className="h-11 justify-center rounded-xl text-sm font-medium"
            onClick={openAddDialog}
          >
            Add employee
          </Button>

          <Button
            className="h-11 justify-center rounded-xl text-sm font-medium"
            variant="outline"
            onClick={() => setIsRecordOpen(true)}
            disabled={employees.length === 0}
          >
            Add salary record
          </Button>
        </div>

        {/* Employees area */}
        <Card className="rounded-2xl border border-border/60 bg-card/80 p-8 shadow-sm">
          {hasEmployees ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <UsersIcon className="h-4 w-4" />
                <span>Employees</span>
              </div>

              <ul className="space-y-2 text-sm">
                {employees.map((emp) => (
                  <li
                    key={emp.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
                  >
                    {/* left: name + role */}
                    <div>
                      <div className="font-medium">{emp.name}</div>
                      {emp.role && (
                        <div className="text-xs text-muted-foreground">
                          {emp.role}
                        </div>
                      )}
                    </div>

                    {/* right: salary + actions */}
                    <div className="flex items-center gap-2">
                      {typeof emp.baseSalary === "number" && (
                        <div className="text-xs text-muted-foreground">
                          ₹ {emp.baseSalary.toLocaleString("en-IN")}
                        </div>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg text-xs"
                        asChild
                      >
                        <Link href={`/employees/${emp.id}`}>
                          View
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(emp)}
                        aria-label={`Edit ${emp.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500 hover:text-red-500"
                        onClick={() => openDeleteDialog(emp)}
                        aria-label={`Delete ${emp.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-border/70 text-sm text-muted-foreground">
                <UsersIcon />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">No employees added yet</p>
                <p className="text-xs text-muted-foreground">
                  Start by creating your first employee. You&apos;ll then be
                  able to add monthly salary records.
                </p>
              </div>
              <Button
                size="sm"
                className="mt-1 rounded-lg text-xs font-medium"
                onClick={openAddDialog}
              >
                Add your first employee
              </Button>
            </div>
          )}
        </Card>

        {/* Salary records area */}
        <Card className="rounded-2xl border border-border/60 bg-card/80 p-8 shadow-sm">
          {records.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ReceiptIndianRupee className="h-4 w-4" />
                <span>Salary records</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg text-xs font-medium"
                  onClick={() => {
                    const filtered = records.filter(
                      (r) => r.year === currentYear
                    );
                    exportRecordsCsv({
                      records: filtered,
                      employees,
                      fileName: `salary-records-${currentYear}.csv`,
                    });
                  }}
                  disabled={records.length === 0}
                >
                  Export CSV ({currentYear})
                </Button>
              </div>
              <ul className="space-y-2 text-sm">
                {records.map((record) => (
                  <li
                    key={record.id}
                    className="flex flex-col gap-1 rounded-lg border border-border/60 px-3 py-2 md:flex-row md:items-center md:justify-between"
                  >
                    {/* Left: employee + period */}
                    <div>
                      <div className="font-medium">
                        {getEmployeeName(record.employeeId)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getEmployeeRole(record.employeeId)
                          ? `${getEmployeeRole(record.employeeId)} • `
                          : null}
                        {formatMonthYear(record.month, record.year)}
                      </div>
                    </div>

                    {/* Right: money summary */}
                    <div className="flex flex-col items-start gap-1 text-xs md:items-end">
                      <div className="text-muted-foreground">
                        Salary:{" "}
                        <span className="font-medium">
                          ₹ {(record.baseSalary ?? 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        Expenses:{" "}
                        <span className="font-medium">
                          ₹ {record.totalExpenses.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="font-semibold text-foreground text-green-500">
                        Grand total: ₹{" "}
                        {record.grandTotal.toLocaleString("en-IN")}
                      </div>

                      <div className="mt-2 flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => openEditRecordDialog(record)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-500 hover:text-red-500"
                          onClick={() => openDeleteRecordDialog(record)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="text-sm font-medium">No salary records yet</div>
              <p className="text-xs text-muted-foreground max-w-sm">
                Add a salary record to see a summary of salary and expenses for
                each employee and month.
              </p>
              <Button
                size="sm"
                className="mt-1 rounded-lg text-xs font-medium"
                variant="outline"
                onClick={() => setIsRecordOpen(true)}
                disabled={employees.length === 0}
              >
                Add first salary record
              </Button>
            </div>
          )}
        </Card>
      </section>

      {/* Dialogs */}
      <AddEmployeeDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onAdd={handleAddEmployee}
      />

      <EditEmployeeDialog
        open={isEditOpen}
        onOpenChange={handleEditOpenChange}
        employee={editEmployee}
        onSave={handleSaveEmployee}
      />

      <DeleteEmployeeDialog
        open={isDeleteOpen}
        onOpenChange={handleDeleteOpenChange}
        employee={deleteEmployee}
        onConfirmDelete={handleConfirmDelete}
      />

      <AddSalaryRecordDialog
        open={isRecordOpen}
        onOpenChange={setIsRecordOpen}
        employees={employees}
        onAdd={handleAddRecord}
      />

      <EditSalaryRecordDialog
        open={isEditRecordOpen}
        onOpenChange={handleEditRecordOpenChange}
        record={editRecord}
        employees={employees}
        onSave={handleSaveRecord}
      />

      <DeleteSalaryRecordDialog
        open={isDeleteRecordOpen}
        onOpenChange={handleDeleteRecordOpenChange}
        record={deleteRecord}
        onConfirmDelete={handleConfirmDeleteRecord}
      />
    </main>
  );
}
