"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  X,
  Users,
  ReceiptIndianRupee,
  TrendingDown,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import type { Employee, SalaryRecord, OtherExpense, IncomingPayment } from "@/lib/types";

// ─── types ───────────────────────────────────────────────────────────────────

type ResultKind = "employee" | "salary" | "expense" | "incoming";

interface SearchResult {
  kind: ResultKind;
  id: string;
  primary: string;       // bold line
  secondary: string;     // dim line
  amount?: number;
  href?: string;         // for employees → /employees/:id
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}

function monthLabel(month: number, year: number) {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function kindMeta(kind: ResultKind) {
  switch (kind) {
    case "employee": return { label: "Employee",        Icon: Users,               color: "text-blue-500"   };
    case "salary":   return { label: "Salary Record",   Icon: ReceiptIndianRupee,  color: "text-violet-500" };
    case "expense":  return { label: "Other Expense",   Icon: TrendingDown,        color: "text-red-400"    };
    case "incoming": return { label: "Incoming Payment",Icon: TrendingUp,          color: "text-green-500"  };
  }
}

// ─── component ───────────────────────────────────────────────────────────────

interface GlobalSearchProps {
  employees: Employee[];
  records: SalaryRecord[];
  otherExpenses: OtherExpense[];
  incomingPayments: IncomingPayment[];
  /** called when user picks a salary record — scroll / highlight it */
  onSelectSalary?: (record: SalaryRecord) => void;
  /** called when user picks an expense */
  onSelectExpense?: (expense: OtherExpense) => void;
  /** called when user picks an incoming payment */
  onSelectIncoming?: (payment: IncomingPayment) => void;
}

export function GlobalSearch({
  employees,
  records,
  otherExpenses,
  incomingPayments,
  onSelectSalary,
  onSelectExpense,
  onSelectIncoming,
}: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build flat searchable list
  const allResults = useMemo<SearchResult[]>(() => {
    const out: SearchResult[] = [];

    for (const emp of employees) {
      out.push({
        kind: "employee",
        id: emp.id,
        primary: emp.name,
        secondary: emp.role ? `${emp.role}${emp.baseSalary ? ` · ₹ ${emp.baseSalary.toLocaleString("en-IN")}` : ""}` : emp.baseSalary ? `₹ ${emp.baseSalary.toLocaleString("en-IN")}` : "Employee",
        href: `/employees/${emp.id}`,
      });
    }

    for (const rec of records) {
      const empName = employees.find(e => e.id === rec.employeeId)?.name ?? "Unknown";
      out.push({
        kind: "salary",
        id: rec.id,
        primary: `${empName} — ${monthLabel(rec.month, rec.year)}`,
        secondary: `Salary ₹ ${(rec.baseSalary ?? 0).toLocaleString("en-IN")} · Expenses ₹ ${rec.totalExpenses.toLocaleString("en-IN")}${rec.date ? ` · ${fmtDate(rec.date)}` : ""}`,
        amount: rec.grandTotal,
      });
    }

    for (const oe of otherExpenses) {
      out.push({
        kind: "expense",
        id: oe.id,
        primary: oe.category,
        secondary: `${oe.description ?? ""}${oe.description && oe.date ? " · " : ""}${oe.date ? fmtDate(oe.date) : ""}`.trim() || "Other expense",
        amount: oe.amount,
      });
    }

    for (const ip of incomingPayments) {
      out.push({
        kind: "incoming",
        id: ip.id,
        primary: ip.category,
        secondary: `${ip.description ?? ""}${ip.description && ip.date ? " · " : ""}${ip.date ? fmtDate(ip.date) : ""}`.trim() || "Incoming payment",
        amount: ip.amount,
      });
    }

    return out;
  }, [employees, records, otherExpenses, incomingPayments]);

  // Filter
  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allResults
      .filter(r =>
        r.primary.toLowerCase().includes(q) ||
        r.secondary.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [query, allResults]);

  // Group by kind for display
  const grouped = useMemo(() => {
    const map: Partial<Record<ResultKind, SearchResult[]>> = {};
    for (const r of results) {
      if (!map[r.kind]) map[r.kind] = [];
      map[r.kind]!.push(r);
    }
    return map;
  }, [results]);

  const kindOrder: ResultKind[] = ["employee","salary","expense","incoming"];

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
    } else if (e.key === "Enter" && activeIdx >= 0) {
      handleSelect(results[activeIdx]);
    }
  }, [open, results, activeIdx]);

  const handleSelect = useCallback((r: SearchResult) => {
    setOpen(false);
    setQuery("");
    if (r.kind === "salary") {
      const rec = records.find(x => x.id === r.id);
      if (rec) onSelectSalary?.(rec);
    } else if (r.kind === "expense") {
      const exp = otherExpenses.find(x => x.id === r.id);
      if (exp) onSelectExpense?.(exp);
    } else if (r.kind === "incoming") {
      const ip = incomingPayments.find(x => x.id === r.id);
      if (ip) onSelectIncoming?.(ip);
    }
    // employees use href link — handled by Next Link
  }, [records, otherExpenses, incomingPayments, onSelectSalary, onSelectExpense, onSelectIncoming]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Reset active on results change
  useEffect(() => { setActiveIdx(-1); }, [results]);

  // Global shortcut: Cmd/Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Flat index across all grouped results (for keyboard highlight)
  let flatIdx = 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-xs md:max-w-sm">
      {/* Input */}
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Search… ⌘K"
          className="h-9 w-full rounded-lg border border-border/60 bg-background pl-9 pr-8 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow"
          onFocus={() => setOpen(true)}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onKeyDown={handleKeyDown}
          aria-label="Global search"
          aria-autocomplete="list"
          aria-expanded={open && results.length > 0}
        />
        {query && (
          <button
            className="absolute right-2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => { setQuery(""); inputRef.current?.focus(); }}
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && query.trim() && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[320px] rounded-xl border border-border/70 bg-popover shadow-xl ring-1 ring-black/5 overflow-hidden animate-in fade-in-0 slide-in-from-top-1 duration-100">
          {results.length === 0 ? (
            <div className="px-4 py-5 text-center text-sm text-muted-foreground">
              No results for <span className="font-medium text-foreground">"{query}"</span>
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto divide-y divide-border/40">
              {kindOrder.map(kind => {
                const items = grouped[kind];
                if (!items?.length) return null;
                const { label, Icon, color } = kindMeta(kind);

                return (
                  <div key={kind}>
                    {/* Section header */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/30">
                      <Icon className={`h-3 w-3 ${color}`} />
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {label}
                      </span>
                    </div>

                    {/* Items */}
                    {items.map(r => {
                      const myIdx = flatIdx++;
                      const isActive = myIdx === activeIdx;

                      const inner = (
                        <div
                          key={r.id}
                          className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 transition-colors ${
                            isActive ? "bg-accent" : "hover:bg-accent/60"
                          }`}
                          onMouseEnter={() => setActiveIdx(myIdx)}
                          onClick={() => {
                            if (r.href) return; // Link handles it
                            handleSelect(r);
                          }}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium leading-snug">
                              {highlightMatch(r.primary, query)}
                            </div>
                            <div className="truncate text-[11px] text-muted-foreground mt-0.5">
                              {highlightMatch(r.secondary, query)}
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            {r.amount !== undefined && (
                              <span className={`text-xs font-semibold tabular-nums ${color}`}>
                                ₹ {r.amount.toLocaleString("en-IN")}
                              </span>
                            )}
                            {r.href && (
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      );

                      return r.href ? (
                        <Link key={r.id} href={r.href} onClick={() => { setOpen(false); setQuery(""); }}>
                          {inner}
                        </Link>
                      ) : (
                        <div key={r.id}>{inner}</div>
                      );
                    })}
                  </div>
                );
              })}

              {/* Footer hint */}
              <div className="flex items-center justify-between px-3 py-2 bg-muted/20">
                <span className="text-[10px] text-muted-foreground">{results.length} result{results.length !== 1 ? "s" : ""}</span>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <kbd className="rounded border border-border/60 px-1 py-0.5 font-mono text-[9px]">↑↓</kbd> navigate
                  <kbd className="rounded border border-border/60 px-1 py-0.5 font-mono text-[9px]">↵</kbd> select
                  <kbd className="rounded border border-border/60 px-1 py-0.5 font-mono text-[9px]">Esc</kbd> close
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── highlight util ───────────────────────────────────────────────────────────

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return <>{text}</>;
  const q = query.trim().toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200/70 dark:bg-yellow-500/30 text-inherit rounded-[2px] px-[1px]">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}
