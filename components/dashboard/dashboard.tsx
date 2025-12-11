"use client";

import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import {
  LogOut,
  UsersIcon,
  Pencil,
  Trash2,
  ArrowRight,
  ReceiptIndianRupee,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Employee, SalaryRecord, SalaryExpense } from "@/lib/types";
import { AddEmployeeDialog } from "@/components/employees/add-employee-dialog";
import { EditEmployeeDialog } from "@/components/employees/edit-employee-dialog";
import { DeleteEmployeeDialog } from "@/components/employees/delete-employee-dialog";
import { AddSalaryRecordDialog } from "@/components/salary/add-salary-record-dialog";
import { EditSalaryRecordDialog } from "@/components/salary/edit-salary-record-dialog";
import { DeleteSalaryRecordDialog } from "@/components/salary/delete-salary-record-dialog";
import { AddOtherExpenseDialog } from "@/components/expenses/add-other-expenses-dialog";
import { EditOtherExpenseDialog } from "@/components/expenses/edit-other-expenses-dialog";
import { DeleteOtherExpenseDialog } from "@/components/expenses/delete-other-expenses-dialog";
import type { OtherExpense } from "@/lib/types";
import { supabase } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { exportRecordsCsv } from "@/lib/export-utils";

type DashboardClientProps = {
  initialUserEmail?: string;
};

const PAD2 = (n: number) => String(n).padStart(2, "0");

function formatDateDDMMYYYY(isoDate?: string | null) {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  const dd = PAD2(d.getDate());
  const mm = PAD2(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`; // e.g. 03/12/2025
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatPretty(isoDate?: string | null) {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  const day = d.getDate();
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
  const mon = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${ordinal(day)} ${mon} ${year}`; // e.g. "3rd Dec 2025"
}

export default function DashboardClient({
  initialUserEmail,
}: DashboardClientProps) {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>(
    () => ({})
  );

  const [otherExpenses, setOtherExpenses] = useState<OtherExpense[]>([]);
  const [isOtherExpenseOpen, setIsOtherExpenseOpen] = useState(false);
  const [visibleExpenseGroups, setVisibleExpenseGroups] = useState(10);

  const [editingOther, setEditingOther] = useState<OtherExpense | null>(null);
  const [isEditOtherOpen, setIsEditOtherOpen] = useState(false);

  const [deleteOther, setDeleteOther] = useState<OtherExpense | null>(null);
  const [isDeleteOtherOpen, setIsDeleteOtherOpen] = useState(false);

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

  // paging config
  const PAGE_SIZE = 20;

  // Salary Records paging state
  const [recordsPage, setRecordsPage] = useState(0); // zero-based
  const [recordsHasMore, setRecordsHasMore] = useState(true);
  const [recordsLoadingMore, setRecordsLoadingMore] = useState(false);

  // Other expenses paging state
  const [otherPage, setOtherPage] = useState(0);
  const [otherHasMore, setOtherHasMore] = useState(true);
  const [otherLoadingMore, setOtherLoadingMore] = useState(false);

  const [records, setRecords] = useState<SalaryRecord[]>([]);
  const [isRecordOpen, setIsRecordOpen] = useState(false);

  const hasEmployees = employees.length > 0;

  const [isSwitching, setIsSwitching] = useState(false);

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
        user_id: userId,
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

  const handleAddOtherExpense = async (expense: {
    id: string;
    category: string;
    amount: number;
    date?: string | null;
    description?: string | null;
  }) => {
    if (!userId) return;

    const { error } = await supabase.from("other_expenses").insert({
      id: expense.id,
      user_id: userId,
      category: expense.category,
      amount: expense.amount,
      expense_date: expense.date ?? null,
      description: expense.description ?? null,
    });

    if (error) {
      console.error("Error inserting other expense:", error.message);
      return;
    }

    // keep client state in sync
    setOtherExpenses((prev) => [
      ...prev,
      {
        id: expense.id,
        userId,
        category: expense.category,
        amount: expense.amount,
        date: expense.date ?? null,
        description: expense.description ?? null,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const openEditOtherDialog = (oe: OtherExpense) => {
    setEditingOther(oe);
    setIsEditOtherOpen(true);
  };

  const openDeleteOtherDialog = (oe: OtherExpense) => {
    setDeleteOther(oe);
    setIsDeleteOtherOpen(true);
  };

  const handleSaveOther = async (updated: OtherExpense) => {
    if (!userId) return;

    const { error } = await supabase
      .from("other_expenses")
      .update({
        category: updated.category,
        amount: updated.amount,
        expense_date: updated.date ?? null,
        description: updated.description ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", updated.id)
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating other expense:", error.message);
      return;
    }

    setOtherExpenses((prev) =>
      prev.map((o) => (o.id === updated.id ? updated : o))
    );
  };

  const handleConfirmDeleteOther = async (id: string) => {
    if (!userId) return;

    const { error } = await supabase
      .from("other_expenses")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting other expense:", error.message);
      return;
    }

    setOtherExpenses((prev) => prev.filter((o) => o.id !== id));
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
        user_id: userId,
        salary_date: record.date ?? null,
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
        user_id: userId,
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

    const { error: recordError } = await supabase
      .from("salary_records")
      .update({
        employee_id: updated.employeeId,
        year: updated.year,
        month: updated.month,
        base_salary: updated.baseSalary,
        total_expenses: updated.totalExpenses,
        grand_total: updated.grandTotal,
        salary_date: updated.date ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", updated.id)
      .eq("user_id", userId);

    if (recordError) {
      console.error("Error updating salary record:", recordError.message);
      return;
    }

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

    setRecords((prev) =>
      prev.map((rec) => (rec.id === updated.id ? updated : rec))
    );
  };

  const handleConfirmDeleteRecord = async (id: string) => {
    if (!userId) return;

    const { error: expError } = await supabase
      .from("salary_expenses")
      .delete()
      .eq("salary_record_id", id)
      .eq("user_id", userId);

    if (expError) {
      console.error("Error deleting salary expenses:", expError.message);
      return;
    }

    const { error: recError } = await supabase
      .from("salary_records")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (recError) {
      console.error("Error deleting salary record:", recError.message);
      return;
    }

    setRecords((prev) => prev.filter((rec) => rec.id !== id));
  };

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const yearOptions = Array.from(
    { length: 6 },
    (_, i) => currentYear - (5 - i)
  );

  // filtered lists based on selectedYear
  const filteredRecords = useMemo(
    () => records.filter((r) => r.year === selectedYear),
    [records, selectedYear]
  );

  const filteredOtherExpenses = useMemo(
    () =>
      otherExpenses.filter((oe) => {
        const dStr = oe.date ?? oe.createdAt ?? null;
        const year = dStr ? new Date(dStr).getFullYear() : selectedYear;
        return year === selectedYear;
      }),
    [otherExpenses, selectedYear]
  );

  // grouped other expenses for UI (now uses filteredOtherExpenses)
  const groupedOtherExpenses = useMemo(() => {
    const groups: Record<
      string,
      {
        label: string;
        items: OtherExpense[];
        total: number;
        year: number;
        month: number;
      }
    > = {};

    for (const oe of filteredOtherExpenses) {
      const dateStr = oe.date ?? oe.createdAt ?? null;
      const d = dateStr ? new Date(dateStr) : new Date();
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const key = `${year}-${String(month).padStart(2, "0")}`;

      if (!groups[key]) {
        const monNames = [
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
        groups[key] = {
          label: `${monNames[month - 1]} ${year}`,
          items: [],
          total: 0,
          year,
          month,
        };
      }

      groups[key].items.push(oe);
      groups[key].total += oe.amount;
    }

    return Object.entries(groups)
      .map(([key, val]) => ({ key, ...val }))
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
  }, [filteredOtherExpenses]);

  useEffect(() => {
    if (!userId) return;

    const loadEmployees = async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", userId)
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

  useEffect(() => {
    if (!userId) return;

    const loadRecordsPage = async (page = 0) => {
      const start = page * PAGE_SIZE;
      const end = start + PAGE_SIZE - 1; // inclusive

      const { data: recordsData, error: recordsError } = await supabase
        .from("salary_records")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(start, end);

      if (recordsError) {
        console.error("Error fetching salary records:", recordsError.message);
        return { rows: [], count: 0 };
      }

      const recordRows = recordsData ?? [];
      // fetch expenses only for the returned record ids
      const recordIds = recordRows.map((r) => r.id);
      let expensesData = [];
      if (recordIds.length > 0) {
        const { data: eData, error: eErr } = await supabase
          .from("salary_expenses")
          .select("*")
          .in("salary_record_id", recordIds);
        if (eErr) {
          console.error("Error fetching salary expenses:", eErr.message);
        } else {
          expensesData = eData ?? [];
        }
      }

      // group and normalize (same as before)
      const expensesByRecord: Record<string, SalaryExpense[]> = {};
      (expensesData ?? []).forEach((row) => {
        const recId = row.salary_record_id as string;
        if (!expensesByRecord[recId]) expensesByRecord[recId] = [];
        expensesByRecord[recId].push({
          id: row.id,
          category: row.category,
          amount: row.amount,
          date: row.expense_date ?? "",
        });
      });

      const normalized: SalaryRecord[] = recordRows.map((row) => ({
        id: row.id,
        employeeId: row.employee_id,
        year: row.year,
        month: row.month,
        baseSalary: row.base_salary,
        totalExpenses: row.total_expenses,
        grandTotal: row.grand_total,
        date: row.salary_date ? String(row.salary_date).slice(0, 10) : null,
        expenses: expensesByRecord[row.id] ?? [],
      }));

      return { rows: normalized, fetched: normalized.length };
    };

    // initial load (page 0)
    (async () => {
      const { rows, fetched } = await loadRecordsPage(0);
      setRecords(rows);
      setRecordsPage(0);
      setRecordsHasMore(fetched === PAGE_SIZE);
    })();
  }, [userId]);

  const loadMoreRecords = async () => {
    if (!userId || recordsLoadingMore || !recordsHasMore) return;
    setRecordsLoadingMore(true);
    const nextPage = recordsPage + 1;
    const start = nextPage * PAGE_SIZE;
    const end = start + PAGE_SIZE - 1;

    try {
      const { data: recordsData, error: recordsError } = await supabase
        .from("salary_records")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(start, end);

      if (recordsError) {
        console.error(
          "Error fetching more salary records:",
          recordsError.message
        );
        return;
      }

      const recordRows = recordsData ?? [];
      // fetch and attach expenses similar to above
      const recordIds = recordRows.map((r) => r.id);
      let expensesData = [];
      if (recordIds.length > 0) {
        const { data: eData, error: eErr } = await supabase
          .from("salary_expenses")
          .select("*")
          .in("salary_record_id", recordIds);
        if (eErr)
          console.error("Error fetching salary expenses:", eErr.message);
        else expensesData = eData ?? [];
      }

      const expensesByRecord: Record<string, SalaryExpense[]> = {};
      (expensesData ?? []).forEach((row) => {
        const recId = row.salary_record_id as string;
        if (!expensesByRecord[recId]) expensesByRecord[recId] = [];
        expensesByRecord[recId].push({
          id: row.id,
          category: row.category,
          amount: row.amount,
          date: row.expense_date ?? "",
        });
      });

      const normalized: SalaryRecord[] = recordRows.map((row) => ({
        id: row.id,
        employeeId: row.employee_id,
        year: row.year,
        month: row.month,
        baseSalary: row.base_salary,
        totalExpenses: row.total_expenses,
        grandTotal: row.grand_total,
        date: row.salary_date ? String(row.salary_date).slice(0, 10) : null,
        expenses: expensesByRecord[row.id] ?? [],
      }));

      setRecords((prev) => [...prev, ...normalized]);
      setRecordsPage(nextPage);
      setRecordsHasMore(normalized.length === PAGE_SIZE);
    } finally {
      setRecordsLoadingMore(false);
    }
  };

  // loadOther Records hook
  useEffect(() => {
    if (!userId) return;

    const loadOtherPage = async (page = 0) => {
      const start = page * PAGE_SIZE;
      const end = start + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("other_expenses")
        .select("*")
        .eq("user_id", userId)
        .order("expense_date", { ascending: false })
        .range(start, end);

      if (error) {
        console.error("Error loading other expenses:", error.message);
        return { rows: [] };
      }

      return {
        rows: (data ?? []).map((r: any) => ({
          id: r.id,
          userId: r.user_id,
          category: r.category,
          amount: Number(r.amount),
          date: r.expense_date ? String(r.expense_date).slice(0, 10) : null,
          description: r.description ?? null,
          createdAt: r.created_at ?? null,
        })),
        fetched: (data ?? []).length,
      };
    };

    const loadMoreOtherExpenses = async () => {
      if (!userId || otherLoadingMore || !otherHasMore) return;
      setOtherLoadingMore(true);
      const nextPage = otherPage + 1;
      const start = nextPage * PAGE_SIZE;
      const end = start + PAGE_SIZE - 1;

      try {
        const { data, error } = await supabase
          .from("other_expenses")
          .select("*")
          .eq("user_id", userId)
          .order("expense_date", { ascending: false })
          .range(start, end);

        if (error) {
          console.error("Error loading more other expenses:", error.message);
          return;
        }

        const rows = (data ?? []).map((r: any) => ({
          id: r.id,
          userId: r.user_id,
          category: r.category,
          amount: Number(r.amount),
          date: r.expense_date ? String(r.expense_date).slice(0, 10) : null,
          description: r.description ?? null,
          createdAt: r.created_at ?? null,
        }));

        setOtherExpenses((prev) => [...prev, ...rows]);
        setOtherPage(nextPage);
        setOtherHasMore(rows.length === PAGE_SIZE);
      } finally {
        setOtherLoadingMore(false);
      }
    };

    (async () => {
      const { rows, fetched } = await loadOtherPage(0);
      setOtherExpenses(rows);
      setOtherPage(0);
      setOtherHasMore(fetched === PAGE_SIZE);
    })();
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
      setUserId(data.session.user.id);
      setAuthChecked(true);
    };

    checkAuth();
  }, [router]);

  const {
    totalSalaryThisYear,
    totalExpensesThisYear,
    totalOtherExpensesThisYear,
    monthlyChartData,
    topEmployees,
  } = useMemo(() => {
    let salaryYear = 0;
    let expensesYear = 0;
    let otherExpensesYear = 0;

    const monthlyTotals: Record<string, number> = {};
    const perEmployeeTotals: Record<string, number> = {};

    for (const oe of otherExpenses) {
      if (!oe) continue;
      const expYear = oe.date ? new Date(oe.date).getFullYear() : selectedYear;
      if (expYear === selectedYear) {
        otherExpensesYear += oe.amount;
        expensesYear += oe.amount;
        if (oe.date) {
          const m = String(new Date(oe.date).getMonth() + 1).padStart(2, "0");
          const key = `${expYear}-${m}`;
          monthlyTotals[key] = (monthlyTotals[key] ?? 0) + oe.amount;
        }
      }
    }

    for (const rec of records) {
      const base = rec.baseSalary ?? 0;

      if (rec.year === selectedYear) {
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
      const key = `${selectedYear}-${String(month).padStart(2, "0")}`;
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
      totalOtherExpensesThisYear: otherExpensesYear,
      monthlyChartData,
      topEmployees,
    };
  }, [records, employees, selectedYear, otherExpenses]);

  // small animation trigger when switching years
  useEffect(() => {
    setIsSwitching(true);
    const t = setTimeout(() => setIsSwitching(false), 220);
    return () => clearTimeout(t);
  }, [selectedYear]);

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
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="rounded-md border border-border/60 px-2 py-3">
                Employees: {employees.length}
              </div>

              <div className="rounded-md border border-border/60 px-2 py-3">
                Current Year Records: {filteredRecords.length}
              </div>

              {/* Year Selector (shadcn Select) */}
              <div className="rounded-md px-2 flex items-center gap-2">
                <span className="hidden md:inline text-xs text-muted-foreground">
                  Year
                </span>

                <Select
                  value={String(selectedYear)}
                  onValueChange={(val) => setSelectedYear(Number(val))}
                >
                  <SelectTrigger className="h-8 w-[80px] rounded-md px-2 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats: Monthly spend & Top employees */}
        <Card className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Monthly spend chart */}
            <div
              className={`${
                isSwitching
                  ? "opacity-70 scale-95 transition-all duration-200"
                  : "opacity-100 transition-all duration-300"
              }`}
            >
              <div className="mb-3 text-sm font-medium">
                Monthly spend ({selectedYear})
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
                          className="h-full bg-primary transition-all duration-500"
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
            <div
              className={`${
                isSwitching
                  ? "opacity-70 scale-95 transition-all duration-200"
                  : "opacity-100 transition-all duration-300"
              }`}
            >
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

                      <div className="flex items-center gap-2">
                        <div className="text-xs text-muted-foreground">
                          ₹ {emp.total.toLocaleString("en-IN")}
                        </div>

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
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>

        {/* Stats summary */}
        <div className="grid gap-3 md:grid-cols-4">
          <Card className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
            <div className="text-[11px] font-medium text-muted-foreground">
              Total salary paid ({selectedYear})
            </div>
            <div className="mt-1 text-lg font-semibold tracking-tight tabular-nums">
              ₹ {totalSalaryThisYear.toLocaleString("en-IN")}
            </div>
          </Card>

          <Card className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
            <div className="text-[11px] font-medium text-muted-foreground">
              Total employee expense reimbursed ({selectedYear})
            </div>
            <div className="mt-1 text-lg font-semibold tracking-tight tabular-nums">
              ₹ {totalExpensesThisYear.toLocaleString("en-IN")}
            </div>
          </Card>

          <Card className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
            <div className="text-[11px] font-medium text-muted-foreground">
              Total other expenses ({selectedYear})
            </div>
            <div className="mt-1 text-lg font-semibold tracking-tight tabular-nums">
              ₹{" "}
              {filteredOtherExpenses
                .reduce((s, e) => s + e.amount, 0)
                .toLocaleString("en-IN")}
            </div>
          </Card>

          <Card className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
            <div className="text-[11px] font-medium text-muted-foreground">
              Net payout ({selectedYear})
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
        <div className="grid gap-3 md:grid-cols-3">
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

          <Button
            className="h-11 justify-center rounded-xl text-sm font-medium"
            variant="secondary"
            onClick={() => setIsOtherExpenseOpen(true)}
          >
            Add other expense
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
                    <div>
                      <div className="font-medium">{emp.name}</div>
                      {emp.role && (
                        <div className="text-xs text-muted-foreground">
                          {emp.role}
                        </div>
                      )}
                    </div>

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

        <div className="grid gap-3 md:grid-cols-2">
          {/* Salary records area */}
          <Card className="rounded-2xl border border-border/60 bg-card/80 p-8 shadow-sm">
            {filteredRecords.length > 0 ? (
              <div className="space-y-4">
                <div className="text-sm font-medium">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ReceiptIndianRupee className="h-4 w-4" />
                      <span>Salary records</span>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg text-xs font-medium"
                      onClick={() => {
                        exportRecordsCsv({
                          records: filteredRecords,
                          employees,
                          fileName: `salary-records-${selectedYear}.csv`,
                        });
                      }}
                      disabled={filteredRecords.length === 0}
                    >
                      Export CSV ({selectedYear})
                    </Button>
                  </div>
                </div>
                <ul className="space-y-2 text-sm">
                  {filteredRecords.map((record) => (
                    <li
                      key={record.id}
                      className="flex flex-col gap-1 rounded-lg border border-border/60 px-3 py-2 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <div className="font-medium">
                          {getEmployeeName(record.employeeId)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {getEmployeeRole(record.employeeId)
                            ? `${getEmployeeRole(record.employeeId)} • `
                            : null}
                          {record.date
                            ? `${formatDateDDMMYYYY(record.date)}`
                            : ""}
                        </div>
                      </div>

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
                {/* to load more records */}
                {recordsHasMore && (
                  <div className="mt-3 flex justify-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={loadMoreRecords}
                      disabled={recordsLoadingMore}
                    >
                      {recordsLoadingMore ? "Loading..." : "Load more records"}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="text-sm font-medium">
                  No salary records for {selectedYear}
                </div>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Add a salary record to see a summary of salary and expenses
                  for each employee and month.
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

          {/* Other expenses area */}
          <Card className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ReceiptIndianRupee className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Other expenses</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-muted-foreground">
                  Total: ₹{" "}
                  {filteredOtherExpenses
                    .reduce((s, e) => s + e.amount, 0)
                    .toLocaleString("en-IN")}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg text-xs"
                  asChild
                >
                  <Link href={`/other_expenses/`}>
                    View All
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </div>

            {filteredOtherExpenses.length === 0 ? (
              <div className="py-4 text-sm text-muted-foreground">
                No other expenses recorded for {selectedYear}.
              </div>
            ) : (
              <>
                <div
                  className={`${
                    isSwitching
                      ? "opacity-70 scale-95 transition-all duration-200"
                      : "opacity-100 transition-all duration-300"
                  } space-y-3`}
                >
                  {groupedOtherExpenses
                    .slice(0, visibleExpenseGroups) // 👈 show only first N groups
                    .map((grp) => {
                      const isOpen = !!openMonths[grp.key];

                      return (
                        <div
                          key={grp.key}
                          className="group rounded-lg border border-border/60 overflow-hidden"
                        >
                          {/* Header */}
                          <div
                            className="cursor-pointer list-none rounded-lg px-3 py-2 flex items-center justify-between bg-card/50"
                            role="button"
                            aria-expanded={isOpen}
                            onClick={() =>
                              setOpenMonths((prev) => ({
                                ...prev,
                                [grp.key]: !prev[grp.key],
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setOpenMonths((prev) => ({
                                  ...prev,
                                  [grp.key]: !prev[grp.key],
                                }));
                              }
                            }}
                            tabIndex={0}
                          >
                            <div className="flex items-center gap-3">
                              <div className="text-sm font-medium">
                                {grp.label}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {grp.items.length} item
                                {grp.items.length > 1 ? "s" : ""}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-sm font-semibold">
                                ₹ {grp.total.toLocaleString("en-IN")}
                              </div>
                              {isOpen ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>

                          {/* Body */}
                          {isOpen && (
                            <div className="mt-2 space-y-2 px-3 pb-2">
                              {grp.items.map((oe) => (
                                <div
                                  key={oe.id}
                                  className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
                                >
                                  <div>
                                    <div className="font-medium">
                                      {oe.category}
                                    </div>
                                    {oe.description && (
                                      <div className="text-xs text-muted-foreground">
                                        {oe.description}
                                      </div>
                                    )}
                                    <div className="text-[11px] text-muted-foreground mt-1">
                                      {oe.date
                                        ? formatDateDDMMYYYY(oe.date)
                                        : oe.createdAt
                                        ? formatDateDDMMYYYY(oe.createdAt)
                                        : ""}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <div className="text-xs text-muted-foreground text-right">
                                      ₹ {oe.amount.toLocaleString("en-IN")}
                                    </div>

                                    <div className="flex items-center gap-1">
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8"
                                        onClick={() => openEditOtherDialog(oe)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>

                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-red-500 hover:text-red-500"
                                        onClick={() =>
                                          openDeleteOtherDialog(oe)
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* ---------- LOAD MORE BUTTON ---------- */}
                {visibleExpenseGroups < groupedOtherExpenses.length && (
                  <div className="pt-2 flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg text-xs"
                      onClick={() =>
                        setVisibleExpenseGroups((prev) => prev + 5)
                      }
                    >
                      Load more
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
        <div>
          <footer className="mt-6 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Power Moon TechMed Pvt.Ltd,
            Bhubaneswar | Odisha. All rights reserved.
          </footer>
        </div>
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

      <AddOtherExpenseDialog
        open={isOtherExpenseOpen}
        onOpenChange={setIsOtherExpenseOpen}
        onAdd={handleAddOtherExpense}
      />

      <EditOtherExpenseDialog
        open={isEditOtherOpen}
        onOpenChange={(open) => {
          setIsEditOtherOpen(open);
          if (!open) setEditingOther(null);
        }}
        expense={editingOther}
        onSave={(exp) => handleSaveOther(exp)}
      />

      <DeleteOtherExpenseDialog
        open={isDeleteOtherOpen}
        onOpenChange={(open) => {
          setIsDeleteOtherOpen(open);
          if (!open) setDeleteOther(null);
        }}
        expense={deleteOther}
        onConfirmDelete={(id) => handleConfirmDeleteOther(id)}
      />
    </main>
  );
}

// Made with ❤️ by Naman for Power Moon TechMed Pvt.Ltd
// Special thanks to Kaushik Behura for the Project Idea and Support
