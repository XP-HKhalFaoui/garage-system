import type { ORSummary } from '@/types/or'
import { ORTimer } from './ORTimer'

interface Props {
  or: ORSummary
  onClick?: () => void
  onAssigner?: (orId: string) => void
}

const PRIORITY_COLOR: Record<string, string> = {
  Normal: '#2563eb',
  Urgent: '#dc2626',
}

export function ORCard({ or, onClick, onAssigner }: Props) {
  const initiales = or.technicien
    ? `${or.technicien.prénom[0]}${or.technicien.nom[0]}`.toUpperCase()
    : null

  const isUrgentWaiting =
    or.priorité === 'Urgent' && or.statut === 'EnAttente'

  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: 8,
        padding: '0.75rem',
        boxShadow: '0 1px 4px rgba(0,0,0,.07)',
        border: isUrgentWaiting ? '1.5px solid #dc2626' : '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s',
      }}
    >
      {/* Row 1 — Numéro + Priorité */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          background: PRIORITY_COLOR[or.priorité],
          color: '#fff', fontSize: 11, fontWeight: 700,
          padding: '2px 8px', borderRadius: 12,
        }}>
          {or.numéro}
        </span>
        {or.priorité === 'Urgent' && (
          <span style={{
            background: '#fef2f2', color: '#dc2626',
            fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
          }}>
            ⚡ URGENT
          </span>
        )}
      </div>

      {/* Row 2 — Immatriculation */}
      <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: 1, color: '#0f172a' }}>
        {or.vehicule.immatriculation}
      </div>

      {/* Row 3 — Marque/Modèle */}
      <div style={{ fontSize: 12, color: '#64748b' }}>
        {or.vehicule.marque} {or.vehicule.modele} — {or.heureOuverture}
      </div>

      {/* Row 4 — Client + Téléphone */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
        <span style={{ fontWeight: 500 }}>{or.client.nom}</span>
        <a
          href={`tel:${or.client.téléphone}`}
          onClick={e => e.stopPropagation()}
          style={{ textDecoration: 'none', fontSize: 16 }}
          title={or.client.téléphone}
        >
          📞
        </a>
      </div>

      {/* Row 5 — Timer + Technicien */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <ORTimer orId={or.id} startTime={null} statut={or.statut} />
        {initiales ? (
          <div title={`${or.technicien!.prénom} ${or.technicien!.nom}`} style={{
            width: 28, height: 28, borderRadius: '50%',
            background: '#2563eb', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, flexShrink: 0,
          }}>
            {initiales}
          </div>
        ) : (
          <span style={{ color: '#f97316', fontSize: 11, fontWeight: 500 }}>Non assigné</span>
        )}
      </div>

      {/* Row 6 — Lignes + Montant */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
        <span>{or.nbLignes} ligne{or.nbLignes > 1 ? 's' : ''}</span>
        {or.montantEstimé > 0 && (
          <span style={{ fontWeight: 600, color: '#0f172a' }}>
            {or.montantEstimé.toLocaleString('fr-DZ')} DA
          </span>
        )}
      </div>

      {/* Bouton Assigner */}
      {or.statut === 'EnAttente' && onAssigner && (
        <button
          onClick={e => { e.stopPropagation(); onAssigner(or.id) }}
          style={{
            padding: '0.3rem 0.6rem', background: '#f1f5f9',
            border: '1px solid #cbd5e1', borderRadius: 6,
            cursor: 'pointer', fontSize: 12, fontWeight: 500,
            color: '#334155', marginTop: 2,
          }}
        >
          Assigner technicien →
        </button>
      )}
    </div>
  )
}
