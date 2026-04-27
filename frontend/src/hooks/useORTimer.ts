import { useEffect, useRef, useState } from 'react'
import type { ORStatut } from '@/types/or'

export type TimerColor = 'green' | 'orange' | 'red'

function toSeconds(totalSec: number) {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function useORTimer(
  orId: string,
  statut: ORStatut,
  startTime: string | null,
  accumulatedMinutes = 0,
) {
  const [display, setDisplay]   = useState('--:--:--')
  const [color, setColor]       = useState<TimerColor>('green')
  const intervalRef             = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    if (statut === 'EnCours' && startTime) {
      const startMs = new Date(startTime).getTime()
      const base    = accumulatedMinutes * 60

      const tick = () => {
        const elapsed = base + Math.floor((Date.now() - startMs) / 1000)
        setDisplay(toSeconds(elapsed))
        const h = elapsed / 3600
        setColor(h < 2 ? 'green' : h < 4 ? 'orange' : 'red')
      }

      tick()
      intervalRef.current = setInterval(tick, 1000)
    } else if (statut === 'Suspendu') {
      setDisplay(toSeconds(accumulatedMinutes * 60))
      setColor('orange')
    } else {
      setDisplay('--:--:--')
      setColor('green')
    }

    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [orId, statut, startTime, accumulatedMinutes])

  return { display, color }
}
