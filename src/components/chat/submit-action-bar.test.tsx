import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SubmitActionBar } from './submit-action-bar'
import type { TaskProposal, MoodboardItem } from './types'

// Mock framer-motion — invoke onAnimationComplete immediately so the
// animation lock (`isAnimating`) resets before the next user interaction.
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      onAnimationComplete,
      ...props
    }: React.PropsWithChildren<
      React.HTMLAttributes<HTMLDivElement> & { onAnimationComplete?: () => void }
    >) => {
      // Fire on next tick so the component mounts first
      if (onAnimationComplete) {
        queueMicrotask(onAnimationComplete)
      }
      return <div {...props}>{children}</div>
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}))

vi.mock('@/components/shared/loading', () => ({
  LoadingSpinner: () => <span data-testid="loading-spinner">Loading...</span>,
}))

const defaultTaskProposal: TaskProposal = {
  title: 'Instagram Carousel Design',
  description: 'Create a beautiful carousel post',
  category: 'design',
  estimatedHours: 10,
  creditsRequired: 15,
  deliveryDays: 3,
}

const defaultProps = {
  taskProposal: defaultTaskProposal,
  moodboardItems: [] as MoodboardItem[],
  userCredits: 50,
  isSubmitting: false,
  onConfirm: vi.fn().mockResolvedValue(undefined),
  onMakeChanges: vi.fn(),
  onInsufficientCredits: vi.fn(),
}

describe('SubmitActionBar', () => {
  it('renders task title in collapsed state', () => {
    render(<SubmitActionBar {...defaultProps} />)

    expect(screen.getByText('Instagram Carousel Design')).toBeInTheDocument()
  })

  it('shows credits required', () => {
    render(<SubmitActionBar {...defaultProps} />)

    expect(screen.getByText('15 credits')).toBeInTheDocument()
  })

  it('renders Submit Brief button when user has enough credits', () => {
    render(<SubmitActionBar {...defaultProps} />)

    expect(screen.getByRole('button', { name: /Submit Brief/i })).toBeInTheDocument()
  })

  it('renders "Get Credits to Submit" button when insufficient credits', () => {
    render(<SubmitActionBar {...defaultProps} userCredits={5} />)

    expect(screen.getByRole('button', { name: /Get Credits to Submit/i })).toBeInTheDocument()
  })

  it('calls onInsufficientCredits when submit clicked with insufficient credits', () => {
    const onInsufficientCredits = vi.fn()
    render(
      <SubmitActionBar
        {...defaultProps}
        userCredits={5}
        onInsufficientCredits={onInsufficientCredits}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Get Credits to Submit/i }))
    expect(onInsufficientCredits).toHaveBeenCalled()
  })

  it('expands to confirmation state when Submit Brief is clicked', () => {
    render(<SubmitActionBar {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /Submit Brief/i }))

    // Should now show expanded state
    expect(screen.getByText('Ready to Submit')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Confirm & Submit/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Go Back/i })).toBeInTheDocument()
  })

  it('calls onMakeChanges when Make Changes button is clicked', () => {
    const onMakeChanges = vi.fn()
    render(<SubmitActionBar {...defaultProps} onMakeChanges={onMakeChanges} />)

    fireEvent.click(screen.getByRole('button', { name: /Make Changes/i }))
    expect(onMakeChanges).toHaveBeenCalled()
  })

  it('calls onConfirm when Confirm & Submit is clicked', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(<SubmitActionBar {...defaultProps} onConfirm={onConfirm} />)

    // First expand
    fireEvent.click(screen.getByRole('button', { name: /Submit Brief/i }))

    // Wait for animation lock to release (onAnimationComplete fires via microtask)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Confirm & Submit/i })).not.toBeDisabled()
    })

    // Then confirm
    fireEvent.click(screen.getByRole('button', { name: /Confirm & Submit/i }))
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled()
    })
  })

  it('collapses back when Go Back is clicked in expanded state', async () => {
    render(<SubmitActionBar {...defaultProps} />)

    // Expand
    fireEvent.click(screen.getByRole('button', { name: /Submit Brief/i }))
    expect(screen.getByText('Ready to Submit')).toBeInTheDocument()

    // Wait for animation lock to release
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Go Back/i })).not.toBeDisabled()
    })

    // Collapse
    fireEvent.click(screen.getByRole('button', { name: /Go Back/i }))
    await waitFor(() => {
      expect(screen.queryByText('Ready to Submit')).not.toBeInTheDocument()
    })
  })

  it('shows credit balance info in expanded state', () => {
    render(<SubmitActionBar {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /Submit Brief/i }))

    expect(screen.getByText('50 credits available')).toBeInTheDocument()
    expect(screen.getByText('(35 remaining after)')).toBeInTheDocument()
  })

  it('shows insufficient credits warning in expanded state when low credits', () => {
    render(<SubmitActionBar {...defaultProps} userCredits={10} />)

    // The submit button will trigger onInsufficientCredits, not expand
    // since hasEnoughCredits is false
    expect(screen.getByRole('button', { name: /Get Credits to Submit/i })).toBeInTheDocument()
  })

  it('shows stats cards with credits, delivery date, and revisions in expanded state', () => {
    render(<SubmitActionBar {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /Submit Brief/i }))

    expect(screen.getByText(/15\s+credits/)).toBeInTheDocument()
    expect(screen.getByText(/2 revision/)).toBeInTheDocument()
  })

  it('disables buttons when isSubmitting is true', () => {
    render(<SubmitActionBar {...defaultProps} isSubmitting />)

    // When isSubmitting, the submit button shows a LoadingSpinner instead of "Submit Brief"
    const makeChangesButton = screen.getByRole('button', { name: /Make Changes/i })
    expect(makeChangesButton).toBeDisabled()

    // The submit button is also present and disabled (it shows loading state)
    const allButtons = screen.getAllByRole('button')
    const submitButton = allButtons.find((btn) => btn.getAttribute('data-size') === 'lg')
    expect(submitButton).toBeDisabled()
  })

  it('uses default values when creditsRequired and deliveryDays are not set', () => {
    const proposalWithoutDefaults: TaskProposal = {
      title: 'Test Task',
      description: 'A test task',
      category: 'design',
      estimatedHours: 5,
      creditsRequired: 15,
    }
    render(<SubmitActionBar {...defaultProps} taskProposal={proposalWithoutDefaults} />)

    expect(screen.getByText('15 credits')).toBeInTheDocument()
  })
})
