import { useState } from 'react'

export interface CardColumns {
  count: number
  manuallySet: boolean
}

export default function useCardColumns(value?: CardColumns, onChange?: (value: CardColumns) => void) {
  const [localValue, setLocalValue] = useState<CardColumns>({ count: 4, manuallySet: false })
  return [value ?? localValue, onChange ?? setLocalValue] as const
}
