'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDomain, getEntities, createEntity, deleteEntity, analyzeFileUpload } from '@/lib/api'
import { Entity, Domain } from '@/types'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { Plus, Trash2, TrendingDown, ExternalLink, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const CATEGORIES = ['Streaming', 'Logiciel', 'Cloud', 'Gaming', 'Musique', 'Presse', 'Fitness', 'Utilitaire', 'Autre']
const BILLING_CYCLES = [
  { value: 'monthly', label: 'Mensuel' },
  { value: 'yearly', label: 'Annuel' },
  { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'one_time', label: 'Unique' },
]

const CYCLE_MONTHS: Record<string, number> = { monthly: 1, yearly: 12, weekly: 0.25, one_time: 0 }

// Emoji logos par nom d'abonnement connu
function guessEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('netflix')) return '🎬'
  if (n.includes('spotify')) return '🎵'
  if (n.includes('adobe')) return '🎨'
  if (n.includes('apple')) return '🍎'
  if (n.includes('google') || n.includes('gsuite') || n.includes('workspace')) return '🔍'
  if (n.includes('microsoft') || n.includes('office') || n.includes('365')) return '💼'
  if (n.includes('amazon') || n.includes('aws') || n.includes('prime')) return '📦'
  if (n.includes('github')) return '🐙'
  if (n.includes('notion')) return '📝'
  if (n.includes('slack')) return '💬'
  if (n.includes('figma')) return '🖌️'
  if (n.includes('openai') || n.includes('chatgpt')) return '🤖'
  if (n.includes('claude') || n.includes('anthropic')) return '🧠'
  if (n.includes('disney')) return '✨'
  if (n.includes('hulu') || n.includes('canal') || n.includes('mycanal')) return '📺'
  if (n.includes('youtube')) return '▶️'
  if (n.includes('icloud')) return '☁️'
  if (n.includes('dropbox')) return '📁'
  if (n.includes('linear')) return '⚡'
  if (n.includes('vercel')) return '▲'
  if (n.includes('gym') || n.includes('sport') || n.includes('fitness')) return '💪'
  return '📦'
}

function monthlyPrice(price: number, cycle: string): number {
  if (cycle === 'yearly') return price / 12
  if (cycle === 'weekly') return price * 4
  return price
}

export default function SubscriptionsPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [ocrAnalyzing, setOcrAnalyzing] = useState(false)
  const [ocrError, setOcrError] = useState<string | null>(null)
  const ocrRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    name: '', category: 'Autre', price: '', billing_cycle: 'monthly', website: '', notes: ''
  })

  const { data: domain } = useQuery<Domain>({
    queryKey: ['domain', 'subscriptions'],
    queryFn: () => getDomain('subscriptions'),
  })

  const { data: entities = [], isLoading } = useQuery<Entity[]>({
    queryKey: ['entities', 'subscriptions'],
    queryFn: async () => domain ? getEntities(domain.id) : [],
    enabled: !!domain,
  })

  const create = useMutation({
    mutationFn: () => createEntity({
      domain_id: domain!.id,
      name: form.name,
      type: 'abonnement',
      notes: form.notes || undefined,
      metadata_: {
        category: form.category,
        price: parseFloat(form.price) || 0,
        billing_cycle: form.billing_cycle,
        website: form.website || undefined,
      },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities', 'subscriptions'] })
      setShowForm(false)
      setOcrAnalyzing(false)
      setOcrError(null)
      setForm({ name: '', category: 'Autre', price: '', billing_cycle: 'monthly', website: '', notes: '' })
    },
  })

  const remove = useMutation({
    mutationFn: deleteEntity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities', 'subscriptions'] })
      setConfirmDeleteId(null)
    },
  })

  async function handleOcrFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setOcrAnalyzing(true)
    setOcrError(null)
    if (ocrRef.current) ocrRef.current.value = ''
    try {
      const fd = new FormData()
      fd.append('file', file)
      const result = await analyzeFileUpload(fd)
      setForm(f => ({
        name: result.name || f.name,
        price: result.price != null ? String(result.price) : f.price,
        billing_cycle: result.billing_cycle || f.billing_cycle,
        category: result.category || f.category,
        website: result.website || f.website,
        notes: f.notes,
      }))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setOcrError(msg || 'Analyse échouée — vérifie que le serveur est démarré et la clé Anthropic configurée.')
    } finally {
      setOcrAnalyzing(false)
    }
  }

  // Financial summary
  const totalMonthly = entities.reduce((sum, e) => {
    const m = e.metadata_ as Record<string, unknown> | null
    if (!m) return sum
    const price = Number(m.price) || 0
    const cycle = String(m.billing_cycle || 'monthly')
    return sum + monthlyPrice(price, cycle)
  }, 0)
  const totalYearly = totalMonthly * 12

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📦</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Abonnements & Assets</h1>
            <p className="text-sm text-gray-400">{entities.length} abonnement{entities.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-[#5b4fcf] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#4c3fbd] transition-colors">
          <Plus className="w-4 h-4" /> Ajouter un abonnement
        </button>
      </div>

      {/* Financial overview */}
      {entities.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <TrendingDown className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalMonthly.toFixed(2)} €</p>
              <p className="text-sm text-gray-400">Dépenses / mois</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
              <TrendingDown className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalYearly.toFixed(2)} €</p>
              <p className="text-sm text-gray-400">Dépenses / an</p>
            </div>
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-white border border-[#5b4fcf]/20 rounded-2xl p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Nouvel abonnement</h3>
            <button
              onClick={() => ocrRef.current?.click()}
              disabled={ocrAnalyzing}
              className="flex items-center gap-1.5 text-xs font-medium text-[#5b4fcf] bg-[#ede9fe] hover:bg-[#ddd6fe] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
              {ocrAnalyzing
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyse en cours...</>
                : <><Sparkles className="w-3.5 h-3.5" /> OCR me</>}
            </button>
            <input ref={ocrRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleOcrFile} />
          </div>

          {ocrAnalyzing && (
            <div className="mb-4 flex items-center gap-2 text-xs text-[#5b4fcf] bg-[#faf9ff] border border-[#5b4fcf]/20 rounded-xl px-3 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Claude analyse la facture et remplit les champs automatiquement...
            </div>
          )}
          {ocrError && (
            <div className="mb-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {ocrError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Nom (ex: Netflix, Adobe CC...)" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="col-span-2 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b4fcf]/30" />
            <div className="flex gap-2">
              <input placeholder="Prix" value={form.price} type="number" step="0.01"
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b4fcf]/30" />
              <span className="flex items-center text-gray-400 text-sm">€</span>
            </div>
            <select value={form.billing_cycle} onChange={e => setForm(f => ({ ...f, billing_cycle: e.target.value }))}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b4fcf]/30 bg-white">
              {BILLING_CYCLES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b4fcf]/30 bg-white">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <input placeholder="Site web (optionnel)" value={form.website}
              onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b4fcf]/30" />
            <textarea placeholder="Notes (optionnel)" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="col-span-2 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b4fcf]/30 resize-none" />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => create.mutate()} disabled={!form.name || create.isPending}
              className="bg-[#5b4fcf] text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center gap-2 hover:bg-[#4c3fbd] transition-colors">
              {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ajouter'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 px-3 text-sm">Annuler</button>
          </div>
        </div>
      )}

      {/* Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-4 border-[#5b4fcf] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : entities.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <span className="text-4xl">📦</span>
          <p className="text-gray-400 mt-3 text-sm">Aucun abonnement enregistré</p>
          <button onClick={() => setShowForm(true)} className="mt-4 text-[#5b4fcf] text-sm font-medium hover:underline">
            + Ajouter le premier
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {entities.map((entity) => {
            const m = entity.metadata_ as Record<string, unknown> | null
            const price = Number(m?.price) || 0
            const cycle = String(m?.billing_cycle || 'monthly')
            const category = String(m?.category || '')
            const website = String(m?.website || '')
            const monthly = monthlyPrice(price, cycle)
            const cycleLabel = BILLING_CYCLES.find(b => b.value === cycle)?.label || cycle
            const emoji = guessEmoji(entity.name)

            return (
              <div key={entity.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-[#5b4fcf]/20 transition-all group flex flex-col gap-4">
                {/* Top */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#ede9fe] flex items-center justify-center text-2xl shrink-0">
                      {emoji}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{entity.name}</h3>
                      {category && <span className="text-xs text-gray-400">{category}</span>}
                    </div>
                  </div>
                  {website && (
                    <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank"
                      className="opacity-0 group-hover:opacity-100 transition-all">
                      <ExternalLink className="w-4 h-4 text-gray-300 hover:text-[#5b4fcf]" />
                    </a>
                  )}
                </div>

                {/* Price */}
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xl font-bold text-gray-900">{price.toFixed(2)} €</p>
                    <p className="text-xs text-gray-400">{cycleLabel} · {monthly.toFixed(2)} €/mois</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-gray-50">
                  <Link href={`/subscriptions/${entity.id}`}
                    className="flex-1 text-center bg-[#ede9fe] text-[#5b4fcf] rounded-xl py-2 text-xs font-semibold hover:bg-[#ddd6fe] transition-colors">
                    Voir plus
                  </Link>
                  {confirmDeleteId === entity.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => remove.mutate(entity.id)}
                        disabled={remove.isPending}
                        className="px-2 h-8 rounded-xl bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors flex items-center gap-1">
                        {remove.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Supprimer'}
                      </button>
                      <button onClick={() => setConfirmDeleteId(null)}
                        className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(entity.id)}
                      className="w-8 h-8 rounded-xl hover:bg-red-50 flex items-center justify-center transition-colors group/del">
                      <Trash2 className="w-3.5 h-3.5 text-red-300 group-hover/del:text-red-500 transition-colors" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
