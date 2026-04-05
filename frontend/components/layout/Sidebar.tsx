'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Sparkles, CreditCard, Home, Briefcase,
  Heart, BookOpen, Car, Plane, Package, Users, Rocket, Brain
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/capture', icon: Sparkles, label: 'AI Capture' },
]

const domains = [
  { slug: 'identity',      icon: CreditCard, label: 'Identité' },
  { slug: 'housing',       icon: Home,       label: 'Logement' },
  { slug: 'finance',       icon: '💶',       label: 'Finance' },
  { slug: 'work',          icon: Briefcase,  label: 'Travail' },
  { slug: 'health',        icon: Heart,      label: 'Santé' },
  { slug: 'learning',      icon: BookOpen,   label: 'Learning' },
  { slug: 'vehicle',       icon: Car,        label: 'Véhicule' },
  { slug: 'travel',        icon: Plane,      label: 'Voyage' },
  { slug: 'subscriptions', icon: Package,    label: 'Abonnements' },
  { slug: 'contacts',      icon: Users,      label: 'Contacts' },
  { slug: 'projects',      icon: Rocket,     label: 'Projets' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-60 flex flex-col z-40 bg-[#0c1210]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="w-8 h-8 rounded-xl bg-[#5cc987]/15 flex items-center justify-center">
          <Brain className="w-4 h-4 text-[#5cc987]" />
        </div>
        <span className="text-[#dce8e1] font-semibold text-base tracking-tight">Synaptiq</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {/* Main nav */}
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
              pathname === href
                ? 'bg-[#5cc987]/10 text-[#5cc987]'
                : 'text-[#6b8a78] hover:bg-[#182421] hover:text-[#b8d4c4]'
            )}>
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}

        {/* Domains */}
        <div className="pt-5 pb-2 px-3">
          <p className="text-[10px] font-semibold text-[#3d5c4a] uppercase tracking-widest">Domaines</p>
        </div>
        {domains.map(({ slug, icon: Icon, label }) => {
          const isActive = pathname.startsWith(`/domains/${slug}`) || pathname.startsWith(`/${slug}/`)
          return (
            <Link key={slug} href={`/domains/${slug}`}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all',
                isActive
                  ? 'bg-[#5cc987]/10 text-[#5cc987] font-medium'
                  : 'text-[#6b8a78] hover:bg-[#182421] hover:text-[#b8d4c4]'
              )}>
              {typeof Icon === 'string'
                ? <span className="text-sm w-4 text-center opacity-70">{Icon}</span>
                : <Icon className="w-4 h-4 shrink-0" />}
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#182421]">
          <div className="w-7 h-7 rounded-lg bg-[#5cc987]/20 flex items-center justify-center text-[#5cc987] text-xs font-bold shrink-0">
            CS
          </div>
          <div className="min-w-0">
            <p className="text-[#b8d4c4] text-xs font-medium truncate">Mon OS</p>
            <p className="text-[#4d6b5a] text-[10px]">Personnel</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
