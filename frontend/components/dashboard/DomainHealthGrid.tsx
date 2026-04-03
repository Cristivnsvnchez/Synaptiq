'use client'
import Link from 'next/link'
import { DomainHealth } from '@/types'
import { cn } from '@/lib/utils'

function HealthBar({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-green-400' : score >= 50 ? 'bg-orange-400' : 'bg-red-400'
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
      <div className={cn('h-1.5 rounded-full transition-all', color)} style={{ width: `${score}%` }} />
    </div>
  )
}

export function DomainHealthGrid({ domains }: { domains: DomainHealth[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h2 className="text-base font-semibold text-gray-800 mb-4">Santé des domaines</h2>
      <div className="grid grid-cols-2 gap-3">
        {domains.map((d) => (
          <Link key={d.slug} href={`/domains/${d.slug}`}
            className="group p-3 rounded-xl border border-gray-100 hover:border-[#5b4fcf]/30 hover:bg-[#faf9ff] transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{d.icon}</span>
                <span className="text-sm font-medium text-gray-700 group-hover:text-[#5b4fcf]">{d.label}</span>
              </div>
              <span className={cn(
                'text-xs font-bold',
                d.health_score >= 80 ? 'text-green-500' : d.health_score >= 50 ? 'text-orange-500' : 'text-red-500'
              )}>{d.health_score}%</span>
            </div>
            <HealthBar score={d.health_score} />
            <div className="flex gap-3 mt-2 text-xs text-gray-400">
              <span>{d.entity_count} entités</span>
              {d.expired_docs > 0 && <span className="text-red-400">{d.expired_docs} expirés</span>}
              {d.pending_reminders > 0 && <span className="text-orange-400">{d.pending_reminders} rappels</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
