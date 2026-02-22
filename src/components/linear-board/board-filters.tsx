'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Eye, EyeOff } from 'lucide-react'
import type { BoardFilters } from './board-types'

interface BoardFiltersBarProps {
  filters: BoardFilters
  onFiltersChange: (filters: BoardFilters) => void
}

export function BoardFiltersBar({ filters, onFiltersChange }: BoardFiltersBarProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter tasks..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-9 h-9"
        />
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFiltersChange({ ...filters, showHidden: !filters.showHidden })}
        className="gap-1.5 text-xs text-muted-foreground"
      >
        {filters.showHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        {filters.showHidden ? 'Hide' : 'Show'} cancelled
      </Button>
    </div>
  )
}
