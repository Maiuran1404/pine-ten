import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { SubmissionSuccess } from './submission-success'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) => (
      <div {...props}>{children}</div>
    ),
    h2: ({
      children,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLHeadingElement>>) => (
      <h2 {...props}>{children}</h2>
    ),
    p: ({
      children,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLParagraphElement>>) => (
      <p {...props}>{children}</p>
    ),
    circle: (props: React.SVGProps<SVGCircleElement>) => <circle {...props} />,
    path: (props: React.SVGProps<SVGPathElement>) => <path {...props} />,
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}))

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}))

describe('SubmissionSuccess', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockPush.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders without crashing', () => {
    render(<SubmissionSuccess taskId="task-123" onViewProject={vi.fn()} />)

    // The SVG checkmark is always present
    expect(document.querySelector('svg')).toBeInTheDocument()
  })

  it('shows content after 600ms delay', () => {
    render(<SubmissionSuccess taskId="task-123" onViewProject={vi.fn()} />)

    // Content should not be visible initially
    expect(screen.queryByText('Your brief has been submitted')).not.toBeInTheDocument()

    // Advance timer by 600ms
    act(() => {
      vi.advanceTimersByTime(600)
    })

    expect(screen.getByText('Your brief has been submitted')).toBeInTheDocument()
  })

  it('shows default message when no assignedArtist', () => {
    render(<SubmissionSuccess taskId="task-123" onViewProject={vi.fn()} />)

    act(() => {
      vi.advanceTimersByTime(600)
    })

    expect(screen.getByText(/finding the perfect artist/i)).toBeInTheDocument()
  })

  it('shows assigned artist name when provided', () => {
    render(
      <SubmissionSuccess taskId="task-123" assignedArtist="Jane Doe" onViewProject={vi.fn()} />
    )

    act(() => {
      vi.advanceTimersByTime(600)
    })

    expect(screen.getByText(/Jane Doe has been assigned/i)).toBeInTheDocument()
  })

  it('calls onViewProject when "View Your Project" button is clicked', () => {
    const onViewProject = vi.fn()
    render(<SubmissionSuccess taskId="task-123" onViewProject={onViewProject} />)

    act(() => {
      vi.advanceTimersByTime(600)
    })

    fireEvent.click(screen.getByRole('button', { name: /View Your Project/i }))
    expect(onViewProject).toHaveBeenCalledTimes(1)
  })

  it('navigates to dashboard when "Start Another Project" is clicked', () => {
    render(<SubmissionSuccess taskId="task-123" onViewProject={vi.fn()} />)

    act(() => {
      vi.advanceTimersByTime(600)
    })

    fireEvent.click(screen.getByRole('button', { name: /Start Another Project/i }))
    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })

  it('renders both action buttons after delay', () => {
    render(<SubmissionSuccess taskId="task-123" onViewProject={vi.fn()} />)

    act(() => {
      vi.advanceTimersByTime(600)
    })

    expect(screen.getByRole('button', { name: /View Your Project/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Start Another Project/i })).toBeInTheDocument()
  })
})
