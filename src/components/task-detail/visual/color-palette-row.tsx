interface ColorPaletteRowProps {
  colors: string[]
}

export function ColorPaletteRow({ colors }: ColorPaletteRowProps) {
  if (!colors || colors.length === 0) {
    return <p className="text-sm text-muted-foreground">No palette defined</p>
  }

  return (
    <div className="flex flex-wrap gap-4 overflow-x-auto">
      {colors.map((color) => (
        <div key={color} className="flex flex-col items-center gap-1.5 shrink-0">
          <div
            className="h-10 w-10 rounded-full border border-border/60 shadow-sm"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs font-mono text-muted-foreground">{color}</span>
        </div>
      ))}
    </div>
  )
}
