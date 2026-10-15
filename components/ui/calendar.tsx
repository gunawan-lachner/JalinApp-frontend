'use client'

import * as React from 'react'
import { DayPicker } from 'react-day-picker'

import { cn } from '@/lib/utils'

function Calendar({ className, ...props }: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      className={cn('bg-background p-3', className)}
      {...props}
    />
  )
}

export { Calendar }
