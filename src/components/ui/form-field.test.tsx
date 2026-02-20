import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  FormField,
  TextInputField,
  TextAreaField,
  SubmitButton,
  FormSection,
  FormFeedback,
} from './form-field'
import { Input } from './input'

describe('FormField', () => {
  it('renders label and children', () => {
    render(
      <FormField label="Email" name="email">
        <Input placeholder="Enter email" />
      </FormField>
    )

    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument()
  })

  it('shows required asterisk when required', () => {
    render(
      <FormField label="Name" name="name" required>
        <Input />
      </FormField>
    )

    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('does not show asterisk when not required', () => {
    render(
      <FormField label="Nickname" name="nickname">
        <Input />
      </FormField>
    )

    expect(screen.queryByText('*')).not.toBeInTheDocument()
  })

  it('shows error message when error prop is provided', () => {
    render(
      <FormField label="Email" name="email" error="Invalid email address">
        <Input />
      </FormField>
    )

    expect(screen.getByText('Invalid email address')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('shows helper text when no error', () => {
    render(
      <FormField label="Username" name="username" helperText="Must be at least 3 characters">
        <Input />
      </FormField>
    )

    expect(screen.getByText('Must be at least 3 characters')).toBeInTheDocument()
  })

  it('does not show helper text when error is present', () => {
    render(
      <FormField
        label="Username"
        name="username"
        error="Too short"
        helperText="Must be at least 3 characters"
      >
        <Input />
      </FormField>
    )

    expect(screen.getByText('Too short')).toBeInTheDocument()
    expect(screen.queryByText('Must be at least 3 characters')).not.toBeInTheDocument()
  })

  it('sets aria-invalid on child when error exists', () => {
    render(
      <FormField label="Email" name="email" error="Required">
        <Input />
      </FormField>
    )

    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('applies custom className', () => {
    const { container } = render(
      <FormField label="Test" name="test" className="my-class">
        <Input />
      </FormField>
    )

    expect(container.firstChild).toHaveClass('my-class')
  })
})

describe('TextInputField', () => {
  it('renders label and input', () => {
    render(<TextInputField label="Full Name" name="fullName" />)

    expect(screen.getByText('Full Name')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('shows error message', () => {
    render(<TextInputField label="Email" name="email" error="Invalid email" />)

    expect(screen.getByText('Invalid email')).toBeInTheDocument()
  })

  it('shows helper text', () => {
    render(<TextInputField label="Username" name="username" helperText="Choose wisely" />)

    expect(screen.getByText('Choose wisely')).toBeInTheDocument()
  })

  it('passes input props through', () => {
    render(<TextInputField label="Phone" name="phone" placeholder="555-1234" type="tel" />)

    const input = screen.getByPlaceholderText('555-1234')
    expect(input).toHaveAttribute('type', 'tel')
  })
})

describe('TextAreaField', () => {
  it('renders label and textarea', () => {
    render(<TextAreaField label="Description" name="description" />)

    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('shows error message', () => {
    render(<TextAreaField label="Bio" name="bio" error="Too long" />)

    expect(screen.getByText('Too long')).toBeInTheDocument()
  })

  it('shows character count when showCount and maxLength are provided', () => {
    render(
      <TextAreaField
        label="Bio"
        name="bio"
        value="Hello"
        showCount
        maxLength={100}
        onChange={vi.fn()}
      />
    )

    expect(screen.getByText('5/100')).toBeInTheDocument()
  })

  it('does not show character count when showCount is false', () => {
    render(
      <TextAreaField label="Bio" name="bio" value="Hello" maxLength={100} onChange={vi.fn()} />
    )

    expect(screen.queryByText('5/100')).not.toBeInTheDocument()
  })
})

describe('SubmitButton', () => {
  it('renders children text by default', () => {
    render(<SubmitButton>Save Changes</SubmitButton>)

    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(<SubmitButton isLoading>Save</SubmitButton>)

    expect(screen.getByText('Saving...')).toBeInTheDocument()
  })

  it('shows custom loading text', () => {
    render(
      <SubmitButton isLoading loadingText="Processing...">
        Submit
      </SubmitButton>
    )

    expect(screen.getByText('Processing...')).toBeInTheDocument()
  })

  it('shows success state', () => {
    render(<SubmitButton isSuccess>Save</SubmitButton>)

    expect(screen.getByText('Saved!')).toBeInTheDocument()
  })

  it('shows custom success text', () => {
    render(
      <SubmitButton isSuccess successText="Done!">
        Save
      </SubmitButton>
    )

    expect(screen.getByText('Done!')).toBeInTheDocument()
  })

  it('is disabled when isLoading', () => {
    render(<SubmitButton isLoading>Save</SubmitButton>)

    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is disabled when disabled prop is true', () => {
    render(<SubmitButton disabled>Save</SubmitButton>)

    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('has type="submit"', () => {
    render(<SubmitButton>Save</SubmitButton>)

    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('calls onClick handler', () => {
    const onClick = vi.fn()
    render(<SubmitButton onClick={onClick}>Save</SubmitButton>)

    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('FormSection', () => {
  it('renders title and children', () => {
    render(
      <FormSection title="Personal Info">
        <p>Form fields here</p>
      </FormSection>
    )

    expect(screen.getByText('Personal Info')).toBeInTheDocument()
    expect(screen.getByText('Form fields here')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(
      <FormSection title="Settings" description="Configure your preferences">
        <p>Content</p>
      </FormSection>
    )

    expect(screen.getByText('Configure your preferences')).toBeInTheDocument()
  })

  it('does not render description when not provided', () => {
    const { container } = render(
      <FormSection title="Settings">
        <p>Content</p>
      </FormSection>
    )

    const paragraphs = container.querySelectorAll('p')
    // Only the "Content" paragraph, no description
    expect(paragraphs.length).toBe(1)
  })
})

describe('FormFeedback', () => {
  it('renders success message', () => {
    render(<FormFeedback type="success" message="Changes saved successfully" />)

    expect(screen.getByText('Changes saved successfully')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders error message with alert role', () => {
    render(<FormFeedback type="error" message="Something went wrong" />)

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('renders info message', () => {
    render(<FormFeedback type="info" message="Please note this change" />)

    expect(screen.getByText('Please note this change')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <FormFeedback type="success" message="OK" className="custom-feedback" />
    )

    expect(container.firstChild).toHaveClass('custom-feedback')
  })
})
