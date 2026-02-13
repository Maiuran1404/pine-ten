'use client'

import * as React from 'react'
import { useState, createContext, useContext } from 'react'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'

// Context for accordion state
interface AccordionContextValue {
  value: string | string[] | undefined
  onValueChange: (value: string) => void
  type: 'single' | 'multiple'
}

const AccordionContext = createContext<AccordionContextValue | null>(null)

// Accordion Root
interface AccordionProps {
  type?: 'single' | 'multiple'
  value?: string | string[]
  defaultValue?: string | string[]
  onValueChange?: (value: string | string[]) => void
  collapsible?: boolean
  className?: string
  children: React.ReactNode
}

const Accordion = ({
  type = 'single',
  value: controlledValue,
  defaultValue,
  onValueChange,
  collapsible = false,
  className,
  children,
}: AccordionProps) => {
  const [internalValue, setInternalValue] = useState<string | string[] | undefined>(defaultValue)
  const value = controlledValue ?? internalValue

  const handleValueChange = (itemValue: string) => {
    if (type === 'single') {
      const newValue = value === itemValue ? undefined : itemValue
      setInternalValue(newValue)
      onValueChange?.(newValue as string)
    } else {
      const currentValues = Array.isArray(value) ? value : []
      const newValue = currentValues.includes(itemValue)
        ? currentValues.filter((v) => v !== itemValue)
        : [...currentValues, itemValue]
      setInternalValue(newValue)
      onValueChange?.(newValue)
    }
  }

  return (
    <AccordionContext.Provider value={{ value, onValueChange: handleValueChange, type }}>
      <div className={className}>{children}</div>
    </AccordionContext.Provider>
  )
}

// Item Context
interface AccordionItemContextValue {
  value: string
  isOpen: boolean
}

const AccordionItemContext = createContext<AccordionItemContextValue | null>(null)

// Accordion Item
interface AccordionItemProps {
  value: string
  className?: string
  children: React.ReactNode
}

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ value, className, children }, ref) => {
    const accordionContext = useContext(AccordionContext)
    if (!accordionContext) throw new Error('AccordionItem must be used within Accordion')

    const isOpen =
      accordionContext.type === 'single'
        ? accordionContext.value === value
        : Array.isArray(accordionContext.value) && accordionContext.value.includes(value)

    return (
      <AccordionItemContext.Provider value={{ value, isOpen }}>
        <div
          ref={ref}
          className={cn('border-b', className)}
          data-state={isOpen ? 'open' : 'closed'}
        >
          {children}
        </div>
      </AccordionItemContext.Provider>
    )
  }
)
AccordionItem.displayName = 'AccordionItem'

// Accordion Trigger
interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

const AccordionTrigger = React.forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const accordionContext = useContext(AccordionContext)
    const itemContext = useContext(AccordionItemContext)
    if (!accordionContext || !itemContext)
      throw new Error('AccordionTrigger must be used within AccordionItem')

    return (
      <div className="flex">
        <button
          ref={ref}
          type="button"
          className={cn(
            'flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline',
            className
          )}
          onClick={() => accordionContext.onValueChange(itemContext.value)}
          aria-expanded={itemContext.isOpen}
          data-state={itemContext.isOpen ? 'open' : 'closed'}
          {...props}
        >
          {children}
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 transition-transform duration-200',
              itemContext.isOpen && 'rotate-180'
            )}
          />
        </button>
      </div>
    )
  }
)
AccordionTrigger.displayName = 'AccordionTrigger'

// Accordion Content
interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const AccordionContent = React.forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ className, children, ...props }, ref) => {
    const itemContext = useContext(AccordionItemContext)
    if (!itemContext) throw new Error('AccordionContent must be used within AccordionItem')

    return (
      <div
        ref={ref}
        className={cn(
          'overflow-hidden text-sm transition-all',
          itemContext.isOpen ? 'animate-accordion-down' : 'animate-accordion-up hidden'
        )}
        data-state={itemContext.isOpen ? 'open' : 'closed'}
        {...props}
      >
        <div className={cn('pb-4 pt-0', className)}>{children}</div>
      </div>
    )
  }
)
AccordionContent.displayName = 'AccordionContent'

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
