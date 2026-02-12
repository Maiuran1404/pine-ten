import Link from 'next/link'
import { FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function TaskNotFound() {
  return (
    <div className="flex h-full min-h-[400px] w-full items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <FileQuestion className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Task not found</h2>
        <p className="text-sm text-muted-foreground">
          The task you are looking for does not exist or has been removed.
        </p>
        <Button asChild variant="outline">
          <Link href="/admin/tasks">Back to Tasks</Link>
        </Button>
      </div>
    </div>
  )
}
