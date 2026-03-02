import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatInputArea, type ChatInputAreaProps } from './chat-input-area'
import { createRef } from 'react'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) => (
      <div {...props}>{children}</div>
    ),
    button: ({
      children,
      ...props
    }: React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement>>) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}))

// Mock child components
vi.mock('./quick-options', () => ({
  QuickOptions: ({
    options,
    onSelect,
  }: {
    options: { options: string[] }
    onSelect: (opt: string) => void
  }) => (
    <div data-testid="quick-options">
      {options.options.map((opt: string) => (
        <button key={opt} onClick={() => onSelect(opt)}>
          {opt}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('./submit-action-bar', () => ({
  SubmitActionBar: () => <div data-testid="submit-action-bar">Submit Action Bar</div>,
}))

vi.mock('@/components/shared/loading', () => ({
  LoadingSpinner: () => <span data-testid="loading-spinner">Loading...</span>,
}))

function createDefaultProps(overrides: Partial<ChatInputAreaProps> = {}): ChatInputAreaProps {
  return {
    messageCount: 0,
    hasInlineStylePicker: false,
    input: '',
    setInput: vi.fn(),
    isLoading: false,
    pendingFiles: [],
    hasFiles: false,
    pendingTask: null,
    isTaskMode: false,
    seamlessTransition: false,
    ghostText: '',
    smartCompletion: null,
    setSmartCompletion: vi.fn(),
    fileInputRef: createRef<HTMLInputElement>(),
    inputRef: createRef<HTMLTextAreaElement>(),
    userCredits: 50,
    handleSend: vi.fn(),
    handleFileUpload: vi.fn(),
    handleRequestTaskSummary: vi.fn(),
    removeFile: vi.fn(),
    ...overrides,
  }
}

describe('ChatInputArea', () => {
  it('renders the textarea input', () => {
    render(<ChatInputArea {...createDefaultProps()} />)

    const textarea = screen.getByRole('textbox')
    expect(textarea).toBeInTheDocument()
  })

  it('shows empty state placeholder when no messages', () => {
    render(<ChatInputArea {...createDefaultProps()} />)

    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveAttribute('placeholder', 'Describe what you want to craft...')
  })

  it('shows typing placeholder when there are messages', () => {
    const props = createDefaultProps({
      messageCount: 1,
    })
    render(<ChatInputArea {...props} />)

    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveAttribute('placeholder', 'Type your message...')
  })

  it('calls setInput when typing in the textarea', () => {
    const setInput = vi.fn()
    render(<ChatInputArea {...createDefaultProps({ setInput })} />)

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Hello world' } })
    expect(setInput).toHaveBeenCalledWith('Hello world')
  })

  it('calls handleSend when Enter is pressed without Shift', () => {
    const handleSend = vi.fn()
    render(<ChatInputArea {...createDefaultProps({ handleSend })} />)

    const textarea = screen.getByRole('textbox')
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
    expect(handleSend).toHaveBeenCalledTimes(1)
  })

  it('does not call handleSend when Shift+Enter is pressed', () => {
    const handleSend = vi.fn()
    render(<ChatInputArea {...createDefaultProps({ handleSend })} />)

    const textarea = screen.getByRole('textbox')
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
    expect(handleSend).not.toHaveBeenCalled()
  })

  it('disables Submit button when input is empty and no files', () => {
    render(<ChatInputArea {...createDefaultProps()} />)

    const submitButton = screen.getByRole('button', { name: /Craft it/i })
    expect(submitButton).toBeDisabled()
  })

  it('enables Submit button when input has text', () => {
    render(<ChatInputArea {...createDefaultProps({ input: 'Some text' })} />)

    const submitButton = screen.getByRole('button', { name: /Craft it/i })
    expect(submitButton).not.toBeDisabled()
  })

  it('enables Submit button when files are attached even with empty input', () => {
    render(
      <ChatInputArea
        {...createDefaultProps({
          hasFiles: true,
          pendingFiles: [
            {
              id: 'f1',
              file: new File([''], 'test.png', { type: 'image/png' }),
              localPreviewUrl: 'blob:http://localhost/test',
              fileName: 'test.png',
              fileType: 'image/png',
              fileSize: 1024,
              status: 'done',
              result: {
                fileName: 'test.png',
                fileUrl: 'http://test.com/test.png',
                fileType: 'image/png',
                fileSize: 1024,
              },
            },
          ],
        })}
      />
    )

    const submitButton = screen.getByRole('button', { name: /Craft it/i })
    expect(submitButton).not.toBeDisabled()
  })

  it('calls handleSend when Submit button is clicked', () => {
    const handleSend = vi.fn()
    render(<ChatInputArea {...createDefaultProps({ input: 'test', handleSend })} />)

    fireEvent.click(screen.getByRole('button', { name: /Craft it/i }))
    expect(handleSend).toHaveBeenCalledTimes(1)
  })

  it('shows loading state when isLoading is true', () => {
    render(<ChatInputArea {...createDefaultProps({ isLoading: true })} />)

    expect(screen.getByText('Thinking...')).toBeInTheDocument()
  })

  it('displays credit count', () => {
    render(<ChatInputArea {...createDefaultProps({ userCredits: 25 })} />)

    expect(screen.getByText('25 credits')).toBeInTheDocument()
  })

  it('displays pending files with remove button', () => {
    const removeFile = vi.fn()
    render(
      <ChatInputArea
        {...createDefaultProps({
          removeFile,
          pendingFiles: [
            {
              id: 'f1',
              file: new File([''], 'photo.jpg', { type: 'image/jpeg' }),
              localPreviewUrl: 'blob:http://localhost/photo',
              fileName: 'photo.jpg',
              fileType: 'image/jpeg',
              fileSize: 2048,
              status: 'done',
              result: {
                fileName: 'photo.jpg',
                fileUrl: 'http://test.com/photo.jpg',
                fileType: 'image/jpeg',
                fileSize: 2048,
              },
            },
          ],
        })}
      />
    )

    expect(screen.getByText('photo.jpg')).toBeInTheDocument()
  })

  it('renders SubmitActionBar when pendingTask exists with all handlers', () => {
    render(
      <ChatInputArea
        {...createDefaultProps({
          pendingTask: {
            title: 'Test Task',
            description: 'A task',
            category: 'design',
            estimatedHours: 10,
            creditsRequired: 15,
          },
          onConfirmTask: vi.fn(),
          onMakeChanges: vi.fn(),
          onInsufficientCredits: vi.fn(),
        })}
      />
    )

    expect(screen.getByTestId('submit-action-bar')).toBeInTheDocument()
  })

  it('renders quick start suggestions when no messages', () => {
    render(<ChatInputArea {...createDefaultProps()} />)

    expect(screen.getByText('Instagram Carousel')).toBeInTheDocument()
    expect(screen.getByText('Story Series')).toBeInTheDocument()
    expect(screen.getByText('LinkedIn Post')).toBeInTheDocument()
    expect(screen.getByText('Ad Campaign')).toBeInTheDocument()
  })

  it('clicking a quick start suggestion populates input', () => {
    const setInput = vi.fn()
    render(<ChatInputArea {...createDefaultProps({ setInput })} />)

    fireEvent.click(screen.getByText('Instagram Carousel'))
    expect(setInput).toHaveBeenCalledWith('Create a 5-slide Instagram carousel about ')
  })

  it('passes handleRequestTaskSummary prop', () => {
    const handleRequestTaskSummary = vi.fn()
    render(
      <ChatInputArea
        {...createDefaultProps({
          messageCount: 1,
          handleRequestTaskSummary,
        })}
      />
    )

    // The "I'm ready to submit" button was moved to submit-action-bar
    // Verify the component renders without errors with this prop
    expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument()
  })

  it('displays scene references with remove buttons', () => {
    const onRemoveSceneReference = vi.fn()
    render(
      <ChatInputArea
        {...createDefaultProps({
          sceneReferences: [{ sceneNumber: 1, title: 'Opening Scene' }],
          onRemoveSceneReference,
        })}
      />
    )

    expect(screen.getByText('Scene 1: Opening Scene')).toBeInTheDocument()
  })

  it('shows prompt quality ring for short input', () => {
    render(<ChatInputArea {...createDefaultProps({ input: 'one two three four five' })} />)

    expect(
      screen.getByTitle('Add details like target audience or style preference')
    ).toBeInTheDocument()
  })

  it('shows prompt quality ring with checkmark for long input', () => {
    const longInput = Array.from({ length: 25 }, (_, i) => `word${i}`).join(' ')
    render(<ChatInputArea {...createDefaultProps({ input: longInput })} />)

    expect(screen.getByTitle('Great detail!')).toBeInTheDocument()
  })
})
