interface Props { state: string }

const config: Record<string, { color: string; label: string }> = {
  connected:    { color: '#16a34a', label: 'Temps réel' },
  reconnecting: { color: '#d97706', label: 'Reconnexion…' },
  connecting:   { color: '#d97706', label: 'Connexion…' },
  disconnected: { color: '#dc2626', label: 'Hors ligne' },
}

export function SignalRIndicator({ state }: Props) {
  const { color, label } = config[state] ?? config.disconnected
  return (
    <span style={{ fontSize: 12, color, display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{
        display: 'inline-block', width: 8, height: 8,
        borderRadius: '50%', background: color,
      }} />
      {label}
    </span>
  )
}
