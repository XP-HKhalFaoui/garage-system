interface Props {
  stockActuel: number
  stockMinimum: number
}

export function StockBadge({ stockActuel, stockMinimum }: Props) {
  let color: string
  let label: string

  if (stockActuel <= stockMinimum) {
    color = '#dc2626'
    label = '⚠ Stock bas'
  } else if (stockActuel <= stockMinimum * 1.5) {
    color = '#d97706'
    label = 'Faible'
  } else {
    color = '#16a34a'
    label = 'OK'
  }

  return (
    <span style={{
      padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700,
      background: color + '1a', color, border: `1px solid ${color}40`,
    }}>
      {label}
    </span>
  )
}
