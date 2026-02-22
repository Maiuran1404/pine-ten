'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { UserPlus, Plus, Copy, Check, RefreshCw, XCircle, Link2, Users } from 'lucide-react'

interface ArtistInvite {
  id: string
  token: string
  email: string
  name: string
  whatsappNumber: string | null
  note: string | null
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED'
  invitedBy: string | null
  acceptedBy: string | null
  acceptedAt: string | null
  expiresAt: string | null
  createdAt: string
  inviterName: string | null
  inviterEmail: string | null
  acceptedByName: string | null
  acceptedByEmail: string | null
}

interface Stats {
  total: number
  pending: number
  accepted: number
  expired: number
}

function getStatusBadge(status: string): {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
} {
  switch (status) {
    case 'PENDING':
      return { label: 'Pending', variant: 'outline' }
    case 'ACCEPTED':
      return { label: 'Accepted', variant: 'default' }
    case 'EXPIRED':
      return { label: 'Expired', variant: 'secondary' }
    default:
      return { label: status, variant: 'outline' }
  }
}

export default function ArtistInvitesPage() {
  const [invites, setInvites] = useState<ArtistInvite[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, accepted: 0, expired: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false)
  const [selectedInvite, setSelectedInvite] = useState<ArtistInvite | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Single invite form
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formWhatsapp, setFormWhatsapp] = useState('')
  const [formNote, setFormNote] = useState('')

  // Bulk invite form
  const [bulkText, setBulkText] = useState('')

  useEffect(() => {
    fetchInvites()
  }, [])

  const fetchInvites = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/artist-invites')
      if (response.ok) {
        const data = await response.json()
        setInvites(data.data?.invites || [])
        setStats(data.data?.stats || { total: 0, pending: 0, accepted: 0, expired: 0 })
      }
    } catch (error) {
      console.error('Failed to fetch artist invites:', error)
      toast.error('Failed to load artist invites')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateInvite = async () => {
    if (!formName.trim() || !formEmail.trim()) {
      toast.error('Name and email are required')
      return
    }
    setIsCreating(true)
    try {
      const response = await fetch('/api/admin/artist-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invites: [
            {
              name: formName.trim(),
              email: formEmail.trim(),
              whatsappNumber: formWhatsapp.trim() || undefined,
              note: formNote.trim() || undefined,
            },
          ],
        }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to create invite')
      }
      const result = await response.json()
      const link = result.data?.invites?.[0]?.link
      if (link) {
        navigator.clipboard.writeText(link)
        toast.success('Invite created! Link copied to clipboard.')
      } else {
        toast.success('Invite created successfully')
      }
      setCreateDialogOpen(false)
      resetForm()
      fetchInvites()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create invite')
    } finally {
      setIsCreating(false)
    }
  }

  const handleBulkInvite = async () => {
    const lines = bulkText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    if (lines.length === 0) {
      toast.error('Please enter at least one invite')
      return
    }

    const inviteInputs = lines.map((line) => {
      const parts = line.split(',').map((p) => p.trim())
      return {
        name: parts[0] || '',
        email: parts[1] || '',
        whatsappNumber: parts[2] || undefined,
      }
    })

    const invalid = inviteInputs.filter((i) => !i.name || !i.email)
    if (invalid.length > 0) {
      toast.error(
        `${invalid.length} line(s) missing name or email. Format: Name, Email, WhatsApp (optional)`
      )
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/admin/artist-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invites: inviteInputs }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to create invites')
      }
      toast.success(`${inviteInputs.length} invite(s) created successfully`)
      setBulkDialogOpen(false)
      setBulkText('')
      fetchInvites()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create invites')
    } finally {
      setIsCreating(false)
    }
  }

  const handleRevoke = async () => {
    if (!selectedInvite) return
    setIsRevoking(true)
    try {
      const response = await fetch(`/api/admin/artist-invites?id=${selectedInvite.id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to revoke invite')
      }
      toast.success('Invite revoked')
      setRevokeDialogOpen(false)
      setSelectedInvite(null)
      fetchInvites()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to revoke invite')
    } finally {
      setIsRevoking(false)
    }
  }

  const copyLink = (invite: ArtistInvite) => {
    const link = `${window.location.origin}/join/${invite.token}`
    navigator.clipboard.writeText(link)
    setCopiedId(invite.id)
    toast.success('Invite link copied')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const resetForm = () => {
    setFormName('')
    setFormEmail('')
    setFormWhatsapp('')
    setFormNote('')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Artist Invites</h1>
          <p className="text-muted-foreground">
            Create personalized invite links for artists to join Crafted
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchInvites}
            disabled={isLoading}
            className="cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => setBulkDialogOpen(true)}
            className="cursor-pointer"
          >
            <Users className="h-4 w-4 mr-2" />
            Bulk Invite
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            Invite Artist
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Invites</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{stats.expired}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Invites</CardTitle>
          <CardDescription>Manage artist invitations</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : invites.length === 0 ? (
            <div className="text-center py-8">
              <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No artist invites yet</p>
              <Button onClick={() => setCreateDialogOpen(true)} className="mt-4 cursor-pointer">
                <Plus className="h-4 w-4 mr-2" />
                Invite Your First Artist
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited By</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => {
                  const status = getStatusBadge(invite.status)
                  return (
                    <TableRow key={invite.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{invite.name}</span>
                          {invite.note && (
                            <p className="text-xs text-muted-foreground mt-0.5">{invite.note}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{invite.email}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                        {invite.status === 'ACCEPTED' && invite.acceptedByName && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            by {invite.acceptedByName}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {invite.inviterName || '\u2014'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(invite.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-pointer"
                            onClick={() => copyLink(invite)}
                            title="Copy invite link"
                          >
                            {copiedId === invite.id ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Link2 className="h-4 w-4" />
                            )}
                          </Button>
                          {invite.whatsappNumber && invite.status === 'PENDING' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 cursor-pointer"
                              onClick={() => {
                                const link = `${window.location.origin}/join/${invite.token}`
                                const waUrl = `https://wa.me/${invite.whatsappNumber?.replace(/[^0-9+]/g, '')}?text=${encodeURIComponent(
                                  `Hi ${invite.name}! You've been invited to join Crafted as a designer. Sign up here: ${link}`
                                )}`
                                window.open(waUrl, '_blank')
                              }}
                              title="Send via WhatsApp"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                          {invite.status === 'PENDING' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive cursor-pointer"
                              onClick={() => {
                                setSelectedInvite(invite)
                                setRevokeDialogOpen(true)
                              }}
                              title="Revoke invite"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
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

      {/* Create Invite Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invite Artist
            </DialogTitle>
            <DialogDescription>
              Create a personalized invite link for an artist to join Crafted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Artist Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Jane Smith"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="jane@example.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp Number (optional)</Label>
              <Input
                id="whatsapp"
                placeholder="+1 234 567 8900"
                value={formWhatsapp}
                onChange={(e) => setFormWhatsapp(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                If provided, the invite link will also be sent via WhatsApp
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Internal Note (optional)</Label>
              <Input
                id="note"
                placeholder="e.g., motion designer for Project X"
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
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
            <Button onClick={handleCreateInvite} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Invite Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Bulk Invite Artists
            </DialogTitle>
            <DialogDescription>
              Paste multiple artists, one per line. Format: Name, Email, WhatsApp (optional)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder={`Jane Smith, jane@example.com, +1234567890\nJohn Doe, john@example.com\nAlex Brown, alex@example.com, +44789012345`}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {bulkText.split('\n').filter((l) => l.trim()).length} invite(s) will be created
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBulkDialogOpen(false)
                setBulkText('')
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button onClick={handleBulkInvite} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Send Invites'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirm Dialog */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invite</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke the invite for <strong>{selectedInvite?.name}</strong>{' '}
              ({selectedInvite?.email})? The invite link will no longer work.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={isRevoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRevoking ? 'Revoking...' : 'Revoke'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
