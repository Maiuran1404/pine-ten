'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

interface FormFieldProps {
  label: string
  name: string
  error?: string
  helperText?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}

/**
 * Wrapper for form fields with consistent label, error, and helper text display
 */
export function FormField({
  label,
  name,
  error,
  helperText,
  required,
  className,
  children,
}: FormFieldProps) {
  const describedBy = error ? `${name}-error` : helperText ? `${name}-helper` : undefined

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={name} className="flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {React.isValidElement(children) &&
        React.cloneElement(
          children as React.ReactElement<{
            id?: string
            name?: string
            'aria-describedby'?: string
            'aria-invalid'?: boolean
            className?: string
          }>,
          {
            id: name,
            name,
            'aria-describedby': describedBy,
            'aria-invalid': !!error,
            className: cn(
              (children as React.ReactElement<{ className?: string }>).props?.className,
              error && 'border-destructive focus-visible:ring-destructive'
            ),
          }
        )}
      {error && (
        <p
          id={`${name}-error`}
          className="text-sm text-destructive flex items-center gap-1"
          role="alert"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={`${name}-helper`} className="text-sm text-muted-foreground">
          {helperText}
        </p>
      )}
    </div>
  )
}

interface TextInputFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name'> {
  label: string
  name: string
  error?: string
  helperText?: string
}

/**
 * Text input with integrated label and error handling
 */
export function TextInputField({
  label,
  name,
  error,
  helperText,
  required,
  className,
  ...props
}: TextInputFieldProps) {
  return (
    <FormField
      label={label}
      name={name}
      error={error}
      helperText={helperText}
      required={required}
      className={className}
    >
      <Input {...props} />
    </FormField>
  )
}

interface TextAreaFieldProps extends Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'name'
> {
  label: string
  name: string
  error?: string
  helperText?: string
  maxLength?: number
  showCount?: boolean
}

/**
 * Textarea with integrated label, error handling, and character count
 */
export function TextAreaField({
  label,
  name,
  error,
  helperText,
  required,
  className,
  maxLength,
  showCount = false,
  value,
  ...props
}: TextAreaFieldProps) {
  const charCount = typeof value === 'string' ? value.length : 0

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={name} className="flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="relative">
        <Textarea
          id={name}
          name={name}
          value={value}
          maxLength={maxLength}
          aria-describedby={error ? `${name}-error` : helperText ? `${name}-helper` : undefined}
          aria-invalid={!!error}
          className={cn(error && 'border-destructive focus-visible:ring-destructive')}
          {...props}
        />
        {showCount && maxLength && (
          <span
            className={cn(
              'absolute bottom-2 right-2 text-xs text-muted-foreground',
              charCount > maxLength * 0.9 && 'text-amber-500',
              charCount >= maxLength && 'text-destructive'
            )}
          >
            {charCount}/{maxLength}
          </span>
        )}
      </div>
      {error && (
        <p
          id={`${name}-error`}
          className="text-sm text-destructive flex items-center gap-1"
          role="alert"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={`${name}-helper`} className="text-sm text-muted-foreground">
          {helperText}
        </p>
      )}
    </div>
  )
}

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean
  isSuccess?: boolean
  loadingText?: string
  successText?: string
}

/**
 * Submit button with loading and success states
 */
export function SubmitButton({
  children,
  isLoading,
  isSuccess,
  loadingText = 'Saving...',
  successText = 'Saved!',
  disabled,
  className,
  ...props
}: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors',
        'hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        isSuccess && 'bg-green-600 hover:bg-green-600',
        className
      )}
      {...props}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {isSuccess && !isLoading && <CheckCircle2 className="h-4 w-4" />}
      {isLoading ? loadingText : isSuccess ? successText : children}
    </button>
  )
}

/**
 * Form section with title and optional description
 */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <h3 className="text-lg font-medium">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  )
}

/**
 * Inline form feedback message
 */
export function FormFeedback({
  type,
  message,
  className,
}: {
  type: 'success' | 'error' | 'info'
  message: string
  className?: string
}) {
  const styles = {
    success: 'bg-green-500/10 text-green-600 border-green-500/20',
    error: 'bg-destructive/10 text-destructive border-destructive/20',
    info: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  }

  const icons = {
    success: <CheckCircle2 className="h-4 w-4" />,
    error: <AlertCircle className="h-4 w-4" />,
    info: <AlertCircle className="h-4 w-4" />,
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border px-3 py-2 text-sm',
        styles[type],
        className
      )}
      role={type === 'error' ? 'alert' : 'status'}
    >
      {icons[type]}
      {message}
    </div>
  )
}
