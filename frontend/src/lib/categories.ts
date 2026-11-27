export type TransactionType = "income" | "expense";

export type CategoryGroup = {
  value: string;
  label: string;
  children: { value: string; label: string }[];
};

export const CATEGORY_GROUPS: Record<TransactionType, CategoryGroup[]> = {
  income: [
    {
      value: "work",
      label: "Work",
      children: [
        { value: "salary", label: "Salary" },
        { value: "freelance", label: "Freelance" },
        { value: "business", label: "Business" },
      ],
    },
    {
      value: "investments",
      label: "Investments",
      children: [
        { value: "dividends", label: "Dividends" },
        { value: "interest", label: "Interest" },
      ],
    },
    {
      value: "rental-income",
      label: "Rental income",
      children: [
        { value: "rent", label: "Rent" },
        { value: "short-stay", label: "Short stays" },
      ],
    },
    {
      value: "gifts-rewards",
      label: "Gifts & rewards",
      children: [
        { value: "gift", label: "Gift" },
        { value: "cashback", label: "Cashback" },
      ],
    },
    { value: "other", label: "Other", children: [] },
  ],
  expense: [
    {
      value: "home",
      label: "Home",
      children: [
        { value: "rent", label: "Rent" },
        { value: "utilities", label: "Utilities" },
        { value: "internet", label: "Internet" },
      ],
    },
    {
      value: "food",
      label: "Food",
      children: [
        { value: "groceries", label: "Groceries" },
        { value: "dining", label: "Dining" },
      ],
    },
    {
      value: "transport",
      label: "Transport",
      children: [
        { value: "public-transport", label: "Public transport" },
        { value: "fuel", label: "Fuel" },
        { value: "taxi", label: "Taxi" },
      ],
    },
    {
      value: "personal",
      label: "Personal",
      children: [
        { value: "health", label: "Health" },
        { value: "clothing", label: "Clothing" },
        { value: "education", label: "Education" },
      ],
    },
    {
      value: "leisure",
      label: "Leisure",
      children: [
        { value: "entertainment", label: "Entertainment" },
        { value: "subscriptions", label: "Subscriptions" },
        { value: "travel", label: "Travel" },
      ],
    },
    { value: "other", label: "Other", children: [] },
  ],
};

const legacyCategoryAliases: Record<
  string,
  { type: TransactionType; group: string; detail: string }
> = {
  housing: { type: "expense", group: "home", detail: "rent" },
  food: { type: "expense", group: "food", detail: "groceries" },
  groceries: { type: "expense", group: "food", detail: "groceries" },
  restaurants: { type: "expense", group: "food", detail: "dining" },
  dining: { type: "expense", group: "food", detail: "dining" },
  transport: { type: "expense", group: "transport", detail: "public-transport" },
  utilities: { type: "expense", group: "home", detail: "utilities" },
  subscriptions: { type: "expense", group: "leisure", detail: "subscriptions" },
  health: { type: "expense", group: "personal", detail: "health" },
  clothing: { type: "expense", group: "personal", detail: "clothing" },
  entertainment: { type: "expense", group: "leisure", detail: "entertainment" },
  education: { type: "expense", group: "personal", detail: "education" },
  travel: { type: "expense", group: "leisure", detail: "travel" },
};

export function makeCategoryValue(
  type: TransactionType,
  groupValue: string,
  detailValue: string,
  customValue: string,
) {
  const group = CATEGORY_GROUPS[type].find((item) => item.value === groupValue);
  if (!group) return "";
  if (group.value === "other") return customValue.trim();

  const detail = group.children.find((item) => item.value === detailValue);
  return detail ? `${group.label} / ${detail.label}` : "";
}

export function getCategorySelection(type: TransactionType, value: string) {
  const normalized = value.trim().toLocaleLowerCase();
  const legacy = legacyCategoryAliases[normalized];
  if (legacy?.type === type) {
    return { group: legacy.group, detail: legacy.detail, custom: "" };
  }

  for (const group of CATEGORY_GROUPS[type]) {
    for (const detail of group.children) {
      const fullValue = `${group.label} / ${detail.label}`.toLocaleLowerCase();
      if (
        normalized === fullValue ||
        normalized === detail.label.toLocaleLowerCase() ||
        normalized === detail.value
      ) {
        return {
          group: group.value,
          detail: detail.value,
          custom: "",
        };
      }
    }
  }

  return { group: "other", detail: "", custom: value };
}

export function getCategoryGroup(value: string) {
  const normalized = value.trim().toLocaleLowerCase();
  const [groupLabel, detailLabel] = value.split(" / ");

  if (detailLabel) return groupLabel;
  const legacy = legacyCategoryAliases[normalized];
  if (legacy) {
    return (
      CATEGORY_GROUPS[legacy.type].find((group) => group.value === legacy.group)
        ?.label ?? "Other"
    );
  }

  for (const groups of Object.values(CATEGORY_GROUPS)) {
    for (const group of groups) {
      if (
        group.children.some(
          (detail) =>
            normalized === detail.label.toLocaleLowerCase() ||
            normalized === detail.value,
        )
      ) {
        return group.label;
      }
    }
  }

  return "Other";
}

export function formatCategory(value: string) {
  const parts = value.split(" / ");
  if (parts.length === 2) return `${parts[0]} · ${parts[1]}`;
  return value
    .split(/[_-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
