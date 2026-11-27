import { useEffect, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import PageLayout from "../components/PageLayout";
import { API_URL } from "../lib/api";
import { getToken } from "../lib/auth";
import { formatCategory, getCategoryGroup } from "../lib/categories";
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
type OverviewMode = "yearly" | "monthly" | "weekly" | "daily";

const categoryColors = [
  "var(--color-category-1)",
  "var(--color-category-2)",
  "var(--color-category-3)",
  "var(--color-category-4)",
  "var(--color-category-5)",
  "var(--color-category-6)",
];
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
const fullMonthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-US", {
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
        : "Could not load dashboard data.",
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

function getDailyReport(
  transactions: Transaction[],
  year: number,
  month: number,
): MonthlyReport[] {
  const monthNumber = String(month + 1).padStart(2, "0");
  const monthPrefix = `${year}-${monthNumber}`;
  const dayCount = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: dayCount }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    return { key: `${monthPrefix}-${day}`, label: day, income: 0, expenses: 0 };
  });
  const daysByKey = new Map(days.map((day) => [day.key, day]));

  for (const transaction of transactions) {
    const day = daysByKey.get(transaction.transaction_date);
    const amount = Number(transaction.amount);
    if (!day || !Number.isFinite(amount)) continue;
    if (transaction.type === "income") day.income += amount;
    else day.expenses += amount;
  }

  return days;
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentWeekStart() {
  const date = new Date();
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return toLocalDateKey(date);
}

function getWeeklyReport(transactions: Transaction[], weekStart: string): MonthlyReport[] {
  const [year, month, day] = weekStart.split("-").map(Number);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(year, month - 1, day + index);
    return {
      key: toLocalDateKey(date),
      label: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date),
      income: 0,
      expenses: 0,
    };
  });
  const daysByKey = new Map(days.map((item) => [item.key, item]));

  for (const transaction of transactions) {
    const reportDay = daysByKey.get(transaction.transaction_date);
    const amount = Number(transaction.amount);
    if (!reportDay || !Number.isFinite(amount)) continue;
    if (transaction.type === "income") reportDay.income += amount;
    else reportDay.expenses += amount;
  }
  return days;
}

function getSingleDayReport(transactions: Transaction[], dateKey: string): MonthlyReport[] {
  const report: MonthlyReport = {
    key: dateKey,
    label: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date(`${dateKey}T12:00:00`)),
    income: 0,
    expenses: 0,
  };

  for (const transaction of transactions) {
    if (transaction.transaction_date !== dateKey) continue;
    const amount = Number(transaction.amount);
    if (!Number.isFinite(amount)) continue;
    if (transaction.type === "income") report.income += amount;
    else report.expenses += amount;
  }

  return [report];
}

function shiftWeek(weekStart: string, amount: number) {
  const [year, month, day] = weekStart.split("-").map(Number);
  const date = new Date(year, month - 1, day + amount * 7);
  return toLocalDateKey(date);
}

function shiftDate(dateKey: string, amount: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return toLocalDateKey(new Date(year, month - 1, day + amount));
}

function getCalendarDates(viewDate: Date) {
  const firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) =>
    toLocalDateKey(new Date(viewDate.getFullYear(), viewDate.getMonth(), 1 - mondayOffset + index)),
  );
}

function formatWeekRange(start: string) {
  const end = shiftDate(start, 6);
  return `${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${start}T12:00:00`))} – ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${end}T12:00:00`))}`;
}

function getExpenseCategories(
  transactions: Transaction[],
  year: number,
  month?: number,
  dateRange?: { start: string; end: string },
): CategoryReport[] {
  const totals = new Map<string, number>();

  for (const transaction of transactions) {
    const date = transaction.transaction_date;
    const inPeriod = dateRange
      ? date >= dateRange.start && date <= dateRange.end
      : date.startsWith(month === undefined
        ? String(year)
        : `${year}-${String(month + 1).padStart(2, "0")}`);
    if (transaction.type !== "expense" || !inPeriod) {
      continue;
    }

    const amount = Number(transaction.amount);
    if (!Number.isFinite(amount)) continue;

    const categoryGroup = getCategoryGroup(transaction.category);
    totals.set(categoryGroup, (totals.get(categoryGroup) ?? 0) + amount);
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
      name: "Other",
      amount: otherAmount,
      color: categoryColors[5],
    });
  }

  return categories;
}

function donutSlicePath(startPercent: number, percentage: number) {
  const outerRadius = 82;
  const startAngle = (startPercent * 3.6 - 90) * (Math.PI / 180);
  const endAngle = ((startPercent + percentage) * 3.6 - 90) * (Math.PI / 180);
  const point = (radius: number, angle: number) => ({
    x: 100 + radius * Math.cos(angle),
    y: 100 + radius * Math.sin(angle),
  });
  const startOuter = point(outerRadius, startAngle);
  const endOuter = point(outerRadius, endAngle);

  if (percentage >= 99.99) {
    const opposite = startAngle + Math.PI;
    const outerMiddle = point(outerRadius, opposite);
    return [
      `M ${startOuter.x} ${startOuter.y}`,
      `A ${outerRadius} ${outerRadius} 0 1 1 ${outerMiddle.x} ${outerMiddle.y}`,
      `A ${outerRadius} ${outerRadius} 0 1 1 ${startOuter.x} ${startOuter.y}`,
      "L 100 100 Z",
    ].join(" ");
  }

  const largeArc = percentage > 50 ? 1 : 0;
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    "L 100 100 Z",
  ].join(" ");
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [overviewMode, setOverviewMode] = useState<OverviewMode>("yearly");
  const [weekStart, setWeekStart] = useState(getCurrentWeekStart);
  const [selectedDate, setSelectedDate] = useState(() => toLocalDateKey(new Date()));
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false);
  const [chartZoom, setChartZoom] = useState(1);
  const [hoveredPointKey, setHoveredPointKey] = useState<string | null>(null);
  const [hoveredCategoryName, setHoveredCategoryName] = useState<string | null>(null);

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
            : "Could not load the dashboard.",
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

  const currentYear = new Date().getFullYear();
  const recentYears = Array.from({ length: 6 }, (_, index) => currentYear - index);
  const reportYears = Array.from(new Set([...years, ...recentYears])).sort(
    (a, b) => b - a,
  );
  const reportYear = selectedYear;
  const yearlyReport = getMonthlyReport(transactions, reportYear);
  const monthlyDailyReport = getDailyReport(transactions, reportYear, selectedMonth);
  const weeklyReport = getWeeklyReport(transactions, weekStart);
  const selectedDayReport = getSingleDayReport(transactions, selectedDate);
  const chartReport = overviewMode === "yearly"
    ? yearlyReport
    : overviewMode === "monthly"
      ? monthlyDailyReport
      : overviewMode === "weekly"
        ? weeklyReport
        : selectedDayReport;
  const hoveredPoint = chartReport.find((point) => point.key === hoveredPointKey);
  const weeklyIncome = weeklyReport.reduce((total, day) => total + day.income, 0);
  const weeklyExpenses = weeklyReport.reduce((total, day) => total + day.expenses, 0);
  const selectedDay = selectedDayReport[0];
  const expenseCategories = getExpenseCategories(
    transactions,
    reportYear,
    overviewMode === "monthly" ? selectedMonth : undefined,
    overviewMode === "weekly"
      ? { start: weekStart, end: weeklyReport[6]?.key ?? shiftWeek(weekStart, 1) }
      : overviewMode === "daily"
        ? { start: selectedDate, end: selectedDate }
        : undefined,
  );

  const yearIncome = yearlyReport.reduce(
    (total, month) => total + month.income,
    0,
  );
  const yearExpenses = yearlyReport.reduce(
    (total, month) => total + month.expenses,
    0,
  );

  const overviewIncome = overviewMode === "yearly"
    ? yearIncome
    : overviewMode === "monthly"
      ? yearlyReport[selectedMonth]?.income ?? 0
      : overviewMode === "weekly"
        ? weeklyIncome
        : selectedDay?.income ?? 0;
  const overviewExpenses = overviewMode === "yearly"
    ? yearExpenses
    : overviewMode === "monthly"
      ? yearlyReport[selectedMonth]?.expenses ?? 0
      : overviewMode === "weekly"
        ? weeklyExpenses
        : selectedDay?.expenses ?? 0;
  const maxMonthlyValue = Math.max(
    ...chartReport.flatMap((point) => [point.income, point.expenses]),
    1,
  );
  const chartGap = chartReport.length > 1 ? 550 / (chartReport.length - 1) : 0;
  const chartX = (index: number) => 46 + index * chartGap;
  const chartScaleMax = Math.max(maxMonthlyValue / chartZoom, 1);
  const chartY = (amount: number) => 220 - (amount / chartScaleMax) * 178;
  const chartPath = (key: "income" | "expenses") =>
    chartReport
      .map((point, index) => {
        const x = chartX(index);
        const y = chartY(point[key]);
        return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");

  const totalCategoryExpenses = expenseCategories.reduce(
    (total, category) => total + category.amount,
    0,
  );

  const monthsWithExpenses = yearlyReport.filter(
    (month) => month.expenses > 0,
  ).length;

  const averageMonthlyExpenses =
    monthsWithExpenses > 0 ? yearExpenses / monthsWithExpenses : 0;

  const savingsRate = overviewIncome > 0
    ? ((overviewIncome - overviewExpenses) / overviewIncome) * 100
    : null;

  const topExpenseCategory = expenseCategories[0] ?? null;
  const weekRangeLabel = formatWeekRange(weekStart);
  const weekOptions = Array.from({ length: 15 }, (_, index) => shiftWeek(weekStart, index - 7));
  const calendarDates = getCalendarDates(calendarMonth);
  const calendarMonthPrefix = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}`;
  const selectedDateLabel = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date(`${selectedDate}T12:00:00`));
  const periodLabel = overviewMode === "yearly"
    ? String(reportYear)
    : overviewMode === "monthly"
      ? `${fullMonthNames[selectedMonth]} ${reportYear}`
      : overviewMode === "weekly"
        ? weekRangeLabel
        : new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${selectedDate}T12:00:00`));
  const hasOverviewData = overviewIncome > 0 || overviewExpenses > 0;

  let currentPercentage = 0;
  const donutSegments = expenseCategories.map((category) => {
    const percentage =
      totalCategoryExpenses > 0
        ? (category.amount / totalCategoryExpenses) * 100
        : 0;
    const segment = { ...category, percentage, offset: currentPercentage };
    currentPercentage += percentage;
    return segment;
  });

  return (
    <PageLayout>
      {loading && <p className="mt-8 text-muted">Loading dashboard…</p>}

      {!loading && summary && (
        <>
          <section className="mt-7">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text">All-time totals</h2>
              <span className="text-xs text-muted">Across all recorded activity</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Total income"
                amount={Number(summary.total_income)}
                kind="income"
              />
              <SummaryCard
                label="Total expenses"
                amount={Number(summary.total_expenses)}
                kind="expense"
              />
              <SummaryCard
                label="Current balance"
                amount={Number(summary.balance)}
                kind="balance"
              />
              <SummaryCard
                label="Total transactions"
                amount={transactions.length}
                kind="count"
              />
            </div>
          </section>

          <section className="mt-9">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <div className="inline-flex flex-wrap rounded-xl border border-border bg-surface p-1">
                {(["yearly", "monthly", "weekly", "daily"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={overviewMode === mode}
                    onClick={() => { setOverviewMode(mode); setPeriodMenuOpen(false); setHoveredPointKey(null); setHoveredCategoryName(null); setChartZoom(1); }}
                    className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${overviewMode === mode ? "bg-accent text-white shadow-md shadow-accent/20" : "text-muted hover:bg-background hover:text-text"}`}
                  >
                    {mode} overview
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                {(overviewMode === "weekly" || overviewMode === "daily") && <button type="button" aria-label={overviewMode === "weekly" ? "Previous week" : "Previous day"} onClick={() => { if (overviewMode === "weekly") setWeekStart((value) => shiftWeek(value, -1)); else setSelectedDate((value) => shiftDate(value, -1)); setPeriodMenuOpen(false); setHoveredPointKey(null); setChartZoom(1); }} className="flex size-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-surface text-muted transition hover:border-accent/60 hover:text-accent">‹</button>}
                {(overviewMode === "yearly" || overviewMode === "monthly") && (
                  <div className="group relative" onMouseEnter={() => setPeriodMenuOpen(true)} onMouseLeave={() => setPeriodMenuOpen(false)}>
                    <button type="button" aria-expanded={periodMenuOpen} aria-haspopup="listbox" onClick={() => setPeriodMenuOpen((open) => !open)} className="flex min-w-32 cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text shadow-sm transition hover:border-accent/60">
                      {overviewMode === "yearly" ? reportYear : fullMonthNames[selectedMonth]}
                      <span className={`text-muted transition-transform ${periodMenuOpen ? "rotate-180" : ""}`}>⌄</span>
                    </button>
                    {periodMenuOpen && <div role="listbox" aria-label={overviewMode === "yearly" ? "Choose year" : "Choose month"} className="themed-scrollbar absolute right-0 top-full z-30 grid max-h-72 min-w-40 grid-cols-1 gap-1 overflow-y-auto rounded-2xl border border-border bg-surface p-2 shadow-2xl shadow-black/30">
                      {overviewMode === "yearly"
                        ? reportYears.map((year) => <button key={year} type="button" role="option" aria-selected={reportYear === year} onClick={() => { setSelectedYear(year); setPeriodMenuOpen(false); setHoveredPointKey(null); setChartZoom(1); }} className={`cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition ${reportYear === year ? "bg-accent font-semibold text-white" : "text-muted hover:bg-background hover:text-text"}`}>{year}</button>)
                        : fullMonthNames.map((month, index) => <button key={month} type="button" role="option" aria-selected={selectedMonth === index} onClick={() => { setSelectedMonth(index); setPeriodMenuOpen(false); setHoveredPointKey(null); setChartZoom(1); }} className={`cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition ${selectedMonth === index ? "bg-accent font-semibold text-white" : "text-muted hover:bg-background hover:text-text"}`}>{month}</button>)}
                    </div>}
                  </div>
                )}
                {(overviewMode === "weekly" || overviewMode === "daily") && <div className="group relative" onMouseLeave={() => setPeriodMenuOpen(false)}>
                  <button type="button" aria-expanded={periodMenuOpen} aria-haspopup="listbox" onClick={() => { if (overviewMode === "daily" && !periodMenuOpen) setCalendarMonth(new Date(`${selectedDate}T12:00:00`)); setPeriodMenuOpen((open) => !open); }} className="flex min-w-48 cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text shadow-sm transition hover:border-accent/60">
                    {overviewMode === "weekly" ? weekRangeLabel : selectedDateLabel}
                    <span className={`shrink-0 text-muted transition-transform ${periodMenuOpen ? "rotate-180" : ""}`}>⌄</span>
                  </button>
                  {periodMenuOpen && (overviewMode === "weekly" ? (
                    <div role="listbox" aria-label="Choose a week" className="themed-scrollbar absolute right-0 top-full z-30 grid max-h-72 min-w-56 grid-cols-1 gap-1 overflow-y-auto rounded-2xl border border-border bg-surface p-2 shadow-2xl shadow-black/30">
                      {weekOptions.map((start) => <button key={start} type="button" role="option" aria-selected={weekStart === start} onClick={() => { setWeekStart(start); setPeriodMenuOpen(false); setHoveredPointKey(null); setChartZoom(1); }} className={`cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition ${weekStart === start ? "bg-accent font-semibold text-white" : "text-muted hover:bg-background hover:text-text"}`}>Week of {formatWeekRange(start)}</button>)}
                    </div>
                  ) : (
                    <div className="absolute right-0 top-full z-30 w-[19rem] rounded-2xl border border-border bg-surface p-4 shadow-2xl shadow-black/30">
                      <div className="mb-4 flex items-center justify-between">
                        <button type="button" aria-label="Previous calendar month" onClick={() => setCalendarMonth((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1))} className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-border text-muted transition hover:border-accent/60 hover:bg-accent/10 hover:text-accent">‹</button>
                        <p className="text-sm font-bold text-text">{new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(calendarMonth)}</p>
                        <button type="button" aria-label="Next calendar month" onClick={() => setCalendarMonth((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1))} className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-border text-muted transition hover:border-accent/60 hover:bg-accent/10 hover:text-accent">›</button>
                      </div>
                      <div className="mb-2 grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wide text-muted">
                        {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span key={`${day}-${index}`} className="py-1">{day}</span>)}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {calendarDates.map((date) => {
                          const inMonth = date.startsWith(calendarMonthPrefix);
                          const isSelected = date === selectedDate;
                          const isToday = date === toLocalDateKey(new Date());
                          return <button key={date} type="button" aria-label={new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${date}T12:00:00`))} aria-pressed={isSelected} onClick={() => { setSelectedDate(date); setPeriodMenuOpen(false); setHoveredPointKey(null); }} className={`flex aspect-square cursor-pointer items-center justify-center rounded-lg text-xs font-medium transition ${isSelected ? "bg-accent text-white shadow-md shadow-accent/25" : inMonth ? "text-text hover:bg-accent/15 hover:text-accent" : "text-muted/45 hover:bg-background hover:text-text"} ${isToday && !isSelected ? "ring-1 ring-primary/70" : ""}`}>{Number(date.slice(-2))}</button>;
                        })}
                      </div>
                      <button type="button" onClick={() => { const today = toLocalDateKey(new Date()); setSelectedDate(today); setCalendarMonth(new Date(`${today}T12:00:00`)); setPeriodMenuOpen(false); setHoveredPointKey(null); }} className="mt-3 w-full cursor-pointer rounded-lg py-2 text-xs font-semibold text-accent transition hover:bg-accent/10">Jump to today</button>
                    </div>
                  ))}
                </div>}
                {(overviewMode === "weekly" || overviewMode === "daily") && <button type="button" aria-label={overviewMode === "weekly" ? "Next week" : "Next day"} onClick={() => { if (overviewMode === "weekly") setWeekStart((value) => shiftWeek(value, 1)); else setSelectedDate((value) => shiftDate(value, 1)); setPeriodMenuOpen(false); setHoveredPointKey(null); setChartZoom(1); }} className="flex size-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-surface text-muted transition hover:border-accent/60 hover:text-accent">›</button>}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <InsightCard
                eyebrow={overviewMode === "yearly" ? "Top spending category" : overviewMode === "monthly" ? "Top category this month" : overviewMode === "weekly" ? "Top category this week" : "Top category on selected day"}
                title={topExpenseCategory?.name ?? "No expenses"}
                value={
                  topExpenseCategory
                    ? formatAmount(topExpenseCategory.amount)
                    : "—"
                }
                detail="The category with the highest spending"
                color="var(--color-category-1)"
              />

              <InsightCard
                eyebrow={overviewMode === "yearly" ? "Average monthly expenses" : overviewMode === "monthly" ? "Expenses this month" : overviewMode === "weekly" ? "Expenses this week" : "Expenses on selected day"}
                title={
                  overviewMode === "yearly"
                    ? monthsWithExpenses > 0 ? `${formatAmount(averageMonthlyExpenses)} / month` : "No data"
                    : formatAmount(overviewExpenses)
                }
                detail={overviewMode === "yearly" ? "Average across months with expenses" : overviewMode === "monthly" ? fullMonthNames[selectedMonth] : periodLabel}
                color="var(--color-primary)"
              />

              <InsightCard
                eyebrow="Savings rate"
                title={
                  savingsRate === null
                    ? "No income"
                    : `${savingsRate.toFixed(1)}%`
                }
                detail={overviewMode === "yearly" ? "Income minus expenses, as a percentage of income" : `Income minus expenses for ${overviewMode === "monthly" ? fullMonthNames[selectedMonth] : periodLabel}`}
                color={
                  savingsRate !== null && savingsRate < 0
                    ? "var(--color-primary)"
                    : "var(--color-accent)"
                }
              />
            </div>
          </section>

          <section className="mt-8 grid gap-5 lg:grid-cols-[1.3fr_0.9fr]">
            <article className="rounded-[26px] border border-border/60 bg-surface/80 p-5 shadow-lg shadow-black/10 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-text">
                {overviewMode === "yearly" ? "Monthly income and expenses" : overviewMode === "monthly" ? "Daily income and expenses" : overviewMode === "weekly" ? "Income and expenses this week" : "Income and expenses on this day"}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                {overviewMode === "yearly" ? `Monthly comparison for ${reportYear}` : overviewMode === "monthly" ? `Daily totals for ${periodLabel}` : overviewMode === "weekly" ? `Daily comparison for ${weekRangeLabel}` : periodLabel}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className="rounded-xl border border-accent/30 bg-accent/15 px-3 py-1.5 text-xs font-bold text-accent">
                    {formatAmount(overviewIncome - overviewExpenses)} net
                  </span>
                  {overviewMode !== "daily" && <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-background/60 p-1" aria-label="Chart zoom controls">
                    <button type="button" aria-label="Zoom out" title="Zoom out" disabled={chartZoom <= 1} onClick={() => setChartZoom((zoom) => Math.max(1, zoom / 1.5))} className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-text transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-35">−</button>
                    <span className="min-w-10 text-center text-[10px] font-semibold text-muted">{chartZoom === 1 ? "Fit" : `${chartZoom.toFixed(1)}×`}</span>
                    <button type="button" aria-label="Zoom in" title="Zoom in" disabled={chartZoom >= 12} onClick={() => setChartZoom((zoom) => Math.min(12, zoom * 1.5))} className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-text transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-35">+</button>
                    <button type="button" aria-label="Reset chart zoom" title="Reset zoom" onClick={() => setChartZoom(1)} className="rounded-lg px-2 py-1 text-[10px] font-semibold text-accent transition hover:bg-accent/10">Reset</button>
                  </div>}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-4 text-sm">
                <Legend color="var(--color-accent)" label="Income" />
                <Legend color="var(--color-primary)" label="Expenses" />
              </div>

              {overviewMode === "daily" ? (
                <div className="mt-5 grid min-h-[260px] grid-cols-2 gap-5 rounded-2xl bg-background/45 p-5 sm:gap-8 sm:px-10">
                  {!hasOverviewData && <p className="col-span-2 self-center text-center text-sm text-muted">No transactions were recorded on this day.</p>}
                  {[
                    { label: "Income", amount: overviewIncome, color: "var(--color-accent)" },
                    { label: "Expenses", amount: overviewExpenses, color: "var(--color-primary)" },
                  ].map((item) => {
                    const maximum = Math.max(overviewIncome, overviewExpenses, 1);
                    const barHeight = item.amount > 0 ? Math.max(8, (item.amount / maximum) * 158) : 0;
                    return (
                      <div key={item.label} className="flex min-w-0 flex-col items-center justify-end gap-3">
                        <span className="text-center text-sm font-bold text-text">{formatAmount(item.amount)}</span>
                        <div className="flex h-[165px] w-full max-w-32 items-end justify-center border-b border-border/70">
                          <div className="w-2/3 rounded-t-xl transition-all duration-500" style={{ height: `${barHeight}px`, backgroundColor: item.color, boxShadow: `0 0 22px color-mix(in srgb, ${item.color} 30%, transparent)` }} />
                        </div>
                        <span className="text-xs font-semibold text-muted">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
              <div className="mt-5 overflow-x-auto pb-1">
                <svg viewBox="0 0 620 270" role="img" aria-label={`${overviewMode === "yearly" ? "Monthly" : "Daily"} income and expenses for ${periodLabel}`} className="h-[260px] min-w-[620px] w-full overflow-visible">
                  {[42, 86, 130, 175, 220].map((y, index) => <g key={y}><line x1="42" x2="596" y1={y} y2={y} stroke="var(--color-border)" strokeOpacity=".62" strokeDasharray="3 5"/><text x="4" y={y + 4} fill="var(--color-muted)" fontSize="10">{formatAmount((chartScaleMax / 4) * (4 - index))}</text></g>)}
                  {chartZoom > 1 && <text x="596" y="32" textAnchor="end" fill="var(--color-muted)" fontSize="9">Zoomed in · larger values may be outside the chart</text>}
                  {!hasOverviewData && <text x="320" y="132" textAnchor="middle" fill="var(--color-muted)" fontSize="13">No transaction data for {periodLabel}</text>}
                  <path d={chartPath("income")} fill="none" stroke="var(--color-accent)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: hoveredPoint ? "drop-shadow(0 0 7px var(--color-accent))" : undefined, transition: "filter 160ms ease" }} />
                  <path d={chartPath("expenses")} fill="none" stroke="var(--color-primary)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: hoveredPoint ? "drop-shadow(0 0 7px var(--color-primary))" : undefined, transition: "filter 160ms ease" }} />
                  {chartReport.map((point, index) => {
                    const x = chartX(index);
                    const incomeY = chartY(point.income);
                    const expenseY = chartY(point.expenses);
                    const isHovered = hoveredPointKey === point.key;
                    const showAxisLabel = overviewMode !== "monthly" || index === 0 || (index + 1) % 5 === 0 || index === chartReport.length - 1;
                    return <g key={point.key}>
                      <rect x={x - Math.max(8, chartGap / 2)} y="35" width={Math.max(16, chartGap)} height="190" fill="transparent" onMouseEnter={() => setHoveredPointKey(point.key)} onMouseLeave={() => setHoveredPointKey(null)} onFocus={() => setHoveredPointKey(point.key)} onBlur={() => setHoveredPointKey(null)} tabIndex={0} role="button" aria-label={`${point.label}: income ${formatAmount(point.income)}, expenses ${formatAmount(point.expenses)}`} className="cursor-crosshair outline-none" />
                      {isHovered && <line x1={x} x2={x} y1="38" y2="225" stroke="var(--color-muted)" strokeOpacity=".35" strokeDasharray="3 4" pointerEvents="none" />}
                      <circle cx={x} cy={incomeY} r={isHovered ? "6" : "3.5"} fill="var(--color-surface)" stroke="var(--color-accent)" strokeWidth="2.5" pointerEvents="none" style={{ filter: isHovered ? "drop-shadow(0 0 7px var(--color-accent))" : undefined, transition: "all 160ms ease" }} />
                      <circle cx={x} cy={expenseY} r={isHovered ? "6" : "3.5"} fill="var(--color-surface)" stroke="var(--color-primary)" strokeWidth="2.5" pointerEvents="none" style={{ filter: isHovered ? "drop-shadow(0 0 7px var(--color-primary))" : undefined, transition: "all 160ms ease" }} />
                      {showAxisLabel && <text x={x} y="250" textAnchor="middle" fill={isHovered ? "var(--color-text)" : "var(--color-muted)"} fontSize="10" pointerEvents="none">{point.label}</text>}
                    </g>;
                  })}
                  {hoveredPoint && (() => {
                    const index = chartReport.findIndex((point) => point.key === hoveredPoint.key);
                    const x = chartX(index);
                    const left = Math.max(44, Math.min(424, x - 86));
                    return <g pointerEvents="none"><rect x={left} y="5" width="172" height="45" rx="8" fill="var(--color-surface)" stroke="var(--color-border)"/><text x={left + 10} y="15" fill="var(--color-muted)" fontSize="9">{overviewMode === "yearly" ? hoveredPoint.label : overviewMode === "monthly" ? `${fullMonthNames[selectedMonth]} ${hoveredPoint.label}` : `${hoveredPoint.label}, ${hoveredPoint.key.slice(5)}`}</text><circle cx={left + 12} cy="27" r="3" fill="var(--color-accent)"/><text x={left + 21} y="30" fill="var(--color-text)" fontSize="10" fontWeight="600">Income  {formatAmount(hoveredPoint.income)}</text><circle cx={left + 12} cy="40" r="3" fill="var(--color-primary)"/><text x={left + 21} y="43" fill="var(--color-text)" fontSize="10" fontWeight="600">Expenses  {formatAmount(hoveredPoint.expenses)}</text></g>;
                  })()}
                </svg>
              </div>
              )}
            </article>

            <article className="rounded-[26px] border border-border/60 bg-surface/80 p-5 shadow-lg shadow-black/10 sm:p-6">
              <h2 className="text-lg font-semibold text-text">
                Expenses by Category
              </h2>
              <p className="mt-1 text-sm text-muted">
                Expense breakdown for {periodLabel}
              </p>

              {expenseCategories.length === 0 ? (
                <p className="mt-8 text-sm text-muted">
                  No expenses were recorded for {periodLabel}.
                </p>
              ) : (
                <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row lg:flex-col xl:flex-row">
                  <div
                    className="relative size-44 shrink-0 transition-transform duration-300 hover:scale-[1.03]"
                    role="img"
                    aria-label={`Expense breakdown by category for ${periodLabel}`}
                    onMouseLeave={() => setHoveredCategoryName(null)}
                  >
                    <svg viewBox="0 0 200 200" className="size-full overflow-visible">
                      <circle cx="100" cy="100" r="83" fill="var(--color-border)" />
                      <defs>
                        <filter id="category-neon-glow" x="-80%" y="-80%" width="260%" height="260%">
                          <feGaussianBlur stdDeviation="4" result="blur" />
                          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                      </defs>
                      {donutSegments.map((segment) => {
                        const active = hoveredCategoryName === segment.name;
                        const middleAngle = (segment.offset + segment.percentage / 2) * 3.6 - 90;
                        const radians = (middleAngle * Math.PI) / 180;
                        const push = active ? 14 : 0;
                        return (
                          <path
                            key={segment.name}
                            d={donutSlicePath(segment.offset, segment.percentage)}
                            fill={segment.color}
                            transform={`translate(${Math.cos(radians) * push} ${Math.sin(radians) * push})`}
                            onMouseEnter={() => setHoveredCategoryName(segment.name)}
                            onFocus={() => setHoveredCategoryName(segment.name)}
                            onBlur={() => setHoveredCategoryName(null)}
                            tabIndex={0}
                            role="button"
                            aria-label={`${segment.name}: ${formatAmount(segment.amount)}`}
                            style={{ filter: active ? "url(#category-neon-glow)" : undefined, cursor: "pointer", transition: "transform 180ms ease, filter 180ms ease" }}
                          >
                            <title>{`${segment.name}: ${formatAmount(segment.amount)}`}</title>
                          </path>
                        );
                      })}
                    </svg>
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center">
                      <div className="flex size-[92px] flex-col items-center justify-center rounded-[28px] border border-white/35 bg-background/70 px-1 shadow-lg shadow-black/20 backdrop-blur-md">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Total spent</p>
                        <p className="mt-1 text-xs font-extrabold leading-tight text-text">
                          {formatAmount(totalCategoryExpenses)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="w-full space-y-3">
                    {expenseCategories.map((category) => {
                      const active = hoveredCategoryName === category.name;
                      return (
                        <div key={category.name} onMouseEnter={() => setHoveredCategoryName(category.name)} onMouseLeave={() => setHoveredCategoryName(null)} className="rounded-lg px-2 py-1 transition" style={{ backgroundColor: active ? `color-mix(in srgb, ${category.color} 12%, transparent)` : undefined, boxShadow: active ? `0 0 14px color-mix(in srgb, ${category.color} 30%, transparent)` : undefined }}>
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className="size-3 shrink-0 rounded-full"
                                style={{ backgroundColor: category.color, boxShadow: active ? `0 0 12px ${category.color}` : undefined }}
                              />
                              <span
                                className="truncate font-semibold transition-all duration-150"
                                style={{
                                  color: active ? category.color : "var(--color-text)",
                                  textShadow: active ? `0 0 12px color-mix(in srgb, ${category.color} 58%, transparent)` : undefined,
                                }}
                              >
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
                                width: `${totalCategoryExpenses > 0 ? (category.amount / totalCategoryExpenses) * 100 : 0}%`,
                                backgroundColor: category.color,
                                boxShadow: active ? `0 0 10px ${category.color}` : undefined,
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

          <section className="mt-6 rounded-[26px] border border-border/60 bg-surface/80 p-5 shadow-lg shadow-black/10 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-text">Latest transactions</h2>
                <p className="mt-1 text-sm text-muted">Your five most recent entries</p>
              </div>
              <Link to="/transactions" className="rounded-xl px-3 py-2 text-sm font-semibold text-accent transition hover:bg-accent/10">See all</Link>
            </div>
            {transactions.length === 0 ? (
              <p className="mt-5 rounded-2xl border border-border/60 bg-background/60 p-5 text-sm text-muted">No transactions yet. Add one to see it here.</p>
            ) : (
              <div className="mt-4 divide-y divide-border/70">
                {[...transactions]
                  .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date) || b.id - a.id)
                  .slice(0, 5)
                  .map((transaction) => (
                    <div key={transaction.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-1 last:pb-1">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${transaction.type === "income" ? "bg-accent/15 text-accent" : "bg-primary/15 text-primary"}`}>{transaction.type === "income" ? "+" : "−"}</span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-text">{transaction.description || formatCategory(transaction.category)}</p>
                          <p className="mt-0.5 text-xs text-muted">{formatCategory(transaction.category)} · {transaction.transaction_date}</p>
                        </div>
                      </div>
                      <p className={`font-semibold ${transaction.type === "income" ? "text-accent" : "text-primary"}`}>{transaction.type === "income" ? "+" : "−"}{formatAmount(Number(transaction.amount))}</p>
                    </div>
                  ))}
              </div>
            )}
          </section>
        </>
      )}
    </PageLayout>
  );
}

function SummaryCard({
  label,
  amount,
  kind,
}: {
  label: string;
  amount: number;
  kind: "income" | "expense" | "balance" | "count";
}) {
  const tone = {
    income: {
      dot: "bg-accent",
      amount: "text-accent",
      stripe: "var(--color-accent)",
      icon: "+",
      hint: "Money coming in",
    },
    expense: {
      dot: "bg-primary",
      amount: "text-primary",
      stripe: "var(--color-primary)",
      icon: "−",
      hint: "Money going out",
    },
    balance: {
      dot: amount < 0 ? "bg-danger" : "bg-chart-3",
      amount: amount < 0 ? "text-danger" : "text-text",
      stripe: "var(--color-category-3)",
      icon: "=",
      hint: "Income after expenses",
    },
    count: {
      dot: "bg-chart-3",
      amount: "text-chart-3",
      stripe: "var(--color-category-3)",
      icon: "#",
      hint: "All recorded activity",
    },
  }[kind];

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg sm:p-6">
      <span className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: tone.stripe }} />
      <div className={`absolute -right-6 -top-8 size-28 rounded-full ${tone.dot} opacity-[0.07] blur-2xl transition group-hover:opacity-[0.14]`} />
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={`size-2.5 rounded-full ${tone.dot}`} />
          <p className="text-sm font-medium text-muted">{label}</p>
        </div>
        <span className={`flex size-8 items-center justify-center rounded-xl bg-background text-sm font-bold ${tone.amount}`}>
          {tone.icon}
        </span>
      </div>
      <p className={`relative mt-5 text-2xl font-bold tracking-tight sm:text-3xl ${tone.amount}`}>
        {kind === "count" ? new Intl.NumberFormat("en-US").format(amount) : formatAmount(amount)}
      </p>
      <p className="relative mt-2 text-xs text-muted">{tone.hint}</p>
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
    <article className="min-w-0 rounded-2xl border border-border bg-surface p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
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
