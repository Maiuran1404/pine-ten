interface SectionCardProps {
  title: string
  description?: string
  children: React.ReactNode
}

export function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </div>
      {children}
    </div>
  )
}
