'use client'
import { useQuery } from '@tanstack/react-query'
import { getDashboard } from '@/lib/api'
import { DashboardData } from '@/types'
import { StatCard } from '@/components/dashboard/StatCard'
import { DomainHealthGrid } from '@/components/dashboard/DomainHealthGrid'
import { AttentionFeed } from '@/components/dashboard/AttentionFeed'
import { FileText, AlertTriangle, CheckCircle, Layers } from 'lucide-react'

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    refetchInterval: 60_000,
  })

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Bonjour 👋</h1>
        <p className="text-gray-400 text-sm mt-1 capitalize">{today}</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-[#5b4fcf] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
          Impossible de charger le dashboard. Vérifiez que l'API tourne sur le port 8000.
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Entités" value={data.total_entities} icon={Layers} color="purple" />
            <StatCard label="Documents" value={data.total_documents} icon={FileText} color="purple" />
            <StatCard
              label="Expirés" value={data.expired_count} icon={AlertTriangle}
              color={data.expired_count > 0 ? 'red' : 'green'}
              sub={data.expired_count > 0 ? 'Action requise' : 'Tout est à jour'}
            />
            <StatCard
              label="Alertes actives" value={data.attention_required.length} icon={CheckCircle}
              color={data.attention_required.length > 0 ? 'orange' : 'green'}
            />
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-3 gap-6">
            {/* Attention + Upcoming */}
            <div className="col-span-1 space-y-6">
              <AttentionFeed
                items={data.attention_required}
                title="Attention requise"
                emptyMessage="Rien d'urgent, tout est en ordre !"
              />
              <AttentionFeed
                items={data.upcoming_30_days.slice(0, 5)}
                title="Dans les 30 prochains jours"
                emptyMessage="Aucune échéance à venir"
              />
            </div>

            {/* Domain health */}
            <div className="col-span-2">
              <DomainHealthGrid domains={data.domains_health} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
