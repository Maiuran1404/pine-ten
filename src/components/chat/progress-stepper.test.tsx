import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProgressStepper, CompactProgress, TopProgressBar } from './progress-stepper'
import type { ChatStage } from './types'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) => (
      <div {...props}>{children}</div>
    ),
    p: ({
      children,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLParagraphElement>>) => (
      <p {...props}>{children}</p>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}))

describe('ProgressStepper', () => {
  it('renders the header with progress percentage', () => {
    render(<ProgressStepper currentStage="brief" completedStages={[]} progressPercentage={0} />)

    expect(screen.getByText('Progress')).toBeInTheDocument()
    expect(screen.getByText('0% complete')).toBeInTheDocument()
  })

  it('shows all briefing stages', () => {
    render(<ProgressStepper currentStage="brief" completedStages={[]} progressPercentage={10} />)

    expect(screen.getByText('Describe your project')).toBeInTheDocument()
    expect(screen.getByText('Story concept')).toBeInTheDocument()
    expect(screen.getByText('Visual style')).toBeInTheDocument()
    expect(screen.getByText('Storyboard')).toBeInTheDocument()
    expect(screen.getByText('Review & submit')).toBeInTheDocument()
  })

  it('marks the current stage with "Current step" label', () => {
    render(
      <ProgressStepper currentStage="style" completedStages={['brief']} progressPercentage={25} />
    )

    expect(screen.getByText('Current step')).toBeInTheDocument()
  })

  it('shows "Ready to create!" when progress is 100%', () => {
    const allStages: ChatStage[] = ['brief', 'narrative', 'style', 'storyboard', 'review']
    render(
      <ProgressStepper currentStage="review" completedStages={allStages} progressPercentage={100} />
    )

    expect(screen.getByText('Ready to create!')).toBeInTheDocument()
  })

  it('shows "Complete all steps to submit" when progress is not 100%', () => {
    render(<ProgressStepper currentStage="brief" completedStages={[]} progressPercentage={10} />)

    expect(screen.getByText('Complete all steps to submit')).toBeInTheDocument()
  })

  it('displays correct percentage', () => {
    render(
      <ProgressStepper
        currentStage="details"
        completedStages={['brief', 'style']}
        progressPercentage={42}
      />
    )

    expect(screen.getByText('42% complete')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <ProgressStepper
        currentStage="brief"
        completedStages={[]}
        progressPercentage={0}
        className="custom-stepper"
      />
    )

    expect(container.firstChild).toHaveClass('custom-stepper')
  })
})

describe('CompactProgress', () => {
  it('renders the progress percentage', () => {
    render(<CompactProgress currentStage="brief" completedStages={[]} progressPercentage={30} />)

    expect(screen.getByText('30%')).toBeInTheDocument()
  })

  it('renders dots for each stage', () => {
    const { container } = render(
      <CompactProgress currentStage="style" completedStages={['brief']} progressPercentage={25} />
    )

    // Should have dots for each stage in BRIEFING_CHAT_STAGES (5 stages)
    const dots = container.querySelectorAll('.rounded-full.w-2.h-2')
    expect(dots.length).toBe(5)
  })

  it('applies custom className', () => {
    const { container } = render(
      <CompactProgress
        currentStage="brief"
        completedStages={[]}
        progressPercentage={0}
        className="compact-class"
      />
    )

    expect(container.firstChild).toHaveClass('compact-class')
  })
})

describe('TopProgressBar', () => {
  it('renders the current stage label', () => {
    render(
      <TopProgressBar currentStage="style" completedStages={['brief']} progressPercentage={25} />
    )

    expect(screen.getByText('Visual style')).toBeInTheDocument()
  })

  it('shows progress percentage', () => {
    render(
      <TopProgressBar
        currentStage="narrative"
        completedStages={['brief']}
        progressPercentage={50}
      />
    )

    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('renders stage dots', () => {
    const { container } = render(
      <TopProgressBar currentStage="brief" completedStages={[]} progressPercentage={10} />
    )

    // Each stage is represented by a small dot
    const dots = container.querySelectorAll('.rounded-full.w-1\\.5.h-1\\.5')
    expect(dots.length).toBe(5)
  })

  it('applies custom className', () => {
    const { container } = render(
      <TopProgressBar
        currentStage="brief"
        completedStages={[]}
        progressPercentage={0}
        className="top-bar-class"
      />
    )

    expect(container.firstChild).toHaveClass('top-bar-class')
  })
})
