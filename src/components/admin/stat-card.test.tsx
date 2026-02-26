import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatCard } from './stat-card'
import { Users, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react'

describe('StatCard', () => {
  it('renders label and numeric value', () => {
    render(<StatCard label="Total Users" value={1234} icon={Users} />)

    expect(screen.getByText('Total Users')).toBeInTheDocument()
    expect(screen.getByText('1234')).toBeInTheDocument()
  })

  it('renders string value', () => {
    render(<StatCard label="Revenue" value="$12,500" icon={DollarSign} />)

    expect(screen.getByText('Revenue')).toBeInTheDocument()
    expect(screen.getByText('$12,500')).toBeInTheDocument()
  })

  it('renders subtext when provided', () => {
    render(
      <StatCard label="Active Users" value={500} subtext="+12% from last month" icon={Users} />
    )

    expect(screen.getByText('+12% from last month')).toBeInTheDocument()
  })

  it('does not render subtext when not provided', () => {
    const { container } = render(<StatCard label="Tasks" value={42} icon={Users} />)

    // Only label and value text elements should be present
    expect(screen.getByText('Tasks')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    // The subtext paragraph should not exist
    const paragraphs = container.querySelectorAll('p')
    expect(paragraphs.length).toBe(2) // label + value
  })

  it('applies up trend styling', () => {
    const { container } = render(
      <StatCard label="Revenue" value={100} icon={TrendingUp} trend="up" />
    )

    const iconContainer = container.querySelector('.bg-ds-success\\/10')
    expect(iconContainer).toBeInTheDocument()
  })

  it('applies down trend styling', () => {
    const { container } = render(
      <StatCard label="Churn" value={5} icon={TrendingUp} trend="down" />
    )

    const iconContainer = container.querySelector('.bg-ds-error\\/10')
    expect(iconContainer).toBeInTheDocument()
  })

  it('applies warning trend styling', () => {
    const { container } = render(
      <StatCard label="Alerts" value={3} icon={AlertTriangle} trend="warning" />
    )

    const iconContainer = container.querySelector('.bg-ds-warning\\/10')
    expect(iconContainer).toBeInTheDocument()
  })

  it('applies neutral/default styling when no trend', () => {
    const { container } = render(<StatCard label="Total" value={999} icon={Users} />)

    const iconContainer = container.querySelector('.bg-primary\\/10')
    expect(iconContainer).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <StatCard label="Test" value={0} icon={Users} className="custom-stat-class" />
    )

    // The Card component should have the custom class
    expect(container.firstChild).toHaveClass('custom-stat-class')
  })

  it('renders the icon component', () => {
    const { container } = render(<StatCard label="Users" value={100} icon={Users} />)

    // lucide-react renders SVG elements
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })
})
