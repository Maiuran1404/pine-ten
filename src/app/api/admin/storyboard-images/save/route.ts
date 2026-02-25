import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse } from '@/lib/errors'
import { uploadToStorage } from '@/lib/storage'
import { db } from '@/db'
import { taskFiles } from '@/db/schema'
import { z } from 'zod'

const saveSchema = z.object({
  imageBase64: z.string().min(1),
  taskId: z.string().uuid(),
  sceneNumber: z.number().int().positive(),
  sceneTitle: z.string().optional(),
})

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAdmin()
    const body = saveSchema.parse(await request.json())

    // Strip data:image/png;base64, prefix if present
    const raw = body.imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(raw, 'base64')

    const timestamp = Date.now()
    const slug = body.sceneTitle
      ? body.sceneTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .slice(0, 40)
      : `scene-${body.sceneNumber}`
    const filename = `${slug}-${timestamp}.png`
    const storagePath = `tasks/${body.taskId}/storyboard/${filename}`

    const publicUrl = await uploadToStorage('task-files', storagePath, buffer, {
      contentType: 'image/png',
      upsert: false,
    })

    const [fileRecord] = await db
      .insert(taskFiles)
      .values({
        taskId: body.taskId,
        uploadedBy: session.user.id,
        fileName: filename,
        fileUrl: publicUrl,
        fileType: 'image/png',
        fileSize: buffer.length,
        isDeliverable: false,
      })
      .returning()

    return successResponse(
      {
        fileId: fileRecord.id,
        fileUrl: publicUrl,
        fileName: filename,
      },
      201
    )
  })
}
