import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TaskProposalCard } from './task-proposal-card'
import type { TaskProposal } from './types'

vi.mock('@/components/shared/loading', () => ({
  LoadingSpinner: () => <span data-testid="loading-spinner">Loading...</span>,
}))

const defaultProposal: TaskProposal = {
  title: 'Brand Identity Design',
  description:
    'Create a complete brand identity package including logo, color palette, and typography.',
  category: 'design',
  estimatedHours: 20,
  creditsRequired: 25,
  deliveryDays: 5,
}

describe('TaskProposalCard', () => {
  it('renders the proposal title', () => {
    render(<TaskProposalCard proposal={defaultProposal} />)

    expect(screen.getByText('Brand Identity Design')).toBeInTheDocument()
  })

  it('renders the proposal description', () => {
    render(<TaskProposalCard proposal={defaultProposal} />)

    expect(
      screen.getByText(
        'Create a complete brand identity package including logo, color palette, and typography.'
      )
    ).toBeInTheDocument()
  })

  it('shows credits required badge', () => {
    render(<TaskProposalCard proposal={defaultProposal} />)

    expect(screen.getByText('25 credits')).toBeInTheDocument()
  })

  it('shows fallback title when title is empty', () => {
    const proposal = { ...defaultProposal, title: '' }
    render(<TaskProposalCard proposal={proposal} />)

    expect(screen.getByText('Task Summary')).toBeInTheDocument()
  })

  it('does not show action buttons by default', () => {
    render(<TaskProposalCard proposal={defaultProposal} />)

    expect(screen.queryByRole('button', { name: /Make Changes/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Review & Submit/i })).not.toBeInTheDocument()
  })

  it('shows action buttons when showActions is true', () => {
    const onSubmit = vi.fn()
    const onMakeChanges = vi.fn()

    render(
      <TaskProposalCard
        proposal={defaultProposal}
        showActions
        onSubmit={onSubmit}
        onMakeChanges={onMakeChanges}
        userCredits={50}
      />
    )

    expect(screen.getByRole('button', { name: /Make Changes/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Review & Submit/i })).toBeInTheDocument()
  })

  it('calls onSubmit when submit button is clicked', () => {
    const onSubmit = vi.fn()

    render(
      <TaskProposalCard
        proposal={defaultProposal}
        showActions
        onSubmit={onSubmit}
        onMakeChanges={vi.fn()}
        userCredits={50}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Review & Submit/i }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('calls onMakeChanges when Make Changes button is clicked', () => {
    const onMakeChanges = vi.fn()

    render(
      <TaskProposalCard
        proposal={defaultProposal}
        showActions
        onSubmit={vi.fn()}
        onMakeChanges={onMakeChanges}
        userCredits={50}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Make Changes/i }))
    expect(onMakeChanges).toHaveBeenCalledTimes(1)
  })

  it('shows "Buy Credits" when insufficient credits', () => {
    render(
      <TaskProposalCard
        proposal={defaultProposal}
        showActions
        onSubmit={vi.fn()}
        onMakeChanges={vi.fn()}
        userCredits={10}
      />
    )

    expect(screen.getByRole('button', { name: /Buy Credits/i })).toBeInTheDocument()
  })

  it('shows insufficient credits warning message', () => {
    render(
      <TaskProposalCard
        proposal={defaultProposal}
        showActions
        onSubmit={vi.fn()}
        onMakeChanges={vi.fn()}
        userCredits={10}
      />
    )

    expect(screen.getByText(/Insufficient credits/)).toBeInTheDocument()
    expect(screen.getByText(/You need 15 more credits/)).toBeInTheDocument()
  })

  it('shows user credit balance badge when userCredits > 0', () => {
    render(<TaskProposalCard proposal={defaultProposal} userCredits={30} />)

    expect(screen.getByText('You have 30 credits')).toBeInTheDocument()
  })

  it('does not show credit balance badge when userCredits is 0', () => {
    render(<TaskProposalCard proposal={defaultProposal} userCredits={0} />)

    expect(screen.queryByText(/You have/)).not.toBeInTheDocument()
  })

  it('disables buttons when isLoading is true', () => {
    render(
      <TaskProposalCard
        proposal={defaultProposal}
        showActions
        onSubmit={vi.fn()}
        onMakeChanges={vi.fn()}
        userCredits={50}
        isLoading
      />
    )

    expect(screen.getByRole('button', { name: /Make Changes/i })).toBeDisabled()
  })

  it('shows loading spinner when isLoading', () => {
    render(
      <TaskProposalCard
        proposal={defaultProposal}
        showActions
        onSubmit={vi.fn()}
        onMakeChanges={vi.fn()}
        userCredits={50}
        isLoading
      />
    )

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('uses default creditsRequired of 15 when not specified', () => {
    const proposalWithoutCredits: TaskProposal = {
      ...defaultProposal,
      creditsRequired: undefined as unknown as number,
    }
    render(<TaskProposalCard proposal={proposalWithoutCredits} />)

    expect(screen.getByText('15 credits')).toBeInTheDocument()
  })
})
