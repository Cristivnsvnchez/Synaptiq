import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  color?: 'purple' | 'red' | 'green' | 'orange'
  sub?: string
}

const colorMap = {
  purple: { bg: 'bg-[#ede9fe]', text: 'text-[#5b4fcf]', icon: 'text-[#5b4fcf]' },
  red:    { bg: 'bg-red-50',    text: 'text-red-600',    icon: 'text-red-500' },
  green:  { bg: 'bg-green-50',  text: 'text-green-600',  icon: 'text-green-500' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600', icon: 'text-orange-500' },
}

export function StatCard({ label, value, icon: Icon, color = 'purple', sub }: StatCardProps) {
  const c = colorMap[color]
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', c.bg)}>
        <Icon className={cn('w-5 h-5', c.icon)} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className={cn('text-xs font-medium mt-0.5', c.text)}>{sub}</p>}
      </div>
    </div>
  )
}
