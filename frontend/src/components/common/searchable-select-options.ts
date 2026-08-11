export interface SearchableSelectOption {
  description?: string;
  keywords?: string[];
  label: string;
  value: string;
}

export function filterSearchableSelectOptions(
  options: SearchableSelectOption[],
  query: string,
): SearchableSelectOption[] {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return options;

  return options.filter((option) =>
    normalizeSearch(
      [option.label, option.value, option.description, ...(option.keywords ?? [])]
        .filter(Boolean)
        .join(' '),
    ).includes(normalizedQuery),
  );
}

function normalizeSearch(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase();
}
