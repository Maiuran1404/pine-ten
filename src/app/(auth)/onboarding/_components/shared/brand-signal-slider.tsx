'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { type BRAND_SIGNAL_SLIDERS } from '@/app/(auth)/onboarding/_constants/sliders'

export function BrandSignalSlider({
  slider,
  value,
  onChange,
  accentColor: _accentColor = 'var(--crafted-olive)',
}: {
  slider: (typeof BRAND_SIGNAL_SLIDERS)[0]
  value: number
  onChange: (value: number) => void
  accentColor?: string
}) {
  const numSteps = slider.levels.length
  const sliderRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Get current level index and label
  const getLevelIndex = (val: number) => {
    const stepSize = 100 / (numSteps - 1)
    return Math.round(val / stepSize)
  }

  const currentLevelIndex = getLevelIndex(value)
  const currentLevel = slider.levels[currentLevelIndex]

  // Snap value to nearest step
  const snapToStep = (val: number) => {
    const stepSize = 100 / (numSteps - 1)
    const stepIndex = Math.round(val / stepSize)
    return Math.min(Math.max(stepIndex * stepSize, 0), 100)
  }

  // Calculate value from mouse/touch position
  const getValueFromPosition = (clientX: number) => {
    if (!sliderRef.current) return value
    const rect = sliderRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percentage = Math.min(Math.max((x / rect.width) * 100, 0), 100)
    return snapToStep(percentage)
  }

  // Handle pointer down
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    const newValue = getValueFromPosition(e.clientX)
    onChange(newValue)
  }

  // Handle pointer move
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    const newValue = getValueFromPosition(e.clientX)
    onChange(newValue)
  }

  // Handle pointer up
  const handlePointerUp = () => {
    setIsDragging(false)
  }

  return (
    <div className="space-y-2">
      {/* Slider header */}
      <div className="flex justify-between items-center">
        <span className="text-white text-sm font-medium">{slider.name}</span>
        <motion.span
          key={currentLevel}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-xs font-medium px-2.5 py-1 rounded-full text-crafted-olive"
          style={{
            background: 'color-mix(in srgb, var(--crafted-olive) 15%, transparent)',
            border: '1px solid color-mix(in srgb, var(--crafted-olive) 30%, transparent)',
          }}
        >
          {currentLevel}
        </motion.span>
      </div>

      {/* Labels */}
      <div className="flex justify-between text-[11px] text-white/40 font-medium">
        <span>{slider.leftLabel}</span>
        <span>{slider.rightLabel}</span>
      </div>

      {/* Slider track */}
      <div
        ref={sliderRef}
        className="relative h-10 flex items-center cursor-pointer select-none touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Track background */}
        <div className="absolute inset-x-0 h-1 rounded-full bg-white/10" />

        {/* Filled track */}
        <motion.div
          className="absolute left-0 h-1 rounded-full bg-crafted-olive"
          initial={false}
          animate={{ width: `${value}%` }}
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        />

        {/* Step indicators */}
        <div className="absolute inset-x-0 flex justify-between pointer-events-none">
          {slider.levels.map((_, index) => {
            const stepPosition = (index / (numSteps - 1)) * 100
            const isActive = value >= stepPosition

            return (
              <div
                key={index}
                className="w-0.5 h-3 rounded-full transition-colors duration-150"
                style={{
                  backgroundColor: isActive
                    ? 'color-mix(in srgb, var(--crafted-olive) 80%, transparent)'
                    : 'rgba(255, 255, 255, 0.2)',
                }}
              />
            )
          })}
        </div>

        {/* Thumb */}
        <motion.div
          className="absolute pointer-events-none"
          initial={false}
          animate={{ left: `${value}%` }}
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        >
          <motion.div
            className="relative rounded-full -ml-2.5 bg-crafted-olive"
            style={{
              width: '20px',
              height: '20px',
              boxShadow: isDragging
                ? '0 2px 12px color-mix(in srgb, var(--crafted-olive) 50%, transparent)'
                : '0 2px 8px color-mix(in srgb, var(--crafted-olive) 30%, transparent)',
            }}
            animate={{
              scale: isDragging ? 1.2 : 1,
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            {/* Inner dot */}
            <div
              className="absolute rounded-full"
              style={{
                width: '6px',
                height: '6px',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
              }}
            />
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
