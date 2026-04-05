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
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#dce8e1]">Bonjour 👋</h1>
        <p className="text-[#4d6b5a] text-sm mt-1 capitalize">{today}</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-[#5cc987] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-[#e05555]/10 border border-[#e05555]/20 rounded-2xl p-4 text-[#e05555] text-sm">
          Impossible de charger le dashboard. Vérifiez que l'API tourne sur le port 8000.
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Entités"       value={data.total_entities}            icon={Layers}        color="green" />
            <StatCard label="Documents"     value={data.total_documents}           icon={FileText}      color="blue" />
            <StatCard label="Expirés"       value={data.expired_count}             icon={AlertTriangle} color={data.expired_count > 0 ? 'red' : 'green'} sub={data.expired_count > 0 ? 'Action requise' : 'Tout est à jour'} />
            <StatCard label="Alertes"       value={data.attention_required.length} icon={CheckCircle}   color={data.attention_required.length > 0 ? 'orange' : 'green'} />
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-1 space-y-4">
              <AttentionFeed items={data.attention_required}          title="Attention requise"           emptyMessage="Rien d'urgent !" />
              <AttentionFeed items={data.upcoming_30_days.slice(0,5)} title="Dans les 30 prochains jours" emptyMessage="Aucune échéance" />
            </div>
            <div className="col-span-2">
              <DomainHealthGrid domains={data.domains_health} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
