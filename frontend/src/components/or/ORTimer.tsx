import { useORTimer, type TimerColor } from '@/hooks/useORTimer'
import type { ORStatut } from '@/types/or'

interface Props {
  orId: string
  startTime: string | null
  statut: ORStatut
  accumulatedMinutes?: number
}

const colorMap: Record<TimerColor, string> = {
  green:  '#16a34a',
  orange: '#d97706',
  red:    '#dc2626',
}

export function ORTimer({ orId, startTime, statut, accumulatedMinutes }: Props) {
  const { display, color } = useORTimer(orId, statut, startTime, accumulatedMinutes)
  return (
    <span
      title="Temps passé sur cet OR"
      style={{ fontFamily: 'monospace', fontWeight: 600, color: colorMap[color], fontSize: 12 }}
    >
      ⏱ {display}
    </span>
  )
}
