import { cn } from '@/lib/utils'

interface Props { state: string }

const CONFIG: Record<string, { dot: string; text: string; label: string }> = {
  connected:    { dot: 'bg-green-500',  text: 'text-green-600 dark:text-green-400',  label: 'Temps réel' },
  reconnecting: { dot: 'bg-amber-500',  text: 'text-amber-600 dark:text-amber-400',  label: 'Reconnexion…' },
  connecting:   { dot: 'bg-amber-500',  text: 'text-amber-600 dark:text-amber-400',  label: 'Connexion…' },
  disconnected: { dot: 'bg-red-500',    text: 'text-red-600 dark:text-red-400',      label: 'Hors ligne' },
}

export function SignalRIndicator({ state }: Props) {
  const { dot, text, label } = CONFIG[state] ?? CONFIG.disconnected
  return (
    <span className={cn('flex items-center gap-1.5 text-xs font-medium', text)}>
      <span className={cn('inline-block h-2 w-2 rounded-full', dot)} />
      {label}
    </span>
  )
}
