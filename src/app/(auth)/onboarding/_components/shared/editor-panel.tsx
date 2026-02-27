'use client'

import { motion } from 'framer-motion'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

export function EditorPanel({
  children,
  isOpen,
  title,
  isMobile,
  onClose,
}: {
  children: React.ReactNode
  isOpen: boolean
  title: string
  isMobile: boolean
  onClose: () => void
}) {
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent
          side="bottom"
          className="bg-surface-raised text-white border-white/10 rounded-t-2xl max-h-[70vh] overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle className="text-white text-sm">{title}</SheetTitle>
          </SheetHeader>
          <div className="pt-4 pb-6">{children}</div>
        </SheetContent>
      </Sheet>
    )
  }
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      {children}
    </motion.div>
  )
}
