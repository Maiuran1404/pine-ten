import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QuickOptions } from './quick-options'

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    button: ({
      children,
      ...props
    }: React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement>>) => (
      <button {...props}>{children}</button>
    ),
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}))

describe('QuickOptions', () => {
  const defaultOptions = {
    question: 'What type of project?',
    options: ['Logo Design', 'Social Media', 'Website'],
  }

  it('renders all options', () => {
    const onSelect = vi.fn()
    render(<QuickOptions options={defaultOptions} onSelect={onSelect} />)

    expect(screen.getByText('Logo Design')).toBeInTheDocument()
    expect(screen.getByText('Social Media')).toBeInTheDocument()
    expect(screen.getByText('Website')).toBeInTheDocument()
  })

  it('calls onSelect when an option is clicked in single-select mode', () => {
    const onSelect = vi.fn()
    render(<QuickOptions options={defaultOptions} onSelect={onSelect} />)

    fireEvent.click(screen.getByText('Logo Design'))
    expect(onSelect).toHaveBeenCalledWith('Logo Design')
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('returns null when options array is empty', () => {
    const onSelect = vi.fn()
    const emptyOptions = { question: 'Pick one', options: [] }
    const { container } = render(<QuickOptions options={emptyOptions} onSelect={onSelect} />)

    expect(container.innerHTML).toBe('')
  })

  it('limits display to first 5 options', () => {
    const onSelect = vi.fn()
    const manyOptions = {
      question: 'Pick',
      options: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    }
    render(<QuickOptions options={manyOptions} onSelect={onSelect} />)

    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('E')).toBeInTheDocument()
    expect(screen.queryByText('F')).not.toBeInTheDocument()
    expect(screen.queryByText('G')).not.toBeInTheDocument()
  })

  it('does not call onSelect when disabled', () => {
    const onSelect = vi.fn()
    render(<QuickOptions options={defaultOptions} onSelect={onSelect} disabled />)

    fireEvent.click(screen.getByText('Logo Design'))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('renders Skip button when showSkip is true in single-select mode', () => {
    const onSelect = vi.fn()
    render(<QuickOptions options={defaultOptions} onSelect={onSelect} showSkip />)

    const skipButton = screen.getByText('Skip')
    expect(skipButton).toBeInTheDocument()

    fireEvent.click(skipButton)
    expect(onSelect).toHaveBeenCalledWith('Skip this question')
  })

  it('does not render Skip button when showSkip is false', () => {
    const onSelect = vi.fn()
    render(<QuickOptions options={defaultOptions} onSelect={onSelect} showSkip={false} />)

    expect(screen.queryByText('Skip')).not.toBeInTheDocument()
  })

  it('supports multi-select mode: toggles selection and shows confirm button', () => {
    const onSelect = vi.fn()
    const multiOptions = {
      question: 'Pick multiple',
      options: ['A', 'B', 'C'],
      multiSelect: true,
    }
    render(<QuickOptions options={multiOptions} onSelect={onSelect} />)

    // Click first option - should not call onSelect immediately
    fireEvent.click(screen.getByText('A'))
    expect(onSelect).not.toHaveBeenCalled()

    // Confirm button should appear
    const confirmButton = screen.getByRole('button', { name: /Continue with 1 selected/i })
    expect(confirmButton).toBeInTheDocument()

    // Click second option
    fireEvent.click(screen.getByText('B'))
    expect(screen.getByRole('button', { name: /Continue with 2 selected/i })).toBeInTheDocument()

    // Click confirm
    fireEvent.click(screen.getByRole('button', { name: /Continue with 2 selected/i }))
    expect(onSelect).toHaveBeenCalledWith('A, B')
  })

  it('deselects an option in multi-select mode when clicked again', () => {
    const onSelect = vi.fn()
    const multiOptions = {
      question: 'Pick multiple',
      options: ['A', 'B'],
      multiSelect: true,
    }
    render(<QuickOptions options={multiOptions} onSelect={onSelect} />)

    // Select A
    fireEvent.click(screen.getByText('A'))
    expect(screen.getByRole('button', { name: /Continue with 1 selected/i })).toBeInTheDocument()

    // Deselect A
    fireEvent.click(screen.getByText('A'))
    expect(screen.queryByRole('button', { name: /Continue with/i })).not.toBeInTheDocument()
  })

  it('sends single item without comma in multi-select when only one selected', () => {
    const onSelect = vi.fn()
    const multiOptions = {
      question: 'Pick',
      options: ['OnlyOne', 'Another'],
      multiSelect: true,
    }
    render(<QuickOptions options={multiOptions} onSelect={onSelect} />)

    fireEvent.click(screen.getByText('OnlyOne'))
    fireEvent.click(screen.getByRole('button', { name: /Continue with 1 selected/i }))
    expect(onSelect).toHaveBeenCalledWith('OnlyOne')
  })
})
