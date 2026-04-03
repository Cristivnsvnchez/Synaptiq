'use client'
import { AttentionItem } from '@/types'
import { cn } from '@/lib/utils'
import { FileText, Bell, AlertTriangle, Clock } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { dismissReminder } from '@/lib/api'

function UrgencyBadge({ urgency }: { urgency: string }) {
  const map = {
    overdue: 'bg-red-100 text-red-600',
    soon: 'bg-orange-100 text-orange-600',
    upcoming: 'bg-blue-100 text-blue-600',
  } as Record<string, string>
  const labels = { overdue: 'En retard', soon: 'Bientôt', upcoming: 'À venir' }
  return (
    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', map[urgency] || map.upcoming)}>
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-orange-500" />
        <h2 className="text-base font-semibold text-gray-800">{title}</h2>
        {items.length > 0 && (
          <span className="ml-auto bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
            <span className="text-lg">✓</span>
          </div>
          <p className="text-sm text-gray-400">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id}
              className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-[#faf9ff] transition-colors group">
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                item.type === 'document' ? 'bg-[#ede9fe]' : 'bg-orange-100'
              )}>
                {item.type === 'document'
                  ? <FileText className="w-4 h-4 text-[#5b4fcf]" />
                  : <Bell className="w-4 h-4 text-orange-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <p className="text-xs text-gray-400">
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
                <button
                  onClick={() => dismiss.mutate(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-gray-600 transition-all shrink-0">
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
