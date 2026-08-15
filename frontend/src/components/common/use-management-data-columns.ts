import { useState } from 'react';
import type { ManagementDataColumn } from '@/components/common/management-data-list';

export function useManagementDataColumns<T>(columns: ManagementDataColumn<T>[]) {
  const [hiddenColumnKeys, setHiddenColumnKeys] = useState<ReadonlySet<string>>(() => new Set());
  const fixedColumnKeys = new Set(
    columns
      .filter((column, index) => index === 0 || column.hideable === false)
      .map((column) => column.key),
  );
  const columnOptions = columns
    .filter((column) => !fixedColumnKeys.has(column.key))
    .map((column) => ({ key: column.key, label: column.label }));
  const visibleColumnKeys = new Set(
    columnOptions.filter((column) => !hiddenColumnKeys.has(column.key)).map((column) => column.key),
  );

  function setColumnVisibility(columnKey: string, visible: boolean) {
    setHiddenColumnKeys((current) => {
      const next = new Set(current);

      if (visible) {
        next.delete(columnKey);
      } else {
        next.add(columnKey);
      }

      return next;
    });
  }

  return {
    columnOptions,
    isColumnVisible: (columnKey: string) => !hiddenColumnKeys.has(columnKey),
    setColumnVisibility,
    visibleColumnKeys,
    visibleColumns: columns.filter(
      (column) => fixedColumnKeys.has(column.key) || !hiddenColumnKeys.has(column.key),
    ),
  };
}
