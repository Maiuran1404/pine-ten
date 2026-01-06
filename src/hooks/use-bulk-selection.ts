import { useState, useCallback, useMemo } from "react";

interface UseBulkSelectionOptions<T> {
  items: T[];
  getId: (item: T) => string;
}

interface UseBulkSelectionReturn<T> {
  selectedIds: Set<string>;
  isSelected: (id: string) => boolean;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
  selectedCount: number;
  toggle: (id: string) => void;
  toggleAll: () => void;
  selectAll: () => void;
  clearSelection: () => void;
  getSelectedItems: () => T[];
}

/**
 * Hook for managing bulk selection state in tables/lists.
 * @param options - Configuration for the bulk selection
 * @returns Bulk selection state and handlers
 */
export function useBulkSelection<T>({
  items,
  getId,
}: UseBulkSelectionOptions<T>): UseBulkSelectionReturn<T> {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const isAllSelected = useMemo(
    () => items.length > 0 && selectedIds.size === items.length,
    [items.length, selectedIds.size]
  );

  const isPartiallySelected = useMemo(
    () => selectedIds.size > 0 && selectedIds.size < items.length,
    [items.length, selectedIds.size]
  );

  const selectedCount = selectedIds.size;

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(getId)));
    }
  }, [isAllSelected, items, getId]);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map(getId)));
  }, [items, getId]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const getSelectedItems = useCallback(
    () => items.filter((item) => selectedIds.has(getId(item))),
    [items, selectedIds, getId]
  );

  return {
    selectedIds,
    isSelected,
    isAllSelected,
    isPartiallySelected,
    selectedCount,
    toggle,
    toggleAll,
    selectAll,
    clearSelection,
    getSelectedItems,
  };
}
