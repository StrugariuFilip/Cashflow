import { useEffect, useState } from "react";
import { toast } from "sonner";

import PageLayout from "../components/PageLayout";
import { API_URL } from "../lib/api";
import { getToken } from "../lib/auth";
import type { Summary, Transaction } from "../types/transaction";

type MonthlyReport = {
  key: string;
  label: string;
  income: number;
  expenses: number;
};

type CategoryReport = {
  name: string;
  amount: number;
  color: string;
};

const categoryColors = [
  "#8B5CF6", // violet
  "#F43F5E", // coral-roșu
  "#FACC15", // galben
  "#D946EF", // fucsia
  "#A78BFA", // lavandă
  "#94A3B8", // gri-lavandă pentru „Altele”
];
const monthNames = [
  "Ian",
  "Feb",
  "Mar",
  "Apr",
  "Mai",
  "Iun",
  "Iul",
  "Aug",
  "Sep",
  "Oct",
  "Noi",
  "Dec",
];

function formatAmount(amount: number) {
  return new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : "Nu am putut încărca datele dashboard-ului.",
    );
  }

  return data as T;
}

function getMonthlyReport(
  transactions: Transaction[],
  year: number,
): MonthlyReport[] {
  const months = monthNames.map((label, index) => ({
    key: `${year}-${String(index + 1).padStart(2, "0")}`,
    label,
    income: 0,
    expenses: 0,
  }));

  const monthsByKey = new Map(months.map((month) => [month.key, month]));

  for (const transaction of transactions) {
    const month = monthsByKey.get(transaction.transaction_date.slice(0, 7));
    const amount = Number(transaction.amount);

    if (!month || !Number.isFinite(amount)) continue;

    if (transaction.type === "income") {
      month.income += amount;
    } else {
      month.expenses += amount;
    }
  }

  return months;
}

function getExpenseCategories(
  transactions: Transaction[],
  year: number,
): CategoryReport[] {
  const totals = new Map<string, number>();

  for (const transaction of transactions) {
    if (
      transaction.type !== "expense" ||
      !transaction.transaction_date.startsWith(String(year))
    ) {
      continue;
    }

    const amount = Number(transaction.amount);
    if (!Number.isFinite(amount)) continue;

    totals.set(
      transaction.category,
      (totals.get(transaction.category) ?? 0) + amount,
    );
  }

  const sortedCategories = Array.from(totals.entries()).sort(
    (a, b) => b[1] - a[1],
  );

  const categories = sortedCategories
    .slice(0, 5)
    .map(([name, amount], index) => ({
      name,
      amount,
      color: categoryColors[index % categoryColors.length],
    }));

  const otherAmount = sortedCategories
    .slice(5)
    .reduce((total, [, amount]) => total + amount, 0);

  if (otherAmount > 0) {
    categories.push({
      name: "Altele",
      amount: otherAmount,
      color: categoryColors[5],
    });
  }

  return categories;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [summaryData, transactionsData] = await Promise.all([
          fetchJson<Summary>(`${API_URL}/api/v1/dashboard/summary`),
          fetchJson<Transaction[]>(`${API_URL}/api/v1/transactions`),
        ]);

        setSummary(summaryData);
        setTransactions(transactionsData);
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Nu am putut încărca dashboard-ul.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const years = Array.from(
    new Set(
      transactions
        .map((transaction) => Number(transaction.transaction_date.slice(0, 4)))
        .filter(Number.isFinite),
    ),
  ).sort((a, b) => b - a);

  const reportYear = selectedYear ?? years[0] ?? new Date().getFullYear();
  const monthlyReport = getMonthlyReport(transactions, reportYear);
  const expenseCategories = getExpenseCategories(transactions, reportYear);

  const yearIncome = monthlyReport.reduce(
    (total, month) => total + month.income,
    0,
  );
  const yearExpenses = monthlyReport.reduce(
    (total, month) => total + month.expenses,
    0,
  );

  const maxMonthlyValue = Math.max(
    ...monthlyReport.flatMap((month) => [month.income, month.expenses]),
    1,
  );

  const totalCategoryExpenses = expenseCategories.reduce(
    (total, category) => total + category.amount,
    0,
  );

  const monthsWithExpenses = monthlyReport.filter(
    (month) => month.expenses > 0,
  ).length;

  const averageMonthlyExpenses =
    monthsWithExpenses > 0 ? yearExpenses / monthsWithExpenses : 0;

  const savingsRate =
    yearIncome > 0 ? ((yearIncome - yearExpenses) / yearIncome) * 100 : null;

  const topExpenseCategory = expenseCategories[0] ?? null;

  let currentPercentage = 0;
  const donutSegments = expenseCategories.map((category) => {
    const percentage =
      totalCategoryExpenses > 0
        ? (category.amount / totalCategoryExpenses) * 100
        : 0;

    const segment = `${category.color} ${currentPercentage}% ${currentPercentage + percentage}%`;
    currentPercentage += percentage;
    return segment;
  });

  const donutBackground =
    donutSegments.length > 0
      ? `conic-gradient(${donutSegments.join(", ")})`
      : "var(--color-border)";

  return (
    <PageLayout>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
            Raport financiar
          </p>
          <h1 className="mt-2 text-3xl font-bold text-text">Dashboard</h1>
          <p className="mt-2 text-muted">
            O privire de ansamblu asupra finanțelor tale.
          </p>
        </div>

        {years.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
              Anul raportului
            </p>
            <div className="flex flex-wrap gap-2">
              {years.map((year) => (
                <button
                  key={year}
                  type="button"
                  aria-pressed={reportYear === year}
                  onClick={() => setSelectedYear(year)}
                  className={`cursor-pointer rounded-xl border px-4 py-2 text-sm font-medium transition duration-200 hover:-translate-y-0.5 ${
                    reportYear === year
                      ? "border-accent bg-accent text-background shadow-md shadow-accent/20"
                      : "border-border bg-surface text-muted hover:border-accent/60 hover:text-text"
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading && <p className="mt-8 text-muted">Se încarcă dashboard-ul…</p>}

      {!loading && summary && (
        <>
          <section className="mt-8">
            <p className="mb-3 text-sm text-muted">Totaluri de la început</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <SummaryCard
                label="Venituri totale"
                amount={Number(summary.total_income)}
                color="text-accent"
                dotColor="bg-accent"
              />
              <SummaryCard
                label="Cheltuieli totale"
                amount={Number(summary.total_expenses)}
                color="text-orange-400"
                dotColor="bg-orange-400"
              />
              <SummaryCard
                label="Sold curent"
                amount={Number(summary.balance)}
                color="text-text"
                dotColor="bg-muted"
              />
            </div>
          </section>

          <section className="mt-8">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-text">
                Perspective pentru {reportYear}
              </h2>
              <p className="mt-1 text-sm text-muted">
                Indicatori calculați pentru anul selectat.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <InsightCard
                eyebrow="Cea mai mare categorie"
                title={topExpenseCategory?.name ?? "Fără cheltuieli"}
                value={
                  topExpenseCategory
                    ? formatAmount(topExpenseCategory.amount)
                    : "—"
                }
                detail="Categoria în care ai cheltuit cel mai mult"
                color="var(--color-accent)"
              />

              <InsightCard
                eyebrow="Media cheltuielilor"
                title={
                  monthsWithExpenses > 0
                    ? `${formatAmount(averageMonthlyExpenses)} / lună`
                    : "Nu există date"
                }
                detail="Media lunilor în care ai avut cheltuieli"
                color="var(--color-primary)"
              />

              <InsightCard
                eyebrow="Rata de economisire"
                title={
                  savingsRate === null
                    ? "Nu există venituri"
                    : `${savingsRate.toFixed(1)}%`
                }
                detail="Venituri minus cheltuieli, raportat la venituri"
                color={
                  savingsRate !== null && savingsRate < 0
                    ? "#fb923c"
                    : "var(--color-primary)"
                }
              />
            </div>
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <article className="rounded-2xl border border-border/50 bg-surface p-6">
              <h2 className="text-lg font-semibold text-text">
                Venituri și cheltuieli pe luni
              </h2>
              <p className="mt-1 text-sm text-muted">
                Comparație lunară pentru {reportYear}
              </p>

              <div className="mt-5 flex flex-wrap gap-4 text-sm">
                <Legend color="var(--color-accent)" label="Venituri" />
                <Legend color="#fb923c" label="Cheltuieli" />
              </div>

              <div className="mt-6 overflow-x-auto pb-2">
                <div className="grid min-w-[620px] grid-cols-12 gap-3">
                  {monthlyReport.map((month) => (
                    <div
                      key={month.key}
                      className="flex min-w-0 flex-col items-center"
                    >
                      <div className="flex h-44 w-full items-end justify-center gap-1 border-b border-border/60 pb-2">
                        <div
                          className="w-3 rounded-t-md bg-accent transition-all duration-300 hover:brightness-125"
                          style={{
                            height: `${Math.max(
                              (month.income / maxMonthlyValue) * 100,
                              month.income > 0 ? 3 : 0,
                            )}%`,
                          }}
                          title={`Venituri: ${formatAmount(month.income)}`}
                        />
                        <div
                          className="w-3 rounded-t-md bg-orange-400 transition-all duration-300 hover:brightness-125"
                          style={{
                            height: `${Math.max(
                              (month.expenses / maxMonthlyValue) * 100,
                              month.expenses > 0 ? 3 : 0,
                            )}%`,
                          }}
                          title={`Cheltuieli: ${formatAmount(month.expenses)}`}
                        />
                      </div>
                      <span className="mt-2 text-xs text-muted">
                        {month.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-border/50 bg-surface p-6">
              <h2 className="text-lg font-semibold text-text">
                Cheltuieli pe categorii
              </h2>
              <p className="mt-1 text-sm text-muted">
                Distribuția cheltuielilor din {reportYear}
              </p>

              {expenseCategories.length === 0 ? (
                <p className="mt-8 text-sm text-muted">
                  Nu există cheltuieli înregistrate pentru anul selectat.
                </p>
              ) : (
                <div className="mt-6 flex flex-col items-center gap-7 sm:flex-row xl:flex-col 2xl:flex-row">
                  <div
                    className="relative size-40 shrink-0 rounded-full transition-transform duration-300 hover:scale-105"
                    style={{ background: donutBackground }}
                    role="img"
                    aria-label={`Grafic circular al cheltuielilor pe categorii din ${reportYear}`}
                  >
                    <div className="absolute inset-5 flex items-center justify-center rounded-full bg-surface text-center">
                      <div>
                        <p className="text-xs text-muted">Total cheltuit</p>
                        <p className="mt-1 text-sm font-bold text-orange-400">
                          {formatAmount(totalCategoryExpenses)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="w-full space-y-4">
                    {expenseCategories.map((category) => {
                      const percentage =
                        totalCategoryExpenses > 0
                          ? (category.amount / totalCategoryExpenses) * 100
                          : 0;

                      return (
                        <div key={category.name}>
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className="size-3 shrink-0 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                              <span className="truncate text-muted">
                                {category.name}
                              </span>
                            </div>
                            <span className="shrink-0 font-medium text-text">
                              {formatAmount(category.amount)}
                            </span>
                          </div>

                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: category.color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </article>
          </section>
        </>
      )}
    </PageLayout>
  );
}

function SummaryCard({
  label,
  amount,
  color,
  dotColor,
}: {
  label: string;
  amount: number;
  color: string;
  dotColor: string;
}) {
  return (
    <article className="rounded-2xl border border-border/50 bg-surface p-6 transition duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5">
      <div className="flex items-center gap-2">
        <span className={`size-2.5 rounded-full ${dotColor}`} />
        <p className="text-sm text-muted">{label}</p>
      </div>
      <p className={`mt-4 text-2xl font-bold ${color}`}>
        {formatAmount(amount)}
      </p>
    </article>
  );
}

function InsightCard({
  eyebrow,
  title,
  value,
  detail,
  color,
}: {
  eyebrow: string;
  title: string;
  value?: string;
  detail: string;
  color: string;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-border/50 bg-surface p-5 transition duration-200 hover:-translate-y-0.5 hover:border-accent/40">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">
        {eyebrow}
      </p>
      <p className="mt-3 truncate text-lg font-bold" style={{ color }}>
        {title}
      </p>
      {value && (
        <p className="mt-1 text-sm font-semibold text-text">{value}</p>
      )}
      <p className="mt-3 text-xs text-muted">{detail}</p>
    </article>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2 text-muted">
      <span
        className="size-3 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}