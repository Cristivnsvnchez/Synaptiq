import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  color?: 'green' | 'red' | 'orange' | 'blue'
  sub?: string
}

const colorMap = {
  green:  { bg: 'bg-[#5cc987]/10',  icon: 'text-[#5cc987]',  text: 'text-[#5cc987]' },
  red:    { bg: 'bg-[#e05555]/10',  icon: 'text-[#e05555]',  text: 'text-[#e05555]' },
  orange: { bg: 'bg-[#d4925a]/10',  icon: 'text-[#d4925a]',  text: 'text-[#d4925a]' },
  blue:   { bg: 'bg-[#5b9bd4]/10',  icon: 'text-[#5b9bd4]',  text: 'text-[#5b9bd4]' },
}

export function StatCard({ label, value, icon: Icon, color = 'green', sub }: StatCardProps) {
  const c = colorMap[color]
  return (
    <div className="bg-[#182421] rounded-2xl p-5 border border-[#243028] flex items-center gap-4">
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', c.bg)}>
        <Icon className={cn('w-5 h-5', c.icon)} />
      </div>
      <div>
        <p className="text-2xl font-bold text-[#dce8e1]">{value}</p>
        <p className="text-sm text-[#6e9480]">{label}</p>
        {sub && <p className={cn('text-xs font-medium mt-0.5', c.text)}>{sub}</p>}
      </div>
    </div>
  )
}
