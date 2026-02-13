'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Switch } from '@/components/ui/switch'
import { KeyRound, Plus, Trash2, Copy, Check, RefreshCw } from 'lucide-react'

interface InviteCode {
  id: string
  code: string
  description: string | null
  maxUses: number | null
  usedCount: number
  expiresAt: string | null
  isActive: boolean
  createdBy: string | null
  createdAt: string
  creatorName: string | null
  creatorEmail: string | null
}

function getCodeStatus(code: InviteCode): {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
} {
  if (!code.isActive) return { label: 'Inactive', variant: 'secondary' }
  if (code.expiresAt && new Date(code.expiresAt) < new Date())
    return { label: 'Expired', variant: 'destructive' }
  if (code.maxUses && code.usedCount >= code.maxUses)
    return { label: 'Exhausted', variant: 'outline' }
  return { label: 'Active', variant: 'default' }
}

export default function InviteCodesPage() {
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCode, setSelectedCode] = useState<InviteCode | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [formCode, setFormCode] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formMaxUses, setFormMaxUses] = useState('')
  const [formExpiresAt, setFormExpiresAt] = useState('')

  useEffect(() => {
    fetchCodes()
  }, [])

  const fetchCodes = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/invite-codes')
      if (response.ok) {
        const data = await response.json()
        setCodes(data.codes || [])
      }
    } catch (error) {
      console.error('Failed to fetch invite codes:', error)
      toast.error('Failed to load invite codes')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCode = async () => {
    setIsCreating(true)
    try {
      const response = await fetch('/api/admin/invite-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formCode || undefined,
          description: formDescription || undefined,
          maxUses: formMaxUses ? parseInt(formMaxUses) : undefined,
          expiresAt: formExpiresAt ? new Date(formExpiresAt).toISOString() : undefined,
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create invite code')
      }
      toast.success('Invite code created successfully')
      setCreateDialogOpen(false)
      resetForm()
      fetchCodes()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create invite code')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteCode = async () => {
    if (!selectedCode) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/invite-codes?id=${selectedCode.id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete invite code')
      }
      toast.success('Invite code deactivated')
      setDeleteDialogOpen(false)
      setSelectedCode(null)
      fetchCodes()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete invite code')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleActive = async (code: InviteCode) => {
    try {
      const response = await fetch(`/api/admin/invite-codes?id=${code.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !code.isActive }),
      })
      if (!response.ok) throw new Error('Failed to update invite code')
      toast.success(`Invite code ${!code.isActive ? 'activated' : 'deactivated'}`)
      fetchCodes()
    } catch {
      toast.error('Failed to update invite code')
    }
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success('Code copied to clipboard')
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const resetForm = () => {
    setFormCode('')
    setFormDescription('')
    setFormMaxUses('')
    setFormExpiresAt('')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const activeCodes = codes.filter((c) => getCodeStatus(c).label === 'Active')
  const totalUsages = codes.reduce((sum, c) => sum + c.usedCount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invite Codes</h1>
          <p className="text-muted-foreground">Manage early access invite codes</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchCodes}
            disabled={isLoading}
            className="cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            Create Code
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{codes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCodes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Usages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsages}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Invite Codes</CardTitle>
          <CardDescription>View and manage early access invite codes</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : codes.length === 0 ? (
            <div className="text-center py-8">
              <KeyRound className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No invite codes found</p>
              <Button onClick={() => setCreateDialogOpen(true)} className="mt-4 cursor-pointer">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Invite Code
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code) => {
                  const status = getCodeStatus(code)
                  return (
                    <TableRow key={code.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                            {code.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 cursor-pointer"
                            onClick={() => copyToClipboard(code.code)}
                          >
                            {copiedCode === code.code ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {code.description || '\u2014'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{code.usedCount}</span>
                        {code.maxUses ? (
                          <span className="text-muted-foreground">/{code.maxUses}</span>
                        ) : (
                          <span className="text-muted-foreground">/&infin;</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {code.creatorName || code.creatorEmail || '\u2014'}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(code.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Switch
                            checked={code.isActive}
                            onCheckedChange={() => handleToggleActive(code)}
                            className="scale-75"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive cursor-pointer"
                            onClick={() => {
                              setSelectedCode(code)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Create Invite Code
            </DialogTitle>
            <DialogDescription>
              Create a new early access invite code. Leave code empty to auto-generate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code (optional)</Label>
              <Input
                id="code"
                placeholder="e.g., PARTNER-2024 (auto-generates if empty)"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
              />
              <p className="text-xs text-muted-foreground">
                Auto-generates a CRAFT-XXXX code if left empty
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="e.g., Partner referral code"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxUses">Max Uses (optional)</Label>
              <Input
                id="maxUses"
                type="number"
                min="1"
                placeholder="Unlimited if empty"
                value={formMaxUses}
                onChange={(e) => setFormMaxUses(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expires At (optional)</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={formExpiresAt}
                onChange={(e) => setFormExpiresAt(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false)
                resetForm()
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateCode} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Code'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Invite Code</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate &quot;{selectedCode?.code}&quot;? The code will no
              longer be usable for new registrations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCode}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deactivating...' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
