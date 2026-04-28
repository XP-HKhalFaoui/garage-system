import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { LogIn, LogOut } from 'lucide-react'
import { pointageService, employeService } from '../../services/rhService'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'

export default function PointagePage() {
  const qc = useQueryClient()
  const [selectedEmploye, setSelectedEmploye] = useState<string>('')

  const { data: présents } = useQuery({
    queryKey: ['pointage-aujourd-hui'],
    queryFn: pointageService.getAujourdHui,
    refetchInterval: 30_000,
  })

  const { data: employes } = useQuery({
    queryKey: ['employes-actifs'],
    queryFn: () => employeService.getList({ actif: true, pageSize: 100 }),
  })

  const entreeMut = useMutation({
    mutationFn: (id: string) => pointageService.entree(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pointage-aujourd-hui'] }),
  })

  const sortieMut = useMutation({
    mutationFn: (id: string) => pointageService.sortie(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pointage-aujourd-hui'] }),
  })

  const today = new Date().toLocaleDateString('fr-DZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pointage"
        subtitle={<span className="capitalize">{today}</span>}
        actions={
          <div className="flex gap-2 items-center">
            <Select value={selectedEmploye} onValueChange={setSelectedEmploye}>
              <SelectTrigger className="w-52"><SelectValue placeholder="— Sélectionner —" /></SelectTrigger>
              <SelectContent>
                {employes?.items.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.nomComplet}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              disabled={!selectedEmploye || entreeMut.isPending}
              onClick={() => selectedEmploye && entreeMut.mutate(selectedEmploye)}
              className="bg-green-600 hover:bg-green-700"
            >
              <LogIn className="h-4 w-4 mr-1.5" />
              Entrée
            </Button>
            <Button
              variant="destructive"
              disabled={!selectedEmploye || sortieMut.isPending}
              onClick={() => selectedEmploye && sortieMut.mutate(selectedEmploye)}
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              Sortie
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
          <CardContent className="pt-4">
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">Présents</p>
            <p className="text-3xl font-bold text-green-700 dark:text-green-300">{présents?.présents.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <CardContent className="pt-4">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">Absents</p>
            <p className="text-3xl font-bold text-red-700 dark:text-red-300">{présents?.absents.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
          <CardContent className="pt-4">
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total actifs</p>
            <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
              {(présents?.présents.length ?? 0) + (présents?.absents.length ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card className="overflow-hidden">
          <div className="bg-green-600 text-white px-4 py-3 font-medium text-sm">Présents aujourd'hui</div>
          <div className="divide-y divide-border">
            {présents?.présents.length === 0 && (
              <p className="px-4 py-6 text-center text-muted-foreground text-sm">Aucun pointage</p>
            )}
            {présents?.présents.map(p => (
              <div key={p.id} className="px-4 py-3 flex items-center justify-between">
                <span className="font-medium text-sm">{p.nomComplet}</span>
                <span className="text-sm text-green-600 font-medium">Entrée {p.heureEntrée}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="bg-red-500 text-white px-4 py-3 font-medium text-sm">Absents aujourd'hui</div>
          <div className="divide-y divide-border">
            {présents?.absents.length === 0 && (
              <p className="px-4 py-6 text-center text-muted-foreground text-sm">Tous présents !</p>
            )}
            {présents?.absents.map(a => (
              <div key={a.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{a.nomComplet}</p>
                  <p className="text-xs text-muted-foreground">{a.poste}</p>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs text-green-600 border-green-300 hover:bg-green-50"
                  onClick={() => entreeMut.mutate(a.id)}>
                  Pointer
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
