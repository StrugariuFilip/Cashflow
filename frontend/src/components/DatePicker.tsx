import { useEffect, useRef, useState } from "react";

type DatePickerProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthDays(viewDate: Date) {
  const firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) =>
    toDateKey(new Date(viewDate.getFullYear(), viewDate.getMonth(), 1 - mondayOffset + index)),
  );
}

export default function DatePicker({
  id,
  value,
  onChange,
  invalid = false,
  describedBy,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    const initialDate = value ? new Date(`${value}T12:00:00`) : new Date();
    return new Date(initialDate.getFullYear(), initialDate.getMonth(), 1);
  });
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const selectedDate = value ? new Date(`${value}T12:00:00`) : null;
  const monthDays = getMonthDays(viewDate);
  const monthKey = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}`;
  const displayValue = selectedDate
    ? new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(selectedDate)
    : "Choose a date";

  function chooseDate(date: string) {
    onChange(date);
    setOpen(false);
  }

  function chooseToday() {
    const today = new Date();
    onChange(toDateKey(today));
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        onClick={() => {
          if (!open && value) {
            const selected = new Date(`${value}T12:00:00`);
            setViewDate(new Date(selected.getFullYear(), selected.getMonth(), 1));
          }
          setOpen((current) => !current);
        }}
        className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3 text-left text-sm text-text shadow-sm transition hover:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30 ${invalid ? "border-danger" : "border-border"}`}
      >
        <span className={value ? "text-text" : "text-muted"}>{displayValue}</span>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4 shrink-0 text-accent">
          <rect x="3.5" y="5" width="17" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M7.5 3v4M16.5 3v4M4 9.5h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose transaction date"
          className="absolute left-0 top-full z-40 mt-1 w-[19rem] max-w-[calc(100vw-3rem)] rounded-2xl border border-border bg-surface p-4 shadow-2xl shadow-black/30"
        >
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous calendar month"
              onClick={() => setViewDate((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1))}
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-border text-muted transition hover:border-accent/60 hover:bg-accent/10 hover:text-accent"
            >
              ‹
            </button>
            <p className="text-sm font-bold text-text">
              {new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(viewDate)}
            </p>
            <button
              type="button"
              aria-label="Next calendar month"
              onClick={() => setViewDate((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1))}
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-border text-muted transition hover:border-accent/60 hover:bg-accent/10 hover:text-accent"
            >
              ›
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wide text-muted">
            {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
              <span key={`${day}-${index}`} className="py-1">{day}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((date) => {
              const inMonth = date.startsWith(monthKey);
              const isSelected = date === value;
              const isToday = date === toDateKey(new Date());
              return (
                <button
                  key={date}
                  type="button"
                  aria-label={new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${date}T12:00:00`))}
                  aria-pressed={isSelected}
                  onClick={() => chooseDate(date)}
                  className={`flex aspect-square cursor-pointer items-center justify-center rounded-lg text-xs font-medium transition ${isSelected ? "bg-accent text-white shadow-md shadow-accent/25" : inMonth ? "text-text hover:bg-accent/15 hover:text-accent" : "text-muted/45 hover:bg-background hover:text-text"} ${isToday && !isSelected ? "ring-1 ring-primary/70" : ""}`}
                >
                  {Number(date.slice(-2))}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={chooseToday}
            className="mt-3 w-full cursor-pointer rounded-lg py-2 text-xs font-semibold text-accent transition hover:bg-accent/10"
          >
            Today
          </button>
        </div>
      )}
    </div>
  );
}
