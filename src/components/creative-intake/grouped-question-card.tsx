'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Check, ChevronRight, Sparkles, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { GroupedQuestion, SelectOption } from '@/lib/creative-intake/types'

interface GroupedQuestionCardProps {
  questions: GroupedQuestion[]
  onSubmit: (answers: Record<string, string | string[]>) => void
  disabled?: boolean
  className?: string
}

export function GroupedQuestionCard({
  questions,
  onSubmit,
  disabled = false,
  className,
}: GroupedQuestionCardProps) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>(() => {
    const initial: Record<string, string | string[]> = {}
    questions.forEach((q) => {
      if (q.value) {
        initial[q.id] = q.value
      } else if (q.type === 'multi_select') {
        initial[q.id] = []
      } else {
        initial[q.id] = ''
      }
    })
    return initial
  })

  const updateAnswer = useCallback((questionId: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }, [])

  const toggleMultiSelect = useCallback((questionId: string, optionValue: string) => {
    setAnswers((prev) => {
      const current = (prev[questionId] as string[]) || []
      const updated = current.includes(optionValue)
        ? current.filter((v) => v !== optionValue)
        : [...current, optionValue]
      return { ...prev, [questionId]: updated }
    })
  }, [])

  const isComplete = useCallback(() => {
    return questions.every((q) => {
      if (!q.required) return true
      const answer = answers[q.id]
      if (Array.isArray(answer)) return answer.length > 0
      return answer && answer.trim() !== ''
    })
  }, [questions, answers])

  const handleSubmit = () => {
    if (isComplete() && !disabled) {
      onSubmit(answers)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('bg-card border border-border rounded-xl p-4 space-y-4', className)}
    >
      {questions.map((question, index) => (
        <QuestionField
          key={question.id}
          question={question}
          value={answers[question.id]}
          onChange={(value) => updateAnswer(question.id, value)}
          onToggle={(optionValue) => toggleMultiSelect(question.id, optionValue)}
          disabled={disabled}
          index={index}
        />
      ))}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex justify-end pt-2"
      >
        <Button onClick={handleSubmit} disabled={disabled || !isComplete()} className="gap-2">
          Continue
          <ChevronRight className="h-4 w-4" />
        </Button>
      </motion.div>
    </motion.div>
  )
}

interface QuestionFieldProps {
  question: GroupedQuestion
  value: string | string[]
  onChange: (value: string | string[]) => void
  onToggle: (optionValue: string) => void
  disabled: boolean
  index: number
}

function QuestionField({
  question,
  value,
  onChange,
  onToggle,
  disabled,
  index,
}: QuestionFieldProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className="space-y-2"
    >
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          {question.label}
          {question.required && <span className="text-destructive ml-1">*</span>}
        </label>
      </div>

      {/* Recommendation badge */}
      {question.recommendation && (
        <div className="flex items-center gap-1.5 text-xs text-primary">
          <Sparkles className="h-3 w-3" />
          <span>{question.recommendation}</span>
        </div>
      )}

      {/* Render based on question type */}
      {question.type === 'multi_select' && question.options && (
        <MultiSelectOptions
          options={question.options}
          selected={(value as string[]) || []}
          onToggle={onToggle}
          disabled={disabled}
        />
      )}

      {question.type === 'single_select' && question.options && (
        <SingleSelectOptions
          options={question.options}
          selected={value as string}
          onChange={(v) => onChange(v)}
          disabled={disabled}
        />
      )}

      {question.type === 'text' && (
        <Textarea
          placeholder={question.placeholder}
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="min-h-[80px] resize-none"
        />
      )}

      {question.type === 'link' && (
        <div className="relative">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="url"
            placeholder={question.placeholder || 'Paste link here...'}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="pl-10"
          />
        </div>
      )}
    </motion.div>
  )
}

interface MultiSelectOptionsProps {
  options: SelectOption[]
  selected: string[]
  onToggle: (value: string) => void
  disabled: boolean
}

function MultiSelectOptions({ options, selected, onToggle, disabled }: MultiSelectOptionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selected.includes(option.value)

        return (
          <button
            key={option.value}
            onClick={() => onToggle(option.value)}
            disabled={disabled}
            className={cn(
              'relative flex items-center gap-2 px-3 py-2 rounded-lg border text-sm',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              isSelected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background hover:border-primary/50',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div
              className={cn(
                'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
              )}
            >
              {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
            </div>
            <span>{option.label}</span>
            {option.recommended && !isSelected && (
              <span className="text-[10px] text-primary font-medium uppercase">rec</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

interface SingleSelectOptionsProps {
  options: SelectOption[]
  selected: string
  onChange: (value: string) => void
  disabled: boolean
}

function SingleSelectOptions({ options, selected, onChange, disabled }: SingleSelectOptionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selected === option.value

        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              isSelected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background hover:border-primary/50',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div
              className={cn(
                'w-4 h-4 rounded-full border flex items-center justify-center shrink-0',
                isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
              )}
            >
              {isSelected && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
            </div>
            <span>{option.label}</span>
            {option.recommended && !isSelected && (
              <span className="text-[10px] text-primary font-medium uppercase">rec</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Quick options component (for binary choices)
 */
interface QuickOptionsProps {
  prompt?: string
  options: Array<{ label: string; value: string; recommended?: boolean }>
  onSelect: (value: string) => void
  disabled?: boolean
  className?: string
}

export function QuickOptions({
  prompt,
  options,
  onSelect,
  disabled = false,
  className,
}: QuickOptionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('space-y-2', className)}
    >
      {prompt && <p className="text-sm text-muted-foreground">{prompt}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((option, index) => (
          <motion.button
            key={option.value}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            onClick={() => onSelect(option.value)}
            disabled={disabled}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              option.recommended
                ? 'border-primary bg-primary/10 text-primary hover:bg-primary/20'
                : 'border-border bg-card hover:border-primary/50 hover:bg-muted/30',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {option.label}
            {option.recommended && <Sparkles className="h-3 w-3" />}
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}
