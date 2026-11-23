import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import PageLayout from "../components/PageLayout";
import { API_URL } from "../lib/api";
import { getToken } from "../lib/auth";
import type { Transaction } from "../types/transaction";

type FieldErrors = {
  amount?: string;
  category?: string;
  transactionDate?: string;
};

type UpdateMethod = "PUT" | "PATCH";
type TransactionFilter = "all" | "income" | "expense";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [updateMethod, setUpdateMethod] = useState<UpdateMethod>("PATCH");
  const [transactionToDelete, setTransactionToDelete] =
    useState<Transaction | null>(null);
  const [filter, setFilter] = useState<TransactionFilter>("all");

  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function loadTransactions() {
    const response = await fetch(`${API_URL}/api/v1/transactions`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });

    if (!response.ok) {
      throw new Error("Could not load transactions.");
    }

    const data: Transaction[] = await response.json();
    setTransactions(data);
  }

  useEffect(() => {
    loadTransactions()
      .catch((err: Error) => toast.error(err.message))
      .finally(() => setLoadingList(false));
  }, []);

  const unchangedPutFields =
    editingTransaction === null
      ? []
      : [
          type !== editingTransaction.type ? null : "type",
          Number(amount) !== Number(editingTransaction.amount) ? null : "amount",
          category.trim() !== editingTransaction.category
            ? null
            : "category",
          (description.trim() || null) !==
          (editingTransaction.description || null)
            ? null
            : "description",
          transactionDate !== editingTransaction.transaction_date
            ? null
            : "date",
        ].filter((field): field is string => field !== null);

  const putNeedsChanges =
    editingTransaction !== null &&
    updateMethod === "PUT" &&
    unchangedPutFields.length > 0;

  const visibleTransactions = transactions.filter((transaction) => {
    return filter === "all" || transaction.type === filter;
  });

  const totalIncome = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + Number(transaction.amount), 0);

  const totalExpenses = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + Number(transaction.amount), 0);

  function resetForm() {
    setEditingTransaction(null);
    setUpdateMethod("PATCH");
    setType("expense");
    setAmount("");
    setCategory("");
    setDescription("");
    setTransactionDate(new Date().toISOString().slice(0, 10));
    setFieldErrors({});
  }

  function closeForm() {
    setShowForm(false);
    resetForm();
  }

  function openCreateForm() {
    resetForm();
    setShowForm(true);
  }

  function openEditForm(
    transaction: Transaction,
    method: UpdateMethod = "PATCH",
  ) {
    setEditingTransaction(transaction);
    setUpdateMethod(method);
    setType(transaction.type);
    setAmount(String(transaction.amount));
    setCategory(transaction.category);
    setDescription(transaction.description ?? "");
    setTransactionDate(transaction.transaction_date);
    setFieldErrors({});
    setShowForm(true);
  }

  function validateForm() {
    const errors: FieldErrors = {};
    const numericAmount = Number(amount);

    if (!amount || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      errors.amount = "Enter an amount greater than 0.";
    } else if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
      errors.amount = "The amount can have no more than two decimal places.";
    } else if (amount.replace(".", "").length > 12) {
      errors.amount = "The amount is too large.";
    }

    if (!category.trim()) {
      errors.category =
        "Enter a category, such as “Food” or “Salary”.";
    } else if (category.trim().length > 50) {
      errors.category = "The category can be up to 50 characters long.";
    }

    if (!transactionDate) {
      errors.transactionDate = "Select the transaction date.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function getErrorMessage(response: Response) {
    try {
      const data = await response.json();

      if (Array.isArray(data.detail)) {
        return data.detail
          .map((item: { msg?: string }) => item.msg)
          .filter(Boolean)
          .join(" ");
      }

      if (typeof data.detail === "string") {
        return data.detail;
      }
    } catch {
      // Some responses, such as DELETE 204, do not have a JSON body.
    }

    return "Check the information and try again.";
  }

  async function saveTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateForm()) {
      toast.error("Please check the highlighted fields.");
      return;
    }

    if (putNeedsChanges) {
      toast.error(
        `For PUT, you need to change every field: ${unchangedPutFields.join(", ")}.`,
      );
      return;
    }

    setSaving(true);

    try {
      const body = {
        type,
        amount: Number(amount),
        category: category.trim(),
        description: description.trim() || null,
        transaction_date: transactionDate,
      };

      const isEditing = editingTransaction !== null;
      const url = isEditing
        ? `${API_URL}/api/v1/transactions/${editingTransaction.id}`
        : `${API_URL}/api/v1/transactions`;

      const response = await fetch(url, {
        method: isEditing ? updateMethod : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      await loadTransactions();
      closeForm();

      toast.success(
        !isEditing
          ? "Transaction added."
          : updateMethod === "PUT"
            ? "Transaction replaced."
            : "Transaction updated.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!transactionToDelete) return;

    setDeleting(true);

    try {
      const response = await fetch(
        `${API_URL}/api/v1/transactions/${transactionToDelete.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${getToken()}` },
        },
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      setTransactions((current) =>
        current.filter((item) => item.id !== transactionToDelete.id),
      );

      if (editingTransaction?.id === transactionToDelete.id) {
        closeForm();
      }

      setTransactionToDelete(null);
      toast.success("Transaction deleted.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not delete the transaction.",
      );
    } finally {
      setDeleting(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-background px-4 py-3 text-text outline-none transition duration-200 placeholder:text-muted/70 hover:border-accent/60 focus:border-accent focus:ring-2 focus:ring-accent/20";

  return (
    <PageLayout>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
            Financial Activity
          </p>
          <h1 className="mt-2 text-3xl font-bold text-text">Transactions</h1>
          <p className="mt-2 text-muted">
            Manage your income and expenses.
          </p>
        </div>

        {!showForm && (
          <button
            type="button"
            onClick={openCreateForm}
            className="cursor-pointer rounded-xl bg-accent px-5 py-3 font-semibold text-background transition duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-lg hover:shadow-accent/20 active:scale-[0.98]"
          >
            + Add transaction
          </button>
        )}
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <OverviewCard
          label="Transactions"
          value={String(transactions.length)}
          accent="text-text"
        />
        <OverviewCard
          label="Income"
          value={formatAmount(totalIncome)}
          accent="text-accent"
        />
        <OverviewCard
          label="Expenses"
          value={formatAmount(totalExpenses)}
          accent="text-primary"
        />
      </section>

      {showForm && (
        <form
          noValidate
          onSubmit={saveTransaction}
          className="mt-8 grid gap-5 rounded-2xl border border-border/60 bg-surface p-6 shadow-xl shadow-black/10 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <p className="text-sm font-semibold uppercase tracking-wider text-accent">
              {editingTransaction ? "Editing" : "Adding"}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-text">
              {editingTransaction ? "Edit transaction" : "New transaction"}
            </h2>
          </div>

          {editingTransaction && (
            <div className="sm:col-span-2">
              <span className="mb-2 block text-sm text-text">
                Update method
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-pressed={updateMethod === "PATCH"}
                  onClick={() => setUpdateMethod("PATCH")}
                  className={`cursor-pointer rounded-lg border px-4 py-2 text-sm transition ${
                    updateMethod === "PATCH"
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border text-muted hover:border-accent/60 hover:text-text"
                  }`}
                >
                  PATCH · partial update
                </button>
                <button
                  type="button"
                  aria-pressed={updateMethod === "PUT"}
                  onClick={() => setUpdateMethod("PUT")}
                  className={`cursor-pointer rounded-lg border px-4 py-2 text-sm transition ${
                    updateMethod === "PUT"
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted hover:border-primary/60 hover:text-text"
                  }`}
                >
                  PUT · full replacement
                </button>
              </div>

              {updateMethod === "PUT" && putNeedsChanges && (
                <p className="mt-2 text-xs text-muted">
                  For PUT, all fields must be changed. Fields still to change:{" "}
                  <span className="font-medium text-primary">
                    {unchangedPutFields.join(", ")}
                  </span>
                  .
                </p>
              )}
            </div>
          )}

          <div>
            <span className="mb-2 block text-sm text-text">
              Transaction type{" "}
              <span className="text-danger" aria-hidden="true">
                *
              </span>
            </span>
            <div className="grid grid-cols-2 rounded-xl border border-border bg-background p-1">
              <button
                type="button"
                aria-pressed={type === "expense"}
                onClick={() => setType("expense")}
                className={`cursor-pointer rounded-lg px-4 py-3 text-sm font-medium transition ${
                  type === "expense"
                    ? "bg-primary text-background shadow-md shadow-primary/20"
                    : "text-muted hover:bg-primary/10 hover:text-text"
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                aria-pressed={type === "income"}
                onClick={() => setType("income")}
                className={`cursor-pointer rounded-lg px-4 py-3 text-sm font-medium transition ${
                  type === "income"
                    ? "bg-accent text-background shadow-md shadow-accent/20"
                    : "text-muted hover:bg-accent/10 hover:text-text"
                }`}
              >
                Income
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-text" htmlFor="amount">
              Amount{" "}
              <span className="text-danger" aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="amount"
              className={inputClass}
              type="number"
              min="0.01"
              step="0.01"
              placeholder="e.g., 125.50"
              value={amount}
              aria-invalid={Boolean(fieldErrors.amount)}
              onChange={(event) => {
                setAmount(event.target.value);
                setFieldErrors((current) => ({
                  ...current,
                  amount: undefined,
                }));
              }}
            />
            {fieldErrors.amount && (
              <p className="mt-1 text-sm text-danger">{fieldErrors.amount}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm text-text" htmlFor="category">
              Category{" "}
              <span className="text-danger" aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="category"
              className={inputClass}
              placeholder="e.g., Food, Salary, Transport"
              maxLength={50}
              value={category}
              aria-invalid={Boolean(fieldErrors.category)}
              onChange={(event) => {
                setCategory(event.target.value);
                setFieldErrors((current) => ({
                  ...current,
                  category: undefined,
                }));
              }}
            />
            {fieldErrors.category && (
              <p className="mt-1 text-sm text-danger">{fieldErrors.category}</p>
            )}
          </div>

          <div>
            <label
              className="mb-2 block text-sm text-text"
              htmlFor="transaction-date"
            >
              Transaction date{" "}
              <span className="text-danger" aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="transaction-date"
              className={inputClass}
              type="date"
              value={transactionDate}
              onChange={(event) => {
                setTransactionDate(event.target.value);
                setFieldErrors((current) => ({
                  ...current,
                  transactionDate: undefined,
                }));
              }}
            />
            {fieldErrors.transactionDate && (
              <p className="mt-1 text-sm text-danger">
                {fieldErrors.transactionDate}
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label
              className="mb-2 block text-sm text-text"
              htmlFor="description"
            >
              Description{" "}
              <span className="text-xs font-normal text-muted">(optional)</span>
            </label>
            <input
              id="description"
              className={inputClass}
              placeholder="e.g., Weekly groceries"
              maxLength={500}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              className="cursor-pointer rounded-xl border border-border px-5 py-3 font-medium text-muted transition hover:border-accent hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>

            <div
              title={
                putNeedsChanges
                  ? `Fields still to change: ${unchangedPutFields.join(", ")}`
                  : undefined
              }
            >
              <button
                type="submit"
                disabled={saving || putNeedsChanges}
                className="cursor-pointer rounded-xl bg-primary px-5 py-3 font-semibold text-background transition duration-200 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                {saving
                  ? "Saving..."
                  : editingTransaction
                    ? `Save with ${updateMethod}`
                    : "Add transaction"}
              </button>
            </div>
          </div>
        </form>
      )}

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-text">History</h2>
            <p className="mt-1 text-sm text-muted">
              {visibleTransactions.length} transactions shown
            </p>
          </div>

          <div className="flex rounded-xl border border-border bg-surface p-1">
            {(
              [
                ["all", "All"],
                ["income", "Income"],
                ["expense", "Expenses"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={`cursor-pointer rounded-lg px-3 py-2 text-sm transition ${
                  filter === value
                    ? "bg-accent text-background"
                    : "text-muted hover:text-text"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {loadingList && <p className="text-muted">Loading transactions…</p>}

          {!loadingList && visibleTransactions.length === 0 && (
            <p className="rounded-2xl border border-border/50 bg-surface p-6 text-muted">
              {transactions.length === 0
                ? "There are no transactions in this account."
                : "No transactions match the selected filter."}
            </p>
          )}

          {visibleTransactions.map((transaction) => (
            <article
              key={transaction.id}
              className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-surface p-5 transition duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-4">
                <span
                  aria-hidden="true"
                  className={`mt-1 flex size-10 shrink-0 items-center justify-center rounded-xl text-xl font-bold leading-none ${
                    transaction.type === "income"
                      ? "bg-accent/15 text-accent"
                      : "bg-primary/15 text-primary"
                  }`}
                >
                  {transaction.type === "income" ? "+" : "−"}
                </span>

                <div className="min-w-0">
                  <p className="truncate font-semibold text-text">
                    {transaction.description || transaction.category}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {transaction.category} · {transaction.transaction_date}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <p
                  className={`mr-2 font-bold ${
                    transaction.type === "income"
                      ? "text-accent"
                      : "text-primary"
                  }`}
                >
                  {transaction.type === "income" ? "+" : "−"}
                  {formatAmount(Number(transaction.amount))}
                </p>

                <button
                  type="button"
                  onClick={() => openEditForm(transaction, "PATCH")}
                  className="cursor-pointer rounded-lg border border-border px-3 py-2 text-sm text-muted transition hover:border-accent hover:text-accent"
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => setTransactionToDelete(transaction)}
                  className="cursor-pointer rounded-lg border border-danger/40 px-3 py-2 text-sm text-danger transition hover:bg-danger/10"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {transactionToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) {
              setTransactionToDelete(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl"
          >
            <p className="text-sm font-semibold uppercase tracking-wider text-danger">
              Confirmation
            </p>
            <h2 id="delete-title" className="mt-2 text-xl font-bold text-text">
              Delete this transaction?
            </h2>
            <p className="mt-2 text-sm text-muted">
              “
              {transactionToDelete.description ||
                transactionToDelete.category}
              ” will be permanently deleted.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setTransactionToDelete(null)}
                className="cursor-pointer rounded-xl border border-border px-4 py-2 text-sm text-muted transition hover:border-accent hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="cursor-pointer rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-background transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Yes, delete"}
              </button>
            </div>
          </section>
        </div>
      )}
    </PageLayout>
  );
}

function OverviewCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <article className="rounded-2xl border border-border/50 bg-surface p-5 transition duration-200 hover:-translate-y-0.5 hover:border-accent/40">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-2 text-xl font-bold ${accent}`}>{value}</p>
    </article>
  );
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}