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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Ticket, Plus, Trash2, Percent, Copy, Check, RefreshCw } from 'lucide-react'

interface PromotionCode {
  id: string
  code: string
  active: boolean
  timesRedeemed: number
  maxRedemptions: number | null
  expiresAt: string | null
}

interface Coupon {
  id: string
  name: string
  percentOff: number | null
  amountOff: number | null
  currency: string | null
  duration: string
  durationInMonths: number | null
  maxRedemptions: number | null
  timesRedeemed: number
  valid: boolean
  createdAt: string
  promotionCodes: PromotionCode[]
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formDiscountType, setFormDiscountType] = useState<'percent' | 'amount'>('percent')
  const [formPercentOff, setFormPercentOff] = useState(10)
  const [formAmountOff, setFormAmountOff] = useState(10)
  const [formDuration, setFormDuration] = useState<'forever' | 'once' | 'repeating'>('forever')
  const [formCode, setFormCode] = useState('')

  useEffect(() => {
    fetchCoupons()
  }, [])

  const fetchCoupons = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/coupons')
      if (response.ok) {
        const data = await response.json()
        setCoupons(data.data?.coupons || [])
      }
    } catch (error) {
      console.error('Failed to fetch coupons:', error)
      toast.error('Failed to load coupons')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCoupon = async () => {
    if (!formName) {
      toast.error('Please enter a coupon name')
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          percentOff: formDiscountType === 'percent' ? formPercentOff : undefined,
          amountOff: formDiscountType === 'amount' ? formAmountOff : undefined,
          duration: formDuration,
          code: formCode || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create coupon')
      }

      toast.success('Coupon created successfully')
      setCreateDialogOpen(false)
      resetForm()
      fetchCoupons()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create coupon')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteCoupon = async () => {
    if (!selectedCoupon) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/coupons?id=${selectedCoupon.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete coupon')
      }

      toast.success('Coupon deleted successfully')
      setDeleteDialogOpen(false)
      setSelectedCoupon(null)
      fetchCoupons()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete coupon')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleTogglePromoCode = async (promoCodeId: string, currentActive: boolean) => {
    try {
      const response = await fetch('/api/admin/coupons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promotionCodeId: promoCodeId,
          active: !currentActive,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update promotion code')
      }

      toast.success(`Promotion code ${!currentActive ? 'activated' : 'deactivated'}`)
      fetchCoupons()
    } catch (_error) {
      toast.error('Failed to update promotion code')
    }
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success('Code copied to clipboard')
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const resetForm = () => {
    setFormName('')
    setFormDiscountType('percent')
    setFormPercentOff(10)
    setFormAmountOff(10)
    setFormDuration('forever')
    setFormCode('')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.percentOff) {
      return `${coupon.percentOff}% off`
    }
    if (coupon.amountOff) {
      return `$${(coupon.amountOff / 100).toFixed(2)} off`
    }
    return 'N/A'
  }

  const activeCoupons = coupons.filter((c) => c.valid)
  const totalRedemptions = coupons.reduce((sum, c) => sum + c.timesRedeemed, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Coupons</h1>
          <p className="text-muted-foreground">Manage discount coupons and promotion codes</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchCoupons}
            disabled={isLoading}
            className="cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            Create Coupon
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Coupons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coupons.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Coupons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCoupons.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Redemptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRedemptions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Coupons Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Coupons</CardTitle>
          <CardDescription>View and manage your Stripe coupons and promotion codes</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-8">
              <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No coupons found</p>
              <Button onClick={() => setCreateDialogOpen(true)} className="mt-4 cursor-pointer">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Coupon
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Promo Codes</TableHead>
                  <TableHead>Redemptions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{coupon.name || coupon.id}</p>
                        <p className="text-xs text-muted-foreground font-mono">{coupon.id}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                        <Percent className="h-3 w-3" />
                        {formatDiscount(coupon)}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{coupon.duration}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {coupon.promotionCodes.length === 0 ? (
                          <span className="text-muted-foreground text-sm">None</span>
                        ) : (
                          coupon.promotionCodes.map((promo) => (
                            <div key={promo.id} className="flex items-center gap-2">
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {promo.code}
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 cursor-pointer"
                                onClick={() => copyToClipboard(promo.code)}
                              >
                                {copiedCode === promo.code ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                              <Switch
                                checked={promo.active}
                                onCheckedChange={() =>
                                  handleTogglePromoCode(promo.id, promo.active)
                                }
                                className="scale-75"
                              />
                            </div>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{coupon.timesRedeemed}</span>
                      {coupon.maxRedemptions && (
                        <span className="text-muted-foreground">/{coupon.maxRedemptions}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={coupon.valid ? 'default' : 'secondary'}>
                        {coupon.valid ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(coupon.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive cursor-pointer"
                        onClick={() => {
                          setSelectedCoupon(coupon)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Coupon Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Create Coupon
            </DialogTitle>
            <DialogDescription>Create a new discount coupon for your customers</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Coupon Name</Label>
              <Input
                id="name"
                placeholder="e.g., Summer Sale 20%"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Discount Type</Label>
              <Select
                value={formDiscountType}
                onValueChange={(v) => setFormDiscountType(v as 'percent' | 'amount')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percentage Off</SelectItem>
                  <SelectItem value="amount">Fixed Amount Off</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formDiscountType === 'percent' ? (
              <div className="space-y-2">
                <Label htmlFor="percentOff">Percentage Off</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="percentOff"
                    type="number"
                    min="1"
                    max="100"
                    value={formPercentOff}
                    onChange={(e) => setFormPercentOff(parseInt(e.target.value) || 0)}
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="amountOff">Amount Off (AUD)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    id="amountOff"
                    type="number"
                    min="1"
                    value={formAmountOff}
                    onChange={(e) => setFormAmountOff(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Duration</Label>
              <Select
                value={formDuration}
                onValueChange={(v) => setFormDuration(v as 'forever' | 'once' | 'repeating')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="forever">Forever (all purchases)</SelectItem>
                  <SelectItem value="once">Once (single use)</SelectItem>
                  <SelectItem value="repeating">Repeating</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Promotion Code (optional)</Label>
              <Input
                id="code"
                placeholder="e.g., SUMMER20"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to create coupon without a promo code
              </p>
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
            <Button onClick={handleCreateCoupon} disabled={isCreating || !formName}>
              {isCreating ? 'Creating...' : 'Create Coupon'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Coupon</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedCoupon?.name || selectedCoupon?.id}
              &quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCoupon}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
