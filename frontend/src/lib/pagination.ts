export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export interface PaginationQuery {
  page: number;
  pageSize: number;
}

export interface PaginationMetadata extends PaginationQuery {
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMetadata;
}

export const emptyPagination: PaginationMetadata = {
  page: DEFAULT_PAGE,
  pageSize: DEFAULT_PAGE_SIZE,
  total: 0,
  totalPages: 0,
};

export type PaginationEntry = 'ellipsis-start' | 'ellipsis-end' | number;

export function paginationEntries(page: number, totalPages: number): PaginationEntry[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const visiblePages = Array.from(pages)
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((left, right) => left - right);
  const entries: PaginationEntry[] = [];

  visiblePages.forEach((value, index) => {
    const previous = visiblePages[index - 1];
    if (previous !== undefined && value - previous > 1) {
      entries.push(previous === 1 ? 'ellipsis-start' : 'ellipsis-end');
    }
    entries.push(value);
  });

  return entries;
}
