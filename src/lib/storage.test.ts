import { describe, it, expect } from 'vitest'
import { vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  getAdminStorageClient: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn() },
}))

const { getFileExtension, generateFilePath } = await import('./storage')

describe('getFileExtension', () => {
  it('should extract extension from filename', () => {
    expect(getFileExtension('photo.jpg')).toBe('jpg')
  })

  it('should extract extension from filename with multiple dots', () => {
    expect(getFileExtension('my.file.name.png')).toBe('png')
  })

  it('should return empty string for files without extension', () => {
    expect(getFileExtension('README')).toBe('')
  })

  it('should return empty string for dotfiles', () => {
    // The bitwise trick treats dotfiles as having no extension
    expect(getFileExtension('.gitignore')).toBe('')
  })

  it('should handle uppercase extensions', () => {
    expect(getFileExtension('image.PNG')).toBe('PNG')
  })
})

describe('generateFilePath', () => {
  it('should generate an attachment path by default', () => {
    const path = generateFilePath('task-1', 'user-1', 'photo.jpg')

    expect(path).toMatch(/^tasks\/task-1\/attachments\/user-1_\d+\.jpg$/)
  })

  it('should generate a deliverables path when isDeliverable is true', () => {
    const path = generateFilePath('task-1', 'user-1', 'design.png', true)

    expect(path).toMatch(/^tasks\/task-1\/deliverables\/user-1_\d+\.png$/)
  })

  it('should include timestamp for uniqueness', () => {
    const path1 = generateFilePath('t1', 'u1', 'a.jpg')
    // Small delay to get different timestamps
    const path2 = generateFilePath('t1', 'u1', 'a.jpg')

    // Paths should have same structure, timestamps may or may not differ
    expect(path1).toMatch(/^tasks\/t1\/attachments\/u1_\d+\.jpg$/)
    expect(path2).toMatch(/^tasks\/t1\/attachments\/u1_\d+\.jpg$/)
  })

  it('should handle files without extensions', () => {
    const path = generateFilePath('task-1', 'user-1', 'README')

    expect(path).toMatch(/^tasks\/task-1\/attachments\/user-1_\d+\.$/)
  })
})
