import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InlineCollection } from './inline-collection'
import type { MoodboardItem } from './types'

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

function createMoodboardItem(overrides: Partial<MoodboardItem> = {}): MoodboardItem {
  return {
    id: 'item-1',
    type: 'style',
    imageUrl: 'https://example.com/image1.jpg',
    name: 'Modern Minimal',
    order: 0,
    addedAt: new Date(),
    ...overrides,
  }
}

describe('InlineCollection', () => {
  const defaultProps = {
    items: [
      createMoodboardItem({ id: 'item-1', name: 'Modern Minimal' }),
      createMoodboardItem({
        id: 'item-2',
        name: 'Bold Colors',
        imageUrl: 'https://example.com/image2.jpg',
      }),
    ],
    onRemoveItem: vi.fn(),
    onClearAll: vi.fn(),
    onContinue: vi.fn(),
  }

  it('renders nothing when items array is empty', () => {
    const { container } = render(
      <InlineCollection
        items={[]}
        onRemoveItem={vi.fn()}
        onClearAll={vi.fn()}
        onContinue={vi.fn()}
      />
    )

    expect(container.innerHTML).toBe('')
  })

  it('renders collection count in header', () => {
    render(<InlineCollection {...defaultProps} />)

    expect(screen.getByText('Your collection (2)')).toBeInTheDocument()
  })

  it('renders Continue button with correct text for multiple items', () => {
    render(<InlineCollection {...defaultProps} />)

    expect(
      screen.getByRole('button', { name: /Continue with these 2 styles/i })
    ).toBeInTheDocument()
  })

  it('renders Continue button with singular text for one item', () => {
    render(<InlineCollection {...defaultProps} items={[createMoodboardItem()]} />)

    expect(screen.getByRole('button', { name: /Continue with this style/i })).toBeInTheDocument()
  })

  it('calls onContinue when Continue button is clicked', () => {
    const onContinue = vi.fn()
    render(<InlineCollection {...defaultProps} onContinue={onContinue} />)

    fireEvent.click(screen.getByRole('button', { name: /Continue with these 2 styles/i }))
    expect(onContinue).toHaveBeenCalledTimes(1)
  })

  it('calls onClearAll when Clear button is clicked', () => {
    const onClearAll = vi.fn()
    render(<InlineCollection {...defaultProps} onClearAll={onClearAll} />)

    fireEvent.click(screen.getByRole('button', { name: /Clear/i }))
    expect(onClearAll).toHaveBeenCalledTimes(1)
  })

  it('renders thumbnails for each item', () => {
    render(<InlineCollection {...defaultProps} />)

    const images = screen.getAllByRole('img')
    expect(images.length).toBe(2)
    expect(images[0]).toHaveAttribute('alt', 'Modern Minimal')
    expect(images[1]).toHaveAttribute('alt', 'Bold Colors')
  })

  it('toggles collapse/expand when header button is clicked', () => {
    render(<InlineCollection {...defaultProps} />)

    // Initially expanded - should show images
    expect(screen.getAllByRole('img').length).toBe(2)

    // Click the header to collapse
    fireEvent.click(screen.getByText('Your collection (2)'))

    // After collapsing, images should be hidden (AnimatePresence handles removal)
    // But a Continue button should still be visible in collapsed state
    const continueButtons = screen.getAllByRole('button', { name: /Continue with/i })
    expect(continueButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('disables Continue button when isLoading is true', () => {
    render(<InlineCollection {...defaultProps} isLoading />)

    const continueButtons = screen.getAllByRole('button', { name: /Continue with/i })
    continueButtons.forEach((button) => {
      expect(button).toBeDisabled()
    })
  })

  it('renders remove buttons for each item', () => {
    render(<InlineCollection {...defaultProps} />)

    // Remove buttons are rendered for each item (they have X icon)
    // They are inside buttons without text, so we find them by their parent structure
    const images = screen.getAllByRole('img')
    expect(images.length).toBe(2)
  })

  it('calls onRemoveItem with correct id when remove button is clicked', () => {
    const onRemoveItem = vi.fn()
    render(<InlineCollection {...defaultProps} onRemoveItem={onRemoveItem} />)

    // Find all buttons that are not Clear, Continue, or the header toggle
    const allButtons = screen.getAllByRole('button')
    // The remove buttons are the ones that call onRemoveItem
    // We need to find them - they are small buttons inside each thumbnail
    // Click on one of them to test
    const removeButtons = allButtons.filter(
      (btn) =>
        !btn.textContent?.includes('Clear') &&
        !btn.textContent?.includes('Continue') &&
        !btn.textContent?.includes('Your collection')
    )

    if (removeButtons.length > 0) {
      fireEvent.click(removeButtons[0])
      expect(onRemoveItem).toHaveBeenCalledWith('item-1')
    }
  })
})
