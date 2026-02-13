import { describe, it, expect } from 'vitest'
import { queryKeys } from './use-queries'

describe('queryKeys', () => {
  describe('user keys', () => {
    it('should have correct base key', () => {
      expect(queryKeys.user.all).toEqual(['user'])
    })

    it('should build credits key from base', () => {
      expect(queryKeys.user.credits()).toEqual(['user', 'credits'])
    })

    it('should build settings key from base', () => {
      expect(queryKeys.user.settings()).toEqual(['user', 'settings'])
    })
  })

  describe('tasks keys', () => {
    it('should have correct base key', () => {
      expect(queryKeys.tasks.all).toEqual(['tasks'])
    })

    it('should build list key with filters', () => {
      const filters = { status: 'PENDING', limit: 10 }
      expect(queryKeys.tasks.list(filters)).toEqual(['tasks', 'list', filters])
    })

    it('should build list key without filters', () => {
      expect(queryKeys.tasks.list()).toEqual(['tasks', 'list', undefined])
    })

    it('should build detail key with id', () => {
      expect(queryKeys.tasks.detail('task-1')).toEqual(['tasks', 'detail', 'task-1'])
    })

    it('should build messages key with id', () => {
      expect(queryKeys.tasks.messages('task-1')).toEqual(['tasks', 'messages', 'task-1'])
    })
  })

  describe('admin keys', () => {
    it('should have correct base key', () => {
      expect(queryKeys.admin.all).toEqual(['admin'])
    })

    it('should build stats key', () => {
      expect(queryKeys.admin.stats()).toEqual(['admin', 'stats'])
    })

    it('should build clients key', () => {
      expect(queryKeys.admin.clients()).toEqual(['admin', 'clients'])
    })

    it('should build freelancers key', () => {
      expect(queryKeys.admin.freelancers()).toEqual(['admin', 'freelancers'])
    })

    it('should build tasks key', () => {
      expect(queryKeys.admin.tasks()).toEqual(['admin', 'tasks'])
    })
  })

  describe('freelancer keys', () => {
    it('should have correct base key', () => {
      expect(queryKeys.freelancer.all).toEqual(['freelancer'])
    })

    it('should build profile key', () => {
      expect(queryKeys.freelancer.profile()).toEqual(['freelancer', 'profile'])
    })

    it('should build stats key', () => {
      expect(queryKeys.freelancer.stats()).toEqual(['freelancer', 'stats'])
    })

    it('should build availableTasks key', () => {
      expect(queryKeys.freelancer.availableTasks()).toEqual(['freelancer', 'available-tasks'])
    })
  })

  describe('brand keys', () => {
    it('should have correct base key', () => {
      expect(queryKeys.brand.all).toEqual(['brand'])
    })

    it('should build current key', () => {
      expect(queryKeys.brand.current()).toEqual(['brand', 'current'])
    })
  })

  describe('drafts keys', () => {
    it('should have correct base key', () => {
      expect(queryKeys.drafts.all).toEqual(['drafts'])
    })

    it('should build list key', () => {
      expect(queryKeys.drafts.list()).toEqual(['drafts', 'list'])
    })

    it('should build detail key with id', () => {
      expect(queryKeys.drafts.detail('draft-1')).toEqual(['drafts', 'detail', 'draft-1'])
    })
  })
})
