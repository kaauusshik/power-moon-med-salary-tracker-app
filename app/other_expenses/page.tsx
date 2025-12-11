"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ReceiptIndianRupee,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import type { OtherExpense } from "@/lib/types";
import { AddOtherExpenseDialog } from "@/components/expenses/add-other-expenses-dialog";
import { EditOtherExpenseDialog } from "@/components/expenses/edit-other-expenses-dialog";
import { DeleteOtherExpenseDialog } from "@/components/expenses/delete-other-expenses-dialog";

const PAD2 = (n: number) => String(n).padStart(2, "0");
function formatDateDDMMYYYY(isoDate?: string | null) {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  const dd = PAD2(d.getDate());
  const mm = PAD2(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function OtherExpensesPageClient() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [otherExpenses, setOtherExpenses] = useState<OtherExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // dialogs + editing state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingOther, setEditingOther] = useState<OtherExpense | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteOther, setDeleteOther] = useState<OtherExpense | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // open months state for collapsibles
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});

  // auth check and set userId
  useEffect(() => {
    const check = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        setAuthChecked(true);
        router.push("/auth");
        return;
      }
      setUserId(data.session.user.id);
      setUserEmail(data.session.user.email ?? null);
      setAuthChecked(true);
    };
    check();
  }, [router]);

  // load other expenses
  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("other_expenses")
        .select("*")
        .eq("user_id", userId)
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setOtherExpenses(
        (data ?? []).map((r: any) => ({
          id: r.id,
          userId: r.user_id,
          category: r.category,
          amount: Number(r.amount),
          date: r.expense_date ? String(r.expense_date).slice(0, 10) : null,
          description: r.description ?? null,
          createdAt: r.created_at ?? null,
        }))
      );
      setLoading(false);
    };

    load();
  }, [userId]);

  // grouped by YYYY-MM
  const grouped = useMemo(() => {
    const groups: Record<
      string,
      {
        key: string;
        label: string;
        items: OtherExpense[];
        total: number;
        year: number;
        month: number;
      }
    > = {};
    for (const oe of otherExpenses) {
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
          key,
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
    return Object.values(groups).sort(
      (a, b) => b.year - a.year || b.month - a.month
    );
  }, [otherExpenses]);

  // add / save / delete handlers (update local state so UI is immediate)
  const handleAddOtherExpense = async (
    payload:
      | OtherExpense
      | {
          id: string;
          category: string;
          amount: number;
          date?: string | null;
          description?: string | null;
        }
  ) => {
    if (!userId) return;
    setOtherExpenses((prev) => [
      ...prev,
      {
        id: (payload as any).id,
        userId,
        category: (payload as any).category,
        amount: (payload as any).amount,
        date: (payload as any).date ?? null,
        description: (payload as any).description ?? null,
        createdAt: new Date().toISOString(),
      },
    ]);
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

  if (!authChecked) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        Checking session…
      </main>
    );
  }

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
              Other expenses
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-xs text-muted-foreground">
              {userEmail ? `Signed in as ${userEmail}` : "Signed in"}
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* content */}
      <section className="mx-auto max-w-6xl px-4 py-6">
        <Card className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ReceiptIndianRupee className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-lg font-semibold">Other Expenses</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">
                Total: ₹{" "}
                {otherExpenses
                  .reduce((s, e) => s + e.amount, 0)
                  .toLocaleString("en-IN")}
              </div>
              <Button onClick={() => setIsAddOpen(true)}>Add expense</Button>
            </div>
          </div>
        </Card>

        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">
              Loading expenses…
            </div>
          ) : error ? (
            <div className="text-sm text-red-600">Error: {error}</div>
          ) : grouped.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No expenses yet. Add your first expense.
            </div>
          ) : (
            grouped.map((grp) => {
              const isOpen = !!openMonths[grp.key];
              return (
                <div
                  key={grp.key}
                  className="group rounded-lg border border-border/60 overflow-hidden"
                >
                  <div
                    role="button"
                    aria-expanded={isOpen}
                    tabIndex={0}
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
                    className="cursor-pointer px-3 py-2 flex items-center justify-between bg-card/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="font-medium text-sm">{grp.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {grp.items.length} item{grp.items.length > 1 ? "s" : ""}
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

                  {isOpen && (
                    <div className="mt-2 space-y-2 px-3 pb-3">
                      {grp.items.map((oe) => (
                        <div
                          key={oe.id}
                          className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
                        >
                          <div>
                            <div className="font-medium">{oe.category}</div>
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
                              <div>₹ {oe.amount.toLocaleString("en-IN")}</div>
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => {
                                  setEditingOther(oe);
                                  setIsEditOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>

                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-500 hover:text-red-500"
                                onClick={() => {
                                  setDeleteOther(oe);
                                  setIsDeleteOpen(true);
                                }}
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
            })
          )}
        </div>
      </section>

      {/* Dialogs */}
      <AddOtherExpenseDialog
        open={isAddOpen}
        onOpenChange={(open) => {
          setIsAddOpen(open);
        }}
        onAdd={async (payload) => {
          if (!userId) {
            console.error("No userId available - cannot add expense");
            return;
          }

          try {
            // insert into Supabase
            const { data, error } = await supabase
              .from("other_expenses")
              .insert({
                id: payload.id,
                user_id: userId,
                category: payload.category,
                amount: Number(payload.amount),
                expense_date: payload.date ?? null,
                description: payload.description ?? null,
              })
              .select()
              .single();

            if (error) {
              console.error("Failed to insert other expense:", error);
              return;
            }

            setOtherExpenses((prev) => [
              ...prev,
              {
                id: data.id,
                userId: data.user_id,
                category: data.category,
                amount: Number(data.amount),
                date: data.expense_date
                  ? String(data.expense_date).slice(0, 10)
                  : null,
                description: data.description ?? null,
                createdAt: data.created_at ?? new Date().toISOString(),
              } as OtherExpense,
            ]);
          } catch (err) {
            console.error("Error adding other expense:", err);
          }
        }}
      />

      <EditOtherExpenseDialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setEditingOther(null);
        }}
        expense={editingOther}
        onSave={async (exp) => {
          await handleSaveOther(exp);
        }}
      />

      <DeleteOtherExpenseDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) setDeleteOther(null);
        }}
        expense={deleteOther}
        onConfirmDelete={async (id) => {
          await handleConfirmDeleteOther(id);
        }}
      />
    </main>
  );
}
