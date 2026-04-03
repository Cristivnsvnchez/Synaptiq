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
  { slug: 'identity', icon: CreditCard, label: 'Identité' },
  { slug: 'housing', icon: Home, label: 'Logement' },
  { slug: 'finance', icon: '💶', label: 'Finance' },
  { slug: 'work', icon: Briefcase, label: 'Travail' },
  { slug: 'health', icon: Heart, label: 'Santé' },
  { slug: 'learning', icon: BookOpen, label: 'Learning' },
  { slug: 'vehicle', icon: Car, label: 'Véhicule' },
  { slug: 'travel', icon: Plane, label: 'Voyage' },
  { slug: 'subscriptions', icon: Package, label: 'Abonnements' },
  { slug: 'contacts', icon: Users, label: 'Contacts' },
  { slug: 'projects', icon: Rocket, label: 'Projets' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-60 flex flex-col z-40"
      style={{ background: 'var(--sidebar)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-[#312e81]">
        <div className="w-8 h-8 rounded-lg bg-[#5b4fcf] flex items-center justify-center">
          <Brain className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-bold text-lg tracking-tight">Synaptiq</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {/* Main nav */}
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-[#5b4fcf] text-white'
                : 'text-[#a5b4fc] hover:bg-[#312e81] hover:text-white'
            )}>
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}

        {/* Domains */}
        <div className="pt-4 pb-1 px-3">
          <p className="text-xs font-semibold text-[#6366f1] uppercase tracking-wider">Domaines</p>
        </div>
        {domains.map(({ slug, icon: Icon, label }) => {
          const isActive = pathname === `/domains/${slug}`
          return (
            <Link key={slug} href={`/domains/${slug}`}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-[#5b4fcf] text-white font-medium'
                  : 'text-[#a5b4fc] hover:bg-[#312e81] hover:text-white'
              )}>
              {typeof Icon === 'string'
                ? <span className="text-base w-4 text-center">{Icon}</span>
                : <Icon className="w-4 h-4 shrink-0" />}
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-[#312e81]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#5b4fcf] flex items-center justify-center text-white text-xs font-bold">
            CS
          </div>
          <div>
            <p className="text-white text-sm font-medium">Mon OS</p>
            <p className="text-[#6366f1] text-xs">Personnel</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
