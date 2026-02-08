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
import type { IncomingPayment } from "@/lib/types";

import { AddIncomingPaymentDialog } from "@/components/incoming/add-incoming-payment-dialog";
import { EditIncomingPaymentDialog } from "@/components/incoming/edit-incoming-payment-dialog";
import { DeleteIncomingPaymentDialog } from "@/components/incoming/delete-incoming-payment-dialog";

const PAD2 = (n: number) => String(n).padStart(2, "0");

function formatDateDDMMYYYY(isoDate?: string | null) {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  const dd = PAD2(d.getDate());
  const mm = PAD2(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function IncomingPaymentsPageClient() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [incomingPayments, setIncomingPayments] = useState<IncomingPayment[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // dialogs + editing state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingIncoming, setEditingIncoming] =
    useState<IncomingPayment | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [deleteIncoming, setDeleteIncoming] = useState<IncomingPayment | null>(
    null,
  );
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

  // load incoming payments
  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("incoming_payments")
        .select("*")
        .eq("user_id", userId)
        .order("payment_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setIncomingPayments(
        (data ?? []).map((r: any) => ({
          id: r.id,
          userId: r.user_id,
          category: r.category,
          amount: Number(r.amount),
          date: r.payment_date ? String(r.payment_date).slice(0, 10) : null,
          description: r.description ?? null,
          createdAt: r.created_at ?? null,
        })),
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
        items: IncomingPayment[];
        total: number;
        year: number;
        month: number;
      }
    > = {};

    for (const ip of incomingPayments) {
      const dateStr = ip.date ?? ip.createdAt ?? null;
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

      groups[key].items.push(ip);
      groups[key].total += ip.amount;
    }

    return Object.values(groups).sort(
      (a, b) => b.year - a.year || b.month - a.month,
    );
  }, [incomingPayments]);

  const handleSaveIncoming = async (updated: IncomingPayment) => {
    if (!userId) return;

    const { error } = await supabase
      .from("incoming_payments")
      .update({
        category: updated.category,
        amount: updated.amount,
        payment_date: updated.date ?? null,
        description: updated.description ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", updated.id)
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating incoming payment:", error.message);
      return;
    }

    setIncomingPayments((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p)),
    );
  };

  const handleConfirmDeleteIncoming = async (id: string) => {
    if (!userId) return;

    const { error } = await supabase
      .from("incoming_payments")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting incoming payment:", error.message);
      return;
    }

    setIncomingPayments((prev) => prev.filter((p) => p.id !== id));
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
              Incoming payments
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
                <div className="text-lg font-semibold">Incoming Payments</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">
                Total: ₹{" "}
                {incomingPayments
                  .reduce((s, e) => s + e.amount, 0)
                  .toLocaleString("en-IN")}
              </div>

              <Button onClick={() => setIsAddOpen(true)}>Add payment</Button>
            </div>
          </div>
        </Card>

        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">
              Loading payments…
            </div>
          ) : error ? (
            <div className="text-sm text-red-600">Error: {error}</div>
          ) : grouped.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No payments yet. Add your first payment.
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
                      {grp.items.map((ip) => (
                        <div
                          key={ip.id}
                          className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
                        >
                          <div>
                            <div className="font-medium">{ip.category}</div>

                            {ip.description && (
                              <div className="text-xs text-muted-foreground">
                                {ip.description}
                              </div>
                            )}

                            <div className="text-[11px] text-muted-foreground mt-1">
                              {ip.date
                                ? formatDateDDMMYYYY(ip.date)
                                : ip.createdAt
                                  ? formatDateDDMMYYYY(ip.createdAt)
                                  : ""}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-xs text-muted-foreground text-right">
                              <div>₹ {ip.amount.toLocaleString("en-IN")}</div>
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => {
                                  setEditingIncoming(ip);
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
                                  setDeleteIncoming(ip);
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
      <AddIncomingPaymentDialog
        open={isAddOpen}
        onOpenChange={(open) => {
          setIsAddOpen(open);
        }}
        onAdd={async (payload) => {
          if (!userId) {
            console.error("No userId available - cannot add payment");
            return;
          }

          try {
            const { data, error } = await supabase
              .from("incoming_payments")
              .insert({
                id: payload.id,
                user_id: userId,
                category: payload.category,
                amount: Number(payload.amount),
                payment_date: payload.date ?? null,
                description: payload.description ?? null,
              })
              .select()
              .single();

            if (error) {
              console.error("Failed to insert incoming payment:", error);
              return;
            }

            setIncomingPayments((prev) => [
              ...prev,
              {
                id: data.id,
                userId: data.user_id,
                category: data.category,
                amount: Number(data.amount),
                date: data.payment_date
                  ? String(data.payment_date).slice(0, 10)
                  : null,
                description: data.description ?? null,
                createdAt: data.created_at ?? new Date().toISOString(),
              } as IncomingPayment,
            ]);
          } catch (err) {
            console.error("Error adding incoming payment:", err);
          }
        }}
      />

      <EditIncomingPaymentDialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setEditingIncoming(null);
        }}
        payment={editingIncoming}
        onSave={async (pay) => {
          await handleSaveIncoming(pay);
        }}
      />

      <DeleteIncomingPaymentDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) setDeleteIncoming(null);
        }}
        payment={deleteIncoming}
        onConfirmDelete={async (id) => {
          await handleConfirmDeleteIncoming(id);
        }}
      />
    </main>
  );
}
