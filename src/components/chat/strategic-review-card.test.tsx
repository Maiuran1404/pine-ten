import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StrategicReviewCard } from './strategic-review-card'
import type { StrategicReviewData } from '@/lib/ai/briefing-state-machine'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}))

const fullReview: StrategicReviewData = {
  strengths: ['Strong brand alignment', 'Clear messaging'],
  risks: ['Crowded market segment', 'May need more visual variety'],
  optimizationSuggestion: 'Consider adding a secondary color palette for variation.',
  inspirationFitScore: 'aligned',
  inspirationFitNote: 'Selected styles match your brand identity well.',
  userOverride: false,
}

describe('StrategicReviewCard', () => {
  it('renders strengths list', () => {
    const onAction = vi.fn()
    render(<StrategicReviewCard review={fullReview} onAction={onAction} />)

    expect(screen.getByText('Strong brand alignment')).toBeInTheDocument()
    expect(screen.getByText('Clear messaging')).toBeInTheDocument()
    expect(screen.getByText('Strengths')).toBeInTheDocument()
  })

  it('renders risks list', () => {
    const onAction = vi.fn()
    render(<StrategicReviewCard review={fullReview} onAction={onAction} />)

    expect(screen.getByText('Crowded market segment')).toBeInTheDocument()
    expect(screen.getByText('May need more visual variety')).toBeInTheDocument()
    expect(screen.getByText('Risks')).toBeInTheDocument()
  })

  it('renders optimization suggestion', () => {
    const onAction = vi.fn()
    render(<StrategicReviewCard review={fullReview} onAction={onAction} />)

    expect(
      screen.getByText('Consider adding a secondary color palette for variation.')
    ).toBeInTheDocument()
  })

  it('renders inspiration fit indicator with aligned score', () => {
    const onAction = vi.fn()
    render(<StrategicReviewCard review={fullReview} onAction={onAction} />)

    expect(screen.getByText(/Inspiration Fit: Aligned/i)).toBeInTheDocument()
    expect(screen.getByText('Selected styles match your brand identity well.')).toBeInTheDocument()
  })

  it('renders minor_mismatch fit indicator', () => {
    const onAction = vi.fn()
    const review: StrategicReviewData = {
      ...fullReview,
      inspirationFitScore: 'minor_mismatch',
      inspirationFitNote: 'Slight deviation from brand.',
    }
    render(<StrategicReviewCard review={review} onAction={onAction} />)

    expect(screen.getByText(/Inspiration Fit: Minor Mismatch/i)).toBeInTheDocument()
  })

  it('renders significant_mismatch fit indicator', () => {
    const onAction = vi.fn()
    const review: StrategicReviewData = {
      ...fullReview,
      inspirationFitScore: 'significant_mismatch',
      inspirationFitNote: 'Major deviation.',
    }
    render(<StrategicReviewCard review={review} onAction={onAction} />)

    expect(screen.getByText(/Inspiration Fit: Significant Mismatch/i)).toBeInTheDocument()
  })

  it('renders action buttons when userOverride is false', () => {
    const onAction = vi.fn()
    render(<StrategicReviewCard review={fullReview} onAction={onAction} />)

    expect(screen.getByRole('button', { name: /Looks good, continue/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Keep as-is/i })).toBeInTheDocument()
  })

  it('calls onAction with "accept" when accept button is clicked', () => {
    const onAction = vi.fn()
    render(<StrategicReviewCard review={fullReview} onAction={onAction} />)

    fireEvent.click(screen.getByRole('button', { name: /Looks good, continue/i }))
    expect(onAction).toHaveBeenCalledWith('accept')
  })

  it('calls onAction with "override" when override button is clicked', () => {
    const onAction = vi.fn()
    render(<StrategicReviewCard review={fullReview} onAction={onAction} />)

    fireEvent.click(screen.getByRole('button', { name: /Keep as-is/i }))
    expect(onAction).toHaveBeenCalledWith('override')
  })

  it('hides action buttons when userOverride is true', () => {
    const onAction = vi.fn()
    const review: StrategicReviewData = { ...fullReview, userOverride: true }
    render(<StrategicReviewCard review={review} onAction={onAction} />)

    expect(screen.queryByRole('button', { name: /Looks good, continue/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Keep as-is/i })).not.toBeInTheDocument()
  })

  it('shows "User Override" badge when userOverride is true', () => {
    const onAction = vi.fn()
    const review: StrategicReviewData = { ...fullReview, userOverride: true }
    render(<StrategicReviewCard review={review} onAction={onAction} />)

    expect(screen.getByText('User Override')).toBeInTheDocument()
  })

  it('disables action buttons when disabled prop is true', () => {
    const onAction = vi.fn()
    render(<StrategicReviewCard review={fullReview} onAction={onAction} disabled />)

    expect(screen.getByRole('button', { name: /Looks good, continue/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Keep as-is/i })).toBeDisabled()
  })

  it('renders empty state when no review data', () => {
    const onAction = vi.fn()
    const emptyReview: StrategicReviewData = {
      strengths: [],
      risks: [],
      optimizationSuggestion: '',
      inspirationFitScore: 'aligned',
      inspirationFitNote: null,
      userOverride: false,
    }
    render(<StrategicReviewCard review={emptyReview} onAction={onAction} />)

    expect(screen.getByText('Strategic review will appear here')).toBeInTheDocument()
  })

  it('renders Strategic Review header', () => {
    const onAction = vi.fn()
    render(<StrategicReviewCard review={fullReview} onAction={onAction} />)

    expect(screen.getByText('Strategic Review')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const onAction = vi.fn()
    const { container } = render(
      <StrategicReviewCard review={fullReview} onAction={onAction} className="my-class" />
    )

    expect(container.firstChild).toHaveClass('my-class')
  })
})
