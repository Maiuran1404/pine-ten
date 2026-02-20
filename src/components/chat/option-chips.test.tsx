import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OptionChips, SimpleOptionChips, InlineOptionChips } from './option-chips'

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

describe('OptionChips', () => {
  const defaultOptions = [
    { id: '1', label: 'Option A', description: 'Description A' },
    { id: '2', label: 'Option B', description: 'Description B' },
    { id: '3', label: 'Option C' },
  ]

  it('renders all options with labels', () => {
    const onSelect = vi.fn()
    render(<OptionChips options={defaultOptions} onSelect={onSelect} />)

    expect(screen.getByText('Option A')).toBeInTheDocument()
    expect(screen.getByText('Option B')).toBeInTheDocument()
    expect(screen.getByText('Option C')).toBeInTheDocument()
  })

  it('renders descriptions when provided', () => {
    const onSelect = vi.fn()
    render(<OptionChips options={defaultOptions} onSelect={onSelect} />)

    expect(screen.getByText('Description A')).toBeInTheDocument()
    expect(screen.getByText('Description B')).toBeInTheDocument()
  })

  it('calls onSelect with the option object when clicked in single-select mode', () => {
    const onSelect = vi.fn()
    render(<OptionChips options={defaultOptions} onSelect={onSelect} />)

    fireEvent.click(screen.getByText('Option A'))
    expect(onSelect).toHaveBeenCalledWith(defaultOptions[0])
  })

  it('does not call onSelect when disabled', () => {
    const onSelect = vi.fn()
    render(<OptionChips options={defaultOptions} onSelect={onSelect} disabled />)

    fireEvent.click(screen.getByText('Option A'))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('does not call onSelect when individual option is disabled', () => {
    const onSelect = vi.fn()
    const optionsWithDisabled = [
      { id: '1', label: 'Enabled' },
      { id: '2', label: 'Disabled', disabled: true },
    ]
    render(<OptionChips options={optionsWithDisabled} onSelect={onSelect} />)

    fireEvent.click(screen.getByText('Disabled'))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('supports multi-select mode with confirm button', () => {
    const onSelect = vi.fn()
    const onConfirm = vi.fn()
    render(
      <OptionChips options={defaultOptions} onSelect={onSelect} multiSelect onConfirm={onConfirm} />
    )

    // Select two options
    fireEvent.click(screen.getByText('Option A'))
    fireEvent.click(screen.getByText('Option B'))

    // Confirm button should show count
    const confirmButton = screen.getByRole('button', { name: /Continue with 2 selected/i })
    expect(confirmButton).toBeInTheDocument()

    fireEvent.click(confirmButton)
    expect(onConfirm).toHaveBeenCalledWith(['1', '2'])
  })

  it('toggles selection in multi-select mode', () => {
    const onSelect = vi.fn()
    const onConfirm = vi.fn()
    render(
      <OptionChips options={defaultOptions} onSelect={onSelect} multiSelect onConfirm={onConfirm} />
    )

    // Select A
    fireEvent.click(screen.getByText('Option A'))
    expect(screen.getByRole('button', { name: /Continue with 1 selected/i })).toBeInTheDocument()

    // Deselect A
    fireEvent.click(screen.getByText('Option A'))
    expect(screen.queryByRole('button', { name: /Continue with/i })).not.toBeInTheDocument()
  })

  it('renders with icon when provided', () => {
    const onSelect = vi.fn()
    const optionsWithIcon = [
      {
        id: '1',
        label: 'With Icon',
        icon: <span data-testid="test-icon">icon</span>,
      },
    ]
    render(<OptionChips options={optionsWithIcon} onSelect={onSelect} />)

    expect(screen.getByTestId('test-icon')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const onSelect = vi.fn()
    const { container } = render(
      <OptionChips options={defaultOptions} onSelect={onSelect} className="custom-class" />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })
})

describe('SimpleOptionChips', () => {
  it('renders string options as OptionChips', () => {
    const onSelect = vi.fn()
    render(<SimpleOptionChips options={['Red', 'Blue', 'Green']} onSelect={onSelect} />)

    expect(screen.getByText('Red')).toBeInTheDocument()
    expect(screen.getByText('Blue')).toBeInTheDocument()
    expect(screen.getByText('Green')).toBeInTheDocument()
  })

  it('calls onSelect with the string label', () => {
    const onSelect = vi.fn()
    render(<SimpleOptionChips options={['Red', 'Blue']} onSelect={onSelect} />)

    fireEvent.click(screen.getByText('Red'))
    expect(onSelect).toHaveBeenCalledWith('Red')
  })
})

describe('InlineOptionChips', () => {
  it('renders options as inline buttons', () => {
    const onSelect = vi.fn()
    render(<InlineOptionChips options={['Fast', 'Slow']} onSelect={onSelect} />)

    expect(screen.getByText('Fast')).toBeInTheDocument()
    expect(screen.getByText('Slow')).toBeInTheDocument()
  })

  it('calls onSelect with the clicked option', () => {
    const onSelect = vi.fn()
    render(<InlineOptionChips options={['Fast', 'Slow']} onSelect={onSelect} />)

    fireEvent.click(screen.getByText('Fast'))
    expect(onSelect).toHaveBeenCalledWith('Fast')
  })

  it('disables buttons when disabled prop is true', () => {
    const onSelect = vi.fn()
    render(<InlineOptionChips options={['Fast']} onSelect={onSelect} disabled />)

    const button = screen.getByText('Fast')
    expect(button).toBeDisabled()
  })
})
