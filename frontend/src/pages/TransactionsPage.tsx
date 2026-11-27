import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";

import PageLayout from "../components/PageLayout";
import DatePicker from "../components/DatePicker";
import { API_URL } from "../lib/api";
import { getToken } from "../lib/auth";
import {
  CATEGORY_GROUPS,
  formatCategory,
  getCategoryGroup,
  getCategorySelection,
  makeCategoryValue,
  type TransactionType,
} from "../lib/categories";
import type { Summary, Transaction, TransactionPage } from "../types/transaction";

type FieldErrors = {
  amount?: string;
  category?: string;
  description?: string;
  transactionDate?: string;
};

type UpdateMethod = "PUT" | "PATCH";
type TransactionFilter = "all" | "income" | "expense";
const PAGE_SIZE = 10;

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
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
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("search")?.trim() ?? "";

  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [categoryGroup, setCategoryGroup] = useState("");
  const [categoryDetail, setCategoryDetail] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const loadTransactions = useCallback(async (
    pageToLoad = page,
    filterToLoad = filter,
  ): Promise<TransactionPage> => {
    const params = new URLSearchParams({
      page: String(pageToLoad),
      page_size: String(PAGE_SIZE),
    });
    if (filterToLoad !== "all") params.set("type", filterToLoad);
    if (searchQuery) params.set("search", searchQuery);

    const response = await fetch(
      `${API_URL}/api/v1/transactions/history?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${getToken()}` },
      },
    );

    if (!response.ok) {
      throw new Error(await getErrorMessage(response));
    }

    const data: TransactionPage = await response.json();
    setTransactions(data.items);
    setTotalTransactions(data.total);
    setTotalPages(data.total_pages);
    return data;
  }, [page, filter, searchQuery]);

  const loadSummary = useCallback(async () => {
    const response = await fetch(`${API_URL}/api/v1/dashboard/summary`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) throw new Error(await getErrorMessage(response));
    setSummary((await response.json()) as Summary);
  }, []);

  useEffect(() => {
    setLoadingList(true);
    loadTransactions()
      .catch((err: Error) => toast.error(err.message))
      .finally(() => setLoadingList(false));
  }, [loadTransactions]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  useEffect(() => {
    loadSummary().catch((err: Error) => toast.error(err.message));
  }, [loadSummary]);

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

  function resetForm() {
    setEditingTransaction(null);
    setUpdateMethod("PATCH");
    setType("expense");
    setAmount("");
    setCategory("");
    setCategoryGroup("");
    setCategoryDetail("");
    setCustomCategory("");
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

  function chooseType(nextType: TransactionType) {
    if (nextType !== type) {
      setCategory("");
      setCategoryGroup("");
      setCategoryDetail("");
      setCustomCategory("");
    }
    setType(nextType);
    setFieldErrors((current) => ({ ...current, category: undefined }));
  }

  function openEditForm(
    transaction: Transaction,
    method: UpdateMethod = "PATCH",
  ) {
    const selection = getCategorySelection(transaction.type, transaction.category);
    setEditingTransaction(transaction);
    setUpdateMethod(method);
    setType(transaction.type);
    setAmount(String(transaction.amount));
    setCategory(transaction.category);
    setCategoryGroup(selection.group);
    setCategoryDetail(selection.detail);
    setCustomCategory(selection.custom);
    setDescription(transaction.description ?? "");
    setTransactionDate(transaction.transaction_date);
    setFieldErrors({});
    setShowForm(true);
  }

  function validateForm() {
    const errors: FieldErrors = {};
    const numericAmount = Number(amount);
    const amountIntegerDigits = amount.split(".")[0]?.replace(/^0+/, "") ?? "";

    if (!amount || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      errors.amount = "Enter an amount greater than 0.";
    } else if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
      errors.amount = "The amount can have no more than two decimal places.";
    } else if (amountIntegerDigits.length > 10) {
      errors.amount = "The amount cannot be greater than 9,999,999,999.99.";
    }

    if (!categoryGroup) {
      errors.category = "Choose a category group.";
    } else if (categoryGroup === "other" && !customCategory.trim()) {
      errors.category = "Enter a name for your custom category.";
    } else if (categoryGroup !== "other" && !categoryDetail) {
      errors.category = "Choose a subcategory.";
    } else if (category.trim().length > 50) {
      errors.category = "The category can be up to 50 characters long.";
    }

    if (!transactionDate) {
      errors.transactionDate = "Select the transaction date.";
    }

    if (description.trim().length > 500) {
      errors.description = "The description can be up to 500 characters long.";
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

      const updatedHistory = await loadTransactions(page, filter);
      if (!isEditing && updatedHistory.total_pages > page) {
        setPage(updatedHistory.total_pages);
      }
      await loadSummary();
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

      const updatedHistory = await loadTransactions(page, filter);
      if (page > Math.max(1, updatedHistory.total_pages)) {
        setPage(Math.max(1, updatedHistory.total_pages));
      }
      await loadSummary();

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
    "w-full rounded-xl border border-border bg-surface px-4 py-3 text-text shadow-sm outline-none transition duration-200 placeholder:text-muted/70 hover:border-accent/60 focus:border-accent focus:ring-4 focus:ring-accent/10";

  return (
    <PageLayout>
        <div className="flex flex-wrap items-end justify-between gap-5 rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            Account activity
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-text sm:text-4xl">
            Transactions
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Manage your income and expenses.
          </p>
        </div>

        {!showForm && (
          <button
            type="button"
            onClick={openCreateForm}
            className="cursor-pointer rounded-xl bg-accent px-5 py-3 font-semibold text-background shadow-lg shadow-accent/15 transition duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-accent/25 active:scale-[0.98]"
          >
            + Add transaction
          </button>
        )}
      </div>

        <section className="mt-5 grid gap-3 sm:grid-cols-3">
        <OverviewCard
          label="Transactions"
          value={String(totalTransactions)}
          accent="text-text"
        />
        <OverviewCard
          label="Income"
          value={summary ? formatAmount(Number(summary.total_income)) : "—"}
          accent="text-accent"
        />
        <OverviewCard
          label="Expenses"
          value={summary ? formatAmount(Number(summary.total_expenses)) : "—"}
          accent="text-primary"
        />
      </section>

      {showForm && (
        <div
          role={editingTransaction ? "dialog" : undefined}
          aria-modal={editingTransaction ? true : undefined}
          aria-label={editingTransaction ? "Edit transaction" : undefined}
          className={editingTransaction ? "fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-6" : "mt-6"}
        >
          {editingTransaction && <button type="button" aria-label="Close edit transaction" onClick={closeForm} disabled={saving} className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm disabled:cursor-wait" />}
          <form
            noValidate
            onSubmit={saveTransaction}
            className={`relative z-10 grid gap-5 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:grid-cols-2 sm:p-7 ${editingTransaction ? "themed-scrollbar max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl overflow-y-auto overscroll-contain shadow-2xl" : ""}`}
          >
          <div className="flex items-start justify-between gap-3 sm:col-span-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                {editingTransaction ? "Editing" : "Adding"}
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-text">
                {editingTransaction ? "Edit transaction" : "New transaction"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                Add the details below and keep your history up to date.
              </p>
            </div>
            {editingTransaction && <button type="button" aria-label="Close edit form" onClick={closeForm} disabled={saving} className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border text-muted transition hover:border-accent/60 hover:bg-accent/10 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50">×</button>}
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
            <div className="grid grid-cols-2 rounded-2xl border border-border/70 bg-background p-1.5">
              <button
                type="button"
                aria-pressed={type === "expense"}
                onClick={() => chooseType("expense")}
                  className={`cursor-pointer rounded-xl px-4 py-3 text-sm font-semibold transition ${
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
                onClick={() => chooseType("income")}
                  className={`cursor-pointer rounded-xl px-4 py-3 text-sm font-semibold transition ${
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
              required
              min="0.01"
              max="9999999999.99"
              step="0.01"
              placeholder="e.g., 125.50"
              value={amount}
              aria-invalid={Boolean(fieldErrors.amount)}
              aria-describedby={fieldErrors.amount ? "amount-error" : undefined}
              onChange={(event) => {
                setAmount(event.target.value);
                setFieldErrors((current) => ({
                  ...current,
                  amount: undefined,
                }));
              }}
            />
            {fieldErrors.amount && (
              <p id="amount-error" className="mt-1 text-sm text-danger">
                {fieldErrors.amount}
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <div className="mb-3">
              <label className="block text-sm font-medium text-text" htmlFor="category-group">
                Category <span className="text-danger" aria-hidden="true">*</span>
              </label>
              <p className="mt-1 text-xs text-muted">
                Choose a group, then narrow it down with a subcategory.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="relative">
                <StyledSelect
                  id="category-group"
                  value={categoryGroup}
                  placeholder="Select a category"
                  ariaLabel="Category group"
                  invalid={Boolean(fieldErrors.category && !categoryGroup)}
                  options={CATEGORY_GROUPS[type].map((group) => ({
                    value: group.value,
                    label: group.label,
                  }))}
                  onChange={(nextGroup) => {
                    setCategoryGroup(nextGroup);
                    setCategoryDetail("");
                    setCustomCategory("");
                    setCategory("");
                    setFieldErrors((current) => ({ ...current, category: undefined }));
                  }}
                />
              </div>

              {categoryGroup === "other" ? (
                <input
                  id="category"
                  className={inputClass}
                  placeholder="Name your category"
                  required
                  maxLength={50}
                  value={customCategory}
                  aria-label="Custom category name"
                  aria-invalid={Boolean(fieldErrors.category)}
                  aria-describedby={fieldErrors.category ? "category-error" : undefined}
                  onChange={(event) => {
                    setCustomCategory(event.target.value);
                    setCategory(event.target.value);
                    setFieldErrors((current) => ({ ...current, category: undefined }));
                  }}
                />
              ) : (
                <div className="relative">
                  <StyledSelect
                    id="category"
                    disabled={!categoryGroup}
                    value={categoryDetail}
                    placeholder={categoryGroup ? "Choose a subcategory" : "Choose a category first"}
                    ariaLabel="Transaction subcategory"
                    invalid={Boolean(fieldErrors.category && categoryGroup)}
                    options={CATEGORY_GROUPS[type]
                      .find((group) => group.value === categoryGroup)
                      ?.children.map((detail) => ({
                        value: detail.value,
                        label: detail.label,
                      })) ?? []}
                    onChange={(nextDetail) => {
                      setCategoryDetail(nextDetail);
                      setCategory(
                        makeCategoryValue(type, categoryGroup, nextDetail, ""),
                      );
                      setFieldErrors((current) => ({ ...current, category: undefined }));
                    }}
                  />
                </div>
              )}
            </div>
            {fieldErrors.category && (
              <p id="category-error" className="mt-2 text-sm text-danger">
                {fieldErrors.category}
              </p>
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
            <DatePicker
              id="transaction-date"
              value={transactionDate}
              invalid={Boolean(fieldErrors.transactionDate)}
              describedBy={
                fieldErrors.transactionDate ? "transaction-date-error" : undefined
              }
              onChange={(nextDate) => {
                setTransactionDate(nextDate);
                setFieldErrors((current) => ({
                  ...current,
                  transactionDate: undefined,
                }));
              }}
            />
            {fieldErrors.transactionDate && (
              <p id="transaction-date-error" className="mt-1 text-sm text-danger">
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
              aria-invalid={Boolean(fieldErrors.description)}
              aria-describedby={
                fieldErrors.description ? "description-error" : "description-help"
              }
              onChange={(event) => {
                setDescription(event.target.value);
                setFieldErrors((current) => ({
                  ...current,
                  description: undefined,
                }));
              }}
            />
            <p
              id={fieldErrors.description ? "description-error" : "description-help"}
              className={`mt-1 text-sm ${fieldErrors.description ? "text-danger" : "text-muted"}`}
            >
              {fieldErrors.description ?? `${description.length}/500 characters`}
            </p>
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
        </div>
      )}

      <section className="mt-9 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-text">History</h2>
            <p className="mt-1 text-sm text-muted">
              {totalTransactions === 0
                ? "0 transactions"
                : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, totalTransactions)} of ${totalTransactions} transactions`}
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
                onClick={() => {
                  setPage(1);
                  setFilter(value);
                }}
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

          {!loadingList && transactions.length === 0 && (
            <p className="rounded-2xl border border-border/50 bg-surface p-6 text-muted">
              {filter === "all"
                ? "There are no transactions in this account."
                : "No transactions match the selected filter."}
            </p>
          )}

          {transactions.map((transaction) => (
            <article
              key={transaction.id}
              className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 transition duration-200 hover:border-accent/40 hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-5"
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
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className="rounded-full border px-2.5 py-1 font-medium"
                      style={getCategoryChipStyle(transaction.category)}
                    >
                      {formatCategory(transaction.category)}
                    </span>
                    <span className="text-muted/80">
                      {formatDate(transaction.transaction_date)}
                    </span>
                  </div>
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

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            Page {totalPages === 0 ? 0 : page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={loadingList || page <= 1}
              className="cursor-pointer rounded-xl border border-border px-4 py-2 text-sm text-muted transition hover:border-accent hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={loadingList || page >= totalPages}
              className="cursor-pointer rounded-xl border border-border px-4 py-2 text-sm text-muted transition hover:border-accent hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
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
    <article className="rounded-2xl border border-border bg-surface p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-2 text-xl font-bold ${accent}`}>{value}</p>
    </article>
  );
}

function StyledSelect({
  id,
  value,
  placeholder,
  options,
  disabled = false,
  invalid = false,
  ariaLabel,
  onChange,
}: {
  id: string;
  value: string;
  placeholder: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  invalid?: boolean;
  ariaLabel: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <div className="relative">
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid}
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full cursor-pointer items-center justify-between rounded-xl border bg-surface px-4 py-3 text-left text-sm shadow-sm transition duration-200 hover:border-accent/60 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 disabled:cursor-not-allowed disabled:bg-background disabled:text-muted/60 ${invalid ? "border-danger" : "border-border"}`}
      >
        <span className={selected ? "font-medium text-text" : "text-muted"}>
          {selected?.label ?? placeholder}
        </span>
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={`size-4 text-muted transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && !disabled && (
        <>
          <button aria-label="Close category options" tabIndex={-1} className="fixed inset-0 z-20 cursor-default" onClick={() => setOpen(false)} />
        <div role="listbox" aria-label={ariaLabel} className="themed-scrollbar absolute left-0 top-[calc(100%+8px)] z-30 max-h-64 w-full overflow-y-auto rounded-2xl border border-border bg-surface p-1.5 shadow-xl shadow-black/15">
            {options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={value === option.value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-accent/10 ${value === option.value ? "bg-accent/10 font-semibold text-accent" : "text-text"}`}
              >
                <span className={`flex size-7 items-center justify-center rounded-lg text-xs font-bold ${value === option.value ? "bg-accent text-white" : "bg-background text-muted"}`}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                {option.label}
                {value === option.value && <span className="ml-auto text-accent">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function getCategoryChipStyle(category: string) {
  const group = getCategoryGroup(category);
  const colorByGroup: Record<string, string> = {
    Home: "var(--color-category-1)",
    Food: "var(--color-category-2)",
    Transport: "var(--color-category-3)",
    Personal: "var(--color-category-4)",
    Leisure: "var(--color-category-5)",
    Work: "var(--color-category-6)",
    Investments: "var(--color-category-1)",
    "Rental income": "var(--color-category-3)",
    "Gifts & rewards": "var(--color-category-5)",
    Other: "var(--color-category-6)",
  };
  const color = colorByGroup[group] ?? "var(--color-muted)";

  return {
    color,
    borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
    backgroundColor: `color-mix(in srgb, ${color} 12%, var(--color-background))`,
  };
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
