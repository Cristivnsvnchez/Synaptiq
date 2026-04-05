'use client'
import Link from 'next/link'
import { DomainHealth } from '@/types'
import { cn } from '@/lib/utils'

function HealthBar({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-[#5cc987]' : score >= 50 ? 'bg-[#d4925a]' : 'bg-[#e05555]'
  return (
    <div className="w-full bg-[#243028] rounded-full h-1 mt-2">
      <div className={cn('h-1 rounded-full transition-all', color)} style={{ width: `${score}%` }} />
    </div>
  )
}

export function DomainHealthGrid({ domains }: { domains: DomainHealth[] }) {
  return (
    <div className="bg-[#182421] rounded-2xl border border-[#243028] p-5">
      <h2 className="text-sm font-semibold text-[#b8d4c4] mb-4">Santé des domaines</h2>
      <div className="grid grid-cols-2 gap-2">
        {domains.map((d) => (
          <Link key={d.slug} href={`/domains/${d.slug}`}
            className="group p-3 rounded-xl border border-[#243028] hover:border-[#5cc987]/30 hover:bg-[#1e2e29] transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">{d.icon}</span>
                <span className="text-sm text-[#8db89e] group-hover:text-[#dce8e1] transition-colors">{d.label}</span>
              </div>
              <span className={cn(
                'text-xs font-bold',
                d.health_score >= 80 ? 'text-[#5cc987]' : d.health_score >= 50 ? 'text-[#d4925a]' : 'text-[#e05555]'
              )}>{d.health_score}%</span>
            </div>
            <HealthBar score={d.health_score} />
            <div className="flex gap-3 mt-2 text-xs text-[#4d6b5a]">
              <span>{d.entity_count} entités</span>
              {d.expired_docs > 0 && <span className="text-[#e05555]/80">{d.expired_docs} expirés</span>}
              {d.pending_reminders > 0 && <span className="text-[#d4925a]/80">{d.pending_reminders} rappels</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
