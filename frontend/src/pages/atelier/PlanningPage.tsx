import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format, addWeeks, subWeeks, startOfWeek, addDays, addMinutes, differenceInMinutes, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CalendarDays, GripVertical } from 'lucide-react'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { toast } from 'sonner'
import { planningService, type PlanningOR } from '@/services/planningService'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const HOUR_START = 8
const HOUR_END = 19
const SLOT_MINUTES = 30
const SLOT_HEIGHT = 28 // px par slot 30min
const SLOTS_COUNT = ((HOUR_END - HOUR_START) * 60) / SLOT_MINUTES

const COLORS: Record<string, string> = {
  Vidange: 'bg-blue-100 border-blue-400 text-blue-900',
  Révision: 'bg-green-100 border-green-400 text-green-900',
  Diagnostic: 'bg-yellow-100 border-yellow-400 text-yellow-900',
  Freinage: 'bg-red-100 border-red-400 text-red-900',
  Distribution: 'bg-purple-100 border-purple-400 text-purple-900',
  Climatisation: 'bg-cyan-100 border-cyan-400 text-cyan-900',
  Autre: 'bg-gray-100 border-gray-400 text-gray-900',
}

function getColor(type: string) {
  return COLORS[type] ?? COLORS['Autre']
}

function minutesToTop(minutes: number) {
  const offsetMin = minutes - HOUR_START * 60
  return (offsetMin / SLOT_MINUTES) * SLOT_HEIGHT
}

function durationToHeight(durationMin: number) {
  return Math.max((durationMin / SLOT_MINUTES) * SLOT_HEIGHT, SLOT_HEIGHT)
}

// ─── Bloc OR draggable ────────────────────────────────────────────────────────
function ORBloc({ or, hasConflict }: { or: PlanningOR; hasConflict: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: or.id })

  const start = parseISO(or.heureDebut)
  const end = or.heureFin ? parseISO(or.heureFin) : addMinutes(start, 60)
  const startMin = start.getHours() * 60 + start.getMinutes()
  const duration = differenceInMinutes(end, start)

  const top = minutesToTop(startMin)
  const height = durationToHeight(duration)
  const colorClass = getColor(or.typeIntervention)

  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'absolute',
        top,
        left: 2,
        right: 2,
        height,
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        zIndex: isDragging ? 50 : 10,
        opacity: isDragging ? 0.7 : 1,
      }}
      className={cn(
        'rounded border text-xs px-1 py-0.5 overflow-hidden select-none cursor-grab flex flex-col',
        colorClass,
        hasConflict && 'ring-2 ring-red-500'
      )}
      {...attributes}
      {...listeners}
    >
      <span className="font-semibold truncate">{or.numéro}</span>
      <span className="truncate opacity-80">{or.marque} {or.immatriculation}</span>
      <span className="truncate opacity-70">{or.typeIntervention}</span>
    </div>
  )
}

// ─── Colonne d'un technicien/jour ─────────────────────────────────────────────
function TechColumn({
  techId,
  dayIndex,
  ors,
  conflicts,
}: {
  techId: string
  dayIndex: number
  ors: PlanningOR[]
  conflicts: Set<string>
}) {
  const droppableId = `${techId}__${dayIndex}`
  const { setNodeRef, isOver } = useDroppable({ id: droppableId })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative border-r',
        'min-w-[120px] flex-1',
        isOver && 'bg-primary/5'
      )}
      style={{ height: SLOTS_COUNT * SLOT_HEIGHT }}
    >
      {/* Lignes de grille */}
      {Array.from({ length: SLOTS_COUNT }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'absolute left-0 right-0 border-t border-dashed',
            i % 2 === 0 ? 'border-border/60' : 'border-border/20'
          )}
          style={{ top: i * SLOT_HEIGHT }}
        />
      ))}
      {ors.map(or => (
        <ORBloc key={or.id} or={or} hasConflict={conflicts.has(or.id)} />
      ))}
    </div>
  )
}

// ─── Page principale ─────────────────────────────────────────────────────────
export default function PlanningPage() {
  const qc = useQueryClient()
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const weekEnd = addDays(weekStart, 5)
  const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i))

  const { data, isLoading } = useQuery({
    queryKey: ['planning', weekStart.toISOString()],
    queryFn: () => planningService.getWeek(weekStart, weekEnd),
  })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // Calcul conflits
  const conflictIds = new Set<string>()
  if (data?.planifiés) {
    const planifiés = data.planifiés.filter(o => o.technicienId && o.heureDebut && o.heureFin)
    for (let i = 0; i < planifiés.length; i++) {
      for (let j = i + 1; j < planifiés.length; j++) {
        const a = planifiés[i], b = planifiés[j]
        if (a.technicienId !== b.technicienId) continue
        const aStart = parseISO(a.heureDebut), aEnd = a.heureFin ? parseISO(a.heureFin) : addMinutes(aStart, 60)
        const bStart = parseISO(b.heureDebut), bEnd = b.heureFin ? parseISO(b.heureFin) : addMinutes(bStart, 60)
        if (aStart < bEnd && aEnd > bStart) {
          conflictIds.add(a.id)
          conflictIds.add(b.id)
        }
      }
    }
  }

  // Techniciens distincts
  const techniciens = Array.from(
    new Map(
      (data?.planifiés ?? [])
        .filter(o => o.technicienId)
        .map(o => [o.technicienId!, { id: o.technicienId!, nom: o.technicienNom! }])
    ).values()
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const orId = active.id as string
    const [techId, dayIndexStr] = (over.id as string).split('__')
    const dayIndex = parseInt(dayIndexStr)
    const targetDay = addDays(weekStart, dayIndex)

    const or = data?.planifiés.find(o => o.id === orId)
      ?? data?.nonPlanifiés.find(o => o.id === orId)
    if (!or) return

    const originalStart = or.heureDebut !== '' ? parseISO(or.heureDebut) : targetDay
    const duration = or.heureFin
      ? differenceInMinutes(parseISO(or.heureFin), originalStart)
      : 60

    const newStart = new Date(targetDay)
    newStart.setHours(originalStart.getHours(), originalStart.getMinutes(), 0, 0)
    const newEnd = addMinutes(newStart, duration)

    try {
      await planningService.replanifier(orId, newStart, newEnd, techId)
      toast.success('OR replanifié')
      qc.invalidateQueries({ queryKey: ['planning'] })
    } catch (e: any) {
      if (e.response?.status === 409) toast.error('Conflit de planning détecté')
      else toast.error('Erreur lors de la replanification')
    }
  }

  const timeLabels = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Planning atelier"
        subtitle="Vue Gantt hebdomadaire par technicien"
        actions={<div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(d => subWeeks(d, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            <CalendarDays className="mr-2 h-4 w-4" />
            Aujourd'hui
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(d => addWeeks(d, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium ml-2">
            Semaine du {format(weekStart, 'd MMM', { locale: fr })} au {format(weekEnd, 'd MMM yyyy', { locale: fr })}
          </span>
        </div>}
      />

      <div className="flex gap-4">
        {/* Sidebar — non planifiés */}
        <div className="w-52 shrink-0">
          <p className="text-sm font-semibold mb-2 text-muted-foreground">Non planifiés ({data?.nonPlanifiés.length ?? 0})</p>
          <div className="space-y-2">
            {isLoading && <Skeleton className="h-16" />}
            {data?.nonPlanifiés.map(or => (
              <div key={or.id} className="rounded border p-2 text-xs bg-card cursor-grab">
                <div className="flex items-center gap-1">
                  <GripVertical className="h-3 w-3 text-muted-foreground" />
                  <span className="font-semibold">{or.numéro}</span>
                </div>
                <p className="text-muted-foreground truncate">{or.marque} {or.immatriculation}</p>
                <Badge variant="outline" className="text-[10px] mt-1">{or.typeIntervention}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Gantt */}
        <div className="flex-1 overflow-auto rounded border bg-card">
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="flex">
              {/* En-tête des jours */}
              <div className="w-10 shrink-0" />
              {days.map((day, di) => (
                <div key={di} className="flex-1 min-w-[120px] text-center text-xs font-medium py-2 border-b border-r bg-muted/30">
                  {format(day, 'EEE d', { locale: fr })}
                </div>
              ))}
            </div>

            {isLoading ? (
              <Skeleton className="h-96 m-4" />
            ) : techniciens.length === 0 ? (
              <p className="text-center text-muted-foreground py-16 text-sm">Aucun OR planifié cette semaine</p>
            ) : (
              techniciens.map(tech => (
                <div key={tech.id} className="flex border-b">
                  {/* Label technicien */}
                  <div className="w-10 shrink-0 text-[10px] text-muted-foreground border-r bg-muted/10 flex items-center justify-center">
                    <span className="rotate-[-90deg] whitespace-nowrap">{tech.nom}</span>
                  </div>
                  {/* Colonne heure */}
                  <div className="w-8 shrink-0 border-r relative" style={{ height: SLOTS_COUNT * SLOT_HEIGHT }}>
                    {timeLabels.map(h => (
                      <div
                        key={h}
                        className="absolute right-1 text-[9px] text-muted-foreground"
                        style={{ top: ((h - HOUR_START) * 60 / SLOT_MINUTES) * SLOT_HEIGHT - 6 }}
                      >
                        {h}h
                      </div>
                    ))}
                  </div>
                  {/* Colonnes jours */}
                  {days.map((day, di) => {
                    const orsOfDay = (data?.planifiés ?? []).filter(o => {
                      if (o.technicienId !== tech.id) return false
                      const d = parseISO(o.heureDebut)
                      return d.getDate() === day.getDate() && d.getMonth() === day.getMonth()
                    })
                    return (
                      <TechColumn
                        key={di}
                        techId={tech.id}
                        dayIndex={di}
                        ors={orsOfDay}
                        conflicts={conflictIds}
                      />
                    )
                  })}
                </div>
              ))
            )}
          </DndContext>
        </div>
      </div>

      {conflictIds.size > 0 && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          ⚠ {conflictIds.size} OR en conflit de planning (bordure rouge)
        </p>
      )}
    </div>
  )
}
