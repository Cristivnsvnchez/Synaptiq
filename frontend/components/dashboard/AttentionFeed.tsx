'use client'
import { AttentionItem } from '@/types'
import { cn } from '@/lib/utils'
import { FileText, Bell, AlertTriangle, Clock } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { dismissReminder } from '@/lib/api'

function UrgencyBadge({ urgency }: { urgency: string }) {
  const map: Record<string, string> = {
    overdue:  'bg-[#e05555]/10 text-[#e05555]',
    soon:     'bg-[#d4925a]/10 text-[#d4925a]',
    upcoming: 'bg-[#5b9bd4]/10 text-[#5b9bd4]',
  }
  const labels = { overdue: 'En retard', soon: 'Bientôt', upcoming: 'À venir' }
  return (
    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', map[urgency] || map.upcoming)}>
      {labels[urgency as keyof typeof labels] || urgency}
    </span>
  )
}

interface Props {
  items: AttentionItem[]
  title: string
  emptyMessage: string
}

export function AttentionFeed({ items, title, emptyMessage }: Props) {
  const queryClient = useQueryClient()
  const dismiss = useMutation({
    mutationFn: dismissReminder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  })

  return (
    <div className="bg-[#182421] rounded-2xl border border-[#243028] p-5">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-3.5 h-3.5 text-[#d4925a]" />
        <h2 className="text-sm font-semibold text-[#b8d4c4]">{title}</h2>
        {items.length > 0 && (
          <span className="ml-auto bg-[#e05555]/10 text-[#e05555] text-[10px] font-bold px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-9 h-9 rounded-full bg-[#5cc987]/10 flex items-center justify-center mx-auto mb-2">
            <span className="text-[#5cc987] text-sm">✓</span>
          </div>
          <p className="text-sm text-[#4d6b5a]">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((item) => (
            <div key={item.id}
              className="flex items-start gap-3 p-3 rounded-xl bg-[#111918] hover:bg-[#1a2822] transition-colors group">
              <div className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                item.type === 'document' ? 'bg-[#5cc987]/10' : 'bg-[#d4925a]/10'
              )}>
                {item.type === 'document'
                  ? <FileText className="w-3.5 h-3.5 text-[#5cc987]" />
                  : <Bell className="w-3.5 h-3.5 text-[#d4925a]" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#b8d4c4] truncate">{item.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3 h-3 text-[#4d6b5a]" />
                  <p className="text-xs text-[#4d6b5a]">
                    {item.expires_at
                      ? new Date(item.expires_at).toLocaleDateString('fr-FR')
                      : item.trigger_date
                      ? new Date(item.trigger_date).toLocaleDateString('fr-FR')
                      : '—'}
                  </p>
                  <UrgencyBadge urgency={item.urgency} />
                </div>
              </div>
              {item.type === 'reminder' && (
                <button onClick={() => dismiss.mutate(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-xs text-[#4d6b5a] hover:text-[#dce8e1] transition-all shrink-0">
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
