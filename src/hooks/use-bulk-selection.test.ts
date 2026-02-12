import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBulkSelection } from './use-bulk-selection'

interface TestItem {
  id: string
  name: string
}

const testItems: TestItem[] = [
  { id: '1', name: 'Item 1' },
  { id: '2', name: 'Item 2' },
  { id: '3', name: 'Item 3' },
  { id: '4', name: 'Item 4' },
]

const getId = (item: TestItem) => item.id

describe('useBulkSelection', () => {
  it('should start with empty selection', () => {
    const { result } = renderHook(() => useBulkSelection({ items: testItems, getId }))

    expect(result.current.selectedCount).toBe(0)
    expect(result.current.isAllSelected).toBe(false)
    expect(result.current.isPartiallySelected).toBe(false)
  })

  it('should toggle an item on', () => {
    const { result } = renderHook(() => useBulkSelection({ items: testItems, getId }))

    act(() => {
      result.current.toggle('1')
    })

    expect(result.current.isSelected('1')).toBe(true)
    expect(result.current.selectedCount).toBe(1)
  })

  it('should toggle an item off', () => {
    const { result } = renderHook(() => useBulkSelection({ items: testItems, getId }))

    act(() => {
      result.current.toggle('1')
    })
    expect(result.current.isSelected('1')).toBe(true)

    act(() => {
      result.current.toggle('1')
    })
    expect(result.current.isSelected('1')).toBe(false)
    expect(result.current.selectedCount).toBe(0)
  })

  it('should select multiple items', () => {
    const { result } = renderHook(() => useBulkSelection({ items: testItems, getId }))

    act(() => {
      result.current.toggle('1')
      result.current.toggle('3')
    })

    expect(result.current.isSelected('1')).toBe(true)
    expect(result.current.isSelected('2')).toBe(false)
    expect(result.current.isSelected('3')).toBe(true)
    expect(result.current.selectedCount).toBe(2)
  })

  it('should detect partial selection', () => {
    const { result } = renderHook(() => useBulkSelection({ items: testItems, getId }))

    act(() => {
      result.current.toggle('1')
    })

    expect(result.current.isPartiallySelected).toBe(true)
    expect(result.current.isAllSelected).toBe(false)
  })

  it('should detect all selected', () => {
    const { result } = renderHook(() => useBulkSelection({ items: testItems, getId }))

    act(() => {
      result.current.selectAll()
    })

    expect(result.current.isAllSelected).toBe(true)
    expect(result.current.isPartiallySelected).toBe(false)
    expect(result.current.selectedCount).toBe(4)
  })

  it('should select all items with selectAll', () => {
    const { result } = renderHook(() => useBulkSelection({ items: testItems, getId }))

    act(() => {
      result.current.selectAll()
    })

    for (const item of testItems) {
      expect(result.current.isSelected(item.id)).toBe(true)
    }
  })

  it('should clear selection', () => {
    const { result } = renderHook(() => useBulkSelection({ items: testItems, getId }))

    act(() => {
      result.current.selectAll()
    })
    expect(result.current.selectedCount).toBe(4)

    act(() => {
      result.current.clearSelection()
    })
    expect(result.current.selectedCount).toBe(0)
    expect(result.current.isAllSelected).toBe(false)
  })

  it('toggleAll should select all when nothing is selected', () => {
    const { result } = renderHook(() => useBulkSelection({ items: testItems, getId }))

    act(() => {
      result.current.toggleAll()
    })

    expect(result.current.isAllSelected).toBe(true)
    expect(result.current.selectedCount).toBe(4)
  })

  it('toggleAll should deselect all when all are selected', () => {
    const { result } = renderHook(() => useBulkSelection({ items: testItems, getId }))

    act(() => {
      result.current.selectAll()
    })
    expect(result.current.isAllSelected).toBe(true)

    act(() => {
      result.current.toggleAll()
    })
    expect(result.current.selectedCount).toBe(0)
  })

  it('toggleAll should select all when partially selected', () => {
    const { result } = renderHook(() => useBulkSelection({ items: testItems, getId }))

    act(() => {
      result.current.toggle('1')
    })
    expect(result.current.isPartiallySelected).toBe(true)

    act(() => {
      result.current.toggleAll()
    })
    expect(result.current.isAllSelected).toBe(true)
  })

  it('should return selected items via getSelectedItems', () => {
    const { result } = renderHook(() => useBulkSelection({ items: testItems, getId }))

    act(() => {
      result.current.toggle('2')
      result.current.toggle('4')
    })

    const selected = result.current.getSelectedItems()
    expect(selected).toHaveLength(2)
    expect(selected.map((i) => i.id)).toContain('2')
    expect(selected.map((i) => i.id)).toContain('4')
  })

  it('should return empty array from getSelectedItems when nothing selected', () => {
    const { result } = renderHook(() => useBulkSelection({ items: testItems, getId }))

    expect(result.current.getSelectedItems()).toEqual([])
  })

  it('should expose selectedIds as a Set', () => {
    const { result } = renderHook(() => useBulkSelection({ items: testItems, getId }))

    act(() => {
      result.current.toggle('1')
    })

    expect(result.current.selectedIds).toBeInstanceOf(Set)
    expect(result.current.selectedIds.has('1')).toBe(true)
  })

  it('should handle empty items array', () => {
    const { result } = renderHook(() => useBulkSelection({ items: [] as TestItem[], getId }))

    expect(result.current.selectedCount).toBe(0)
    expect(result.current.isAllSelected).toBe(false)
    expect(result.current.isPartiallySelected).toBe(false)
  })

  it('should not consider empty items as all selected', () => {
    const { result } = renderHook(() => useBulkSelection({ items: [] as TestItem[], getId }))

    // items.length === 0 so isAllSelected should be false
    expect(result.current.isAllSelected).toBe(false)
  })
})
