import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Bell, BellOff } from 'lucide-react'
import { pushService } from '@/services/pushService'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

export default function ParametresNotificationsPage() {
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setSupported(false)
      return
    }
    pushService.isSubscribed().then(setSubscribed)
  }, [])

  async function handleToggle(enabled: boolean) {
    setLoading(true)
    try {
      if (enabled) {
        const ok = await pushService.subscribe()
        if (ok) {
          setSubscribed(true)
          toast.success('Notifications activées')
        } else {
          toast.error('Permission refusée ou navigateur non supporté')
        }
      } else {
        await pushService.unsubscribe()
        setSubscribed(false)
        toast.success('Notifications désactivées')
      }
    } catch {
      toast.error('Erreur lors de la mise à jour des notifications')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Notifications" subtitle="Gérez vos préférences de notifications push" />

      {!supported && (
        <Card className="border-yellow-500/50">
          <CardContent className="pt-6 text-sm text-yellow-700">
            Votre navigateur ne supporte pas les notifications push.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {subscribed ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
            Notifications navigateur
            <Badge variant={subscribed ? 'default' : 'secondary'}>
              {subscribed ? 'Actif' : 'Inactif'}
            </Badge>
          </CardTitle>
          <CardDescription>
            Recevez des alertes en temps réel même quand l'application est en arrière-plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch
              id="push-toggle"
              checked={subscribed}
              onCheckedChange={handleToggle}
              disabled={loading || !supported}
            />
            <Label htmlFor="push-toggle">
              {subscribed ? 'Désactiver les notifications' : 'Activer les notifications'}
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Types d'alertes</CardTitle>
          <CardDescription>Ces alertes seront envoyées quand les notifications sont activées</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: 'Nouvel OR assigné', desc: 'Quand un ordre de réparation vous est affecté' },
            { label: 'Stock critique', desc: 'Quand un article passe sous le seuil minimum' },
            { label: 'OR terminé', desc: 'Quand un technicien clôture un OR' },
            { label: 'Devis approuvé / refusé', desc: 'Retour client via portail' },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch defaultChecked disabled={!subscribed} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
