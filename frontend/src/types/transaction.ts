export type Transaction = {
  id: number;
  type: "income" | "expense";
  amount: string;
  category: string;
  description: string | null;
  transaction_date: string;
};

export type TransactionPage = {
  items: Transaction[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type Summary = {
  total_income: string;
  total_expenses: string;
  balance: string;
};
