'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import type { TaskDetailData } from '@/components/task-detail/types'
import { ProjectLaunchpad } from '@/components/task-launch/project-launchpad'

export default function LaunchedPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.id as string

  const [task, setTask] = useState<TaskDetailData | null>(null)
  const [previousCredits, setPreviousCredits] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Ref guard prevents React strict mode double-fire from redirecting away
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (!taskId) return
    if (hasInitialized.current) return
    hasInitialized.current = true

    // Check if already seen — redirect to task detail
    const seenKey = `task-${taskId}-launched-seen`
    if (sessionStorage.getItem(seenKey)) {
      router.replace(`/dashboard/tasks/${taskId}`)
      return
    }

    // Read previous credits before submission
    const storedCredits = sessionStorage.getItem('crafted-previous-credits')
    if (storedCredits) {
      setPreviousCredits(parseInt(storedCredits, 10))
    }

    // Mark as seen only after a delay — ensures the page is visible first
    setTimeout(() => {
      sessionStorage.setItem(seenKey, 'true')
    }, 2000)

    // Fetch task data
    const fetchTask = async () => {
      try {
        const response = await fetch(`/api/tasks/${taskId}`)
        if (response.ok) {
          const data = await response.json()
          setTask(data.data?.task ?? null)
        }
      } catch (err) {
        console.error('Failed to fetch task for launchpad:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTask()
  }, [taskId, router])

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="w-full max-w-lg space-y-6 px-6">
          <Skeleton className="mx-auto h-16 w-16 rounded-full" />
          <Skeleton className="mx-auto h-8 w-48" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (!task) {
    // Fallback — redirect to tasks list
    router.replace('/dashboard/tasks')
    return null
  }

  return <ProjectLaunchpad task={task} previousCredits={previousCredits} />
}
