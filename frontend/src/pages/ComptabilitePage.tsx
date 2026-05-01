import { useState } from 'react'
import { toast } from 'sonner'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import httpClient from '@/services/httpClient'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const MOIS = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
]

export default function ComptabilitePage() {
  const now = new Date()
  const [année, setAnnée] = useState(now.getFullYear())
  const [mois, setMois] = useState(now.getMonth() + 1)
  const [loading, setLoading] = useState<'xlsx' | 'csv' | null>(null)

  async function handleExport(format: 'xlsx' | 'csv') {
    setLoading(format)
    const moisStr = `${année}-${String(mois).padStart(2, '0')}`
    try {
      const response = await httpClient.get('/comptabilite/export', {
        params: { mois: moisStr, format },
        responseType: 'blob',
      })
      const mime = format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv'
      const blob = new Blob([response.data], { type: mime })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `grand-livre-${moisStr}.${format}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Export ${format.toUpperCase()} téléchargé`)
    } catch {
      toast.error('Erreur lors de l\'export')
    } finally {
      setLoading(null)
    }
  }

  const années = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Export comptabilité"
        subtitle="Exportez le grand livre mensuel pour Sage ou votre comptable"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sélectionner la période</CardTitle>
          <CardDescription>Le grand livre inclut : ventes, paiements, achats stock, salaires</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-1 space-y-1">
              <Label>Mois</Label>
              <Select value={String(mois)} onValueChange={v => setMois(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOIS.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-32 space-y-1">
              <Label>Année</Label>
              <Select value={String(année)} onValueChange={v => setAnnée(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {années.map(a => (
                    <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={() => handleExport('xlsx')}
              disabled={loading !== null}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {loading === 'xlsx' ? 'Export…' : 'Excel (.xlsx)'}
              {loading !== 'xlsx' && <Download className="ml-auto h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleExport('csv')}
              disabled={loading !== null}
            >
              <FileText className="mr-2 h-4 w-4" />
              {loading === 'csv' ? 'Export…' : 'CSV Sage (.csv)'}
              {loading !== 'csv' && <Download className="ml-auto h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Journaux inclus</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { code: 'VTE', label: 'Ventes', desc: 'Factures émises — 411 / 706 / 44571' },
              { code: 'BAN', label: 'Banque / Caisse', desc: 'Paiements reçus — 5141 / 5311 / 411' },
              { code: 'ACH', label: 'Achats', desc: 'Réceptions stock — 370 / 401' },
              { code: 'OD', label: 'Opérations diverses', desc: 'Salaires — 6411 / 431 / 5141' },
            ].map(j => (
              <div key={j.code} className="rounded border p-3">
                <p className="font-mono font-semibold text-primary">{j.code}</p>
                <p className="font-medium">{j.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{j.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Comptes selon le Plan Comptable Général algérien (SCF). TVA collectée 19% (taux standard DZ).
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
