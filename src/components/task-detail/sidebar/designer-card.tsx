'use client'

import { Clock } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TaskDetailData } from '@/components/task-detail/types'

interface DesignerCardProps {
  freelancer: TaskDetailData['freelancer']
  assignedAt: string | null
  status: string
}

export function DesignerCard({ freelancer, assignedAt, status }: DesignerCardProps) {
  const isWaiting = !freelancer && (status === 'PENDING' || status === 'OFFERED')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Designer</CardTitle>
      </CardHeader>
      <CardContent>
        {freelancer ? (
          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarImage src={freelancer.image ?? undefined} alt={freelancer.name} />
              <AvatarFallback>
                {freelancer.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{freelancer.name}</p>
              {assignedAt && (
                <p className="text-xs text-muted-foreground">
                  Assigned{' '}
                  {new Date(assignedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
          </div>
        ) : isWaiting ? (
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <Clock className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Finding Designer</p>
              <p className="text-xs text-muted-foreground">Matching you with the best designer</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No designer assigned</p>
        )}
      </CardContent>
    </Card>
  )
}
