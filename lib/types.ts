export type Employee = {
  id: string;
  name: string;
  role?: string;
  baseSalary?: number | null;
};

export type SalaryExpense = {
  id: string;
  category: string;
  amount: number;
  date: string; // ISO string like "2025-12-04"
};

export type SalaryRecord = {
  id: string;
  employeeId: string;
  year: number;
  month: number; // 1-12
  baseSalary: number | null;
  expenses: SalaryExpense[];
  totalExpenses: number;
  grandTotal: number; // salary + totalExpenses
};
