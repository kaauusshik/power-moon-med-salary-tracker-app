"use client";

import * as React from "react";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  CalendarDays,
  ReceiptIndianRupee,
  UsersIcon,
} from "lucide-react";
import type { Employee, SalaryRecord } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Props = {
  employee: Employee;
  initialRecords: SalaryRecord[];
};

export function EmployeeDetailClient({ employee, initialRecords }: Props) {
  const router = useRouter();
  const [records] = React.useState<SalaryRecord[]>(initialRecords);

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
            {/* future: Add/Edit buttons here */}
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
                    <TableHead className="hidden md:table-cell">
                      Expenses detail
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
                      <TableCell className="hidden align-top text-xs text-muted-foreground md:table-cell">
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </section>
    </main>
  );
}
