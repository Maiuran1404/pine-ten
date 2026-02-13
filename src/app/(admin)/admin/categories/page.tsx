'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadingSpinner } from '@/components/shared/loading'
import { Plus, Pencil, Tags, Coins, CheckCircle2, XCircle } from 'lucide-react'
import { StatCard } from '@/components/admin/stat-card'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  baseCredits: number
  isActive: boolean
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    baseCredits: 1,
    isActive: true,
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.data?.categories || [])
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category)
      setFormData({
        name: category.name,
        description: category.description || '',
        baseCredits: category.baseCredits,
        isActive: category.isActive,
      })
    } else {
      setEditingCategory(null)
      setFormData({
        name: '',
        description: '',
        baseCredits: 1,
        isActive: true,
      })
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : '/api/admin/categories'

      const response = await fetch(url, {
        method: editingCategory ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('Failed to save')

      toast.success(editingCategory ? 'Category updated!' : 'Category created!')
      setDialogOpen(false)
      fetchCategories()
    } catch {
      toast.error('Failed to save category')
    } finally {
      setIsSaving(false)
    }
  }

  const activeCount = categories.filter((c) => c.isActive).length
  const inactiveCount = categories.filter((c) => !c.isActive).length
  const avgCredits =
    categories.length > 0
      ? Math.round(categories.reduce((sum, c) => sum + c.baseCredits, 0) / categories.length)
      : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Task Categories</h1>
          <p className="text-muted-foreground">Manage task types and their pricing</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
              <DialogDescription>
                {editingCategory ? 'Update the category details' : 'Create a new task category'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Static Ads"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Describe this category..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="baseCredits">Base Credits</Label>
                <Input
                  id="baseCredits"
                  type="number"
                  min="1"
                  value={formData.baseCredits}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      baseCredits: parseInt(e.target.value) || 1,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Minimum credits required for tasks in this category
                </p>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Active</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isActive: checked }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <LoadingSpinner size="sm" /> : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Categories"
            value={categories.length}
            subtext="Task types available"
            icon={Tags}
          />
          <StatCard
            label="Active"
            value={activeCount}
            subtext="Available for new tasks"
            icon={CheckCircle2}
            trend="up"
          />
          <StatCard
            label="Inactive"
            value={inactiveCount}
            subtext={inactiveCount === 0 ? 'All categories active' : 'Hidden from users'}
            icon={XCircle}
            trend={inactiveCount === 0 ? 'up' : 'warning'}
          />
          <StatCard
            label="Avg Base Credits"
            value={avgCredits}
            subtext="Per category"
            icon={Coins}
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>
            Task categories determine pricing and freelancer matching
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No categories yet. Create your first one!
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Base Credits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {category.description || '-'}
                    </TableCell>
                    <TableCell>{category.baseCredits}</TableCell>
                    <TableCell>
                      <span
                        className={category.isActive ? 'text-green-600' : 'text-muted-foreground'}
                      >
                        {category.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(category)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
