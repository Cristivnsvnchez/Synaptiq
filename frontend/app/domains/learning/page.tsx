'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDomain, getEntities, createEntity, deleteEntity } from '@/lib/api'
import { Entity, Domain } from '@/types'
import { useState } from 'react'
import Link from 'next/link'
import { Plus, Trash2, Loader2, Search, X, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

const VENDORS = ['SAP', 'Microsoft', 'Google', 'AWS', 'Cisco', 'Oracle', 'Salesforce', 'Linux', 'Autre']
const TYPES = [
  { value: 'notes_techniques', label: '📝 Notes techniques' },
  { value: 'certification_prep', label: '🎓 Préparation certif' },
  { value: 'sandbox', label: '🧪 Sandbox / Labs' },
  { value: 'veille', label: '📡 Veille technologique' },
  { value: 'formation', label: '🎬 Formation suivie' },
]

const VENDOR_COLORS: Record<string, string> = {
  SAP: 'bg-blue-50 text-blue-700 border-blue-200',
  Microsoft: 'bg-sky-50 text-sky-700 border-sky-200',
  Google: 'bg-green-50 text-green-700 border-green-200',
  AWS: 'bg-orange-50 text-orange-700 border-orange-200',
  Cisco: 'bg-teal-50 text-teal-700 border-teal-200',
  Oracle: 'bg-red-50 text-red-700 border-red-200',
  Salesforce: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  Linux: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Autre: 'bg-gray-50 text-gray-600 border-gray-200',
}

export default function LearningPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterVendor, setFilterVendor] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', vendor: 'SAP', type: 'notes_techniques' })

  const { data: domain } = useQuery<Domain>({ queryKey: ['domain', 'learning'], queryFn: () => getDomain('learning') })
  const { data: entities = [], isLoading } = useQuery<Entity[]>({
    queryKey: ['entities', 'learning'],
    queryFn: () => domain ? getEntities(domain.id) : [],
    enabled: !!domain,
  })

  const create = useMutation({
    mutationFn: () => createEntity({
      domain_id: domain!.id,
      name: form.name,
      type: form.type,
      metadata_: { vendor: form.vendor, type: form.type },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities', 'learning'] })
      setShowForm(false)
      setForm({ name: '', vendor: 'SAP', type: 'notes_techniques' })
    },
  })

  const remove = useMutation({
    mutationFn: deleteEntity,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['entities', 'learning'] }); setConfirmDeleteId(null) },
  })

  const getMeta = (e: Entity) => (e.metadata_ || {}) as Record<string, unknown>

  const filtered = entities.filter(e => {
    const m = getMeta(e)
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || (e.notes || '').toLowerCase().includes(search.toLowerCase())
    const matchVendor = filterVendor === 'all' || m.vendor === filterVendor
    const matchType = filterType === 'all' || e.type === filterType
    return matchSearch && matchVendor && matchType
  })

  const byVendor = VENDORS.filter(v => entities.some(e => getMeta(e).vendor === v))

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
          <p className="text-sm text-gray-400 mt-1">{entities.length} page{entities.length !== 1 ? 's' : ''} de documentation</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-[#5b4fcf] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#4c3fbd] transition-colors">
          <Plus className="w-4 h-4" /> Nouvelle page
        </button>
      </div>

      {/* Search + filters */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-[#5b4fcf]/30">
          <Search className="w-4 h-4 text-gray-300 shrink-0" />
          <input placeholder="Rechercher dans la knowledge base..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 text-sm focus:outline-none bg-transparent" />
          {search && <button onClick={() => setSearch('')}><X className="w-3.5 h-3.5 text-gray-300" /></button>}
        </div>
        <select value={filterVendor} onChange={e => setFilterVendor(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5b4fcf]/30">
          <option value="all">Tous les vendors</option>
          {VENDORS.map(v => <option key={v}>{v}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5b4fcf]/30">
          <option value="all">Tous les types</option>
          {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white border border-[#5b4fcf]/20 rounded-2xl p-5 mb-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Nouvelle page</h3>
          <div className="flex gap-3">
            <input placeholder="Titre de la page (ex: SAP BTP – Architecture, Azure AD...)"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && form.name && create.mutate()}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b4fcf]/30" />
            <select value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5b4fcf]/30">
              {VENDORS.map(v => <option key={v}>{v}</option>)}
            </select>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5b4fcf]/30">
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <button onClick={() => create.mutate()} disabled={!form.name || create.isPending}
              className="bg-[#5b4fcf] text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center gap-2 hover:bg-[#4c3fbd]">
              {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 px-2">✕</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center h-40 items-center">
          <div className="w-6 h-6 border-4 border-[#5b4fcf] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
          <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm font-medium">Aucune page{search ? ` pour "${search}"` : ''}</p>
          <p className="text-gray-300 text-xs mt-1">Crée une première page pour documenter ce que tu apprends</p>
          {!search && <button onClick={() => setShowForm(true)} className="mt-4 text-[#5b4fcf] text-sm font-medium hover:underline">+ Nouvelle page</button>}
        </div>
      ) : (
        /* Group by vendor */
        <div className="space-y-8">
          {(filterVendor === 'all' ? [...byVendor, ...(['all'].filter(() => entities.some(e => !byVendor.includes(String(getMeta(e).vendor)))))] : [filterVendor]).map(vendor => {
            const vendorEntities = filtered.filter(e => filterVendor !== 'all' || getMeta(e).vendor === vendor)
            if (vendorEntities.length === 0) return null
            const vendorColor = VENDOR_COLORS[vendor] || VENDOR_COLORS['Autre']
            return (
              <div key={vendor}>
                <div className="flex items-center gap-3 mb-3">
                  <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full border', vendorColor)}>{vendor}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-gray-300">{vendorEntities.length} page{vendorEntities.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {vendorEntities.map(entity => {
                    const m = getMeta(entity)
                    const typeLabel = TYPES.find(t => t.value === entity.type)?.label || entity.type
                    const excerpt = (entity.notes || '').slice(0, 120)
                    const hasCert = m.certification_name || m.cert_status
                    return (
                      <div key={entity.id}
                        className="bg-white rounded-xl border border-gray-100 hover:border-[#5b4fcf]/30 hover:shadow-md transition-all group cursor-pointer">
                        <Link href={`/learning/${entity.id}`} className="block p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-xs text-gray-400 mb-1">{typeLabel}</p>
                              <h3 className="font-semibold text-gray-800 group-hover:text-[#5b4fcf] transition-colors leading-snug">
                                {entity.name}
                              </h3>
                            </div>
                            {hasCert && (
                              <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full shrink-0 ml-2 border border-purple-200">
                                🎓 Certif
                              </span>
                            )}
                          </div>
                          {excerpt ? (
                            <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{excerpt}</p>
                          ) : (
                            <p className="text-xs text-gray-300 italic">Page vide — cliquer pour éditer</p>
                          )}
                          <p className="text-xs text-gray-200 mt-3">
                            {new Date(entity.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </Link>
                        <div className="px-4 pb-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all">
                          <Link href={`/learning/${entity.id}`}
                            className="text-xs text-[#5b4fcf] hover:underline font-medium">
                            Ouvrir →
                          </Link>
                          {confirmDeleteId === entity.id ? (
                            <div className="flex gap-1">
                              <button onClick={e => { e.preventDefault(); remove.mutate(entity.id) }} disabled={remove.isPending}
                                className="h-6 px-2 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 flex items-center">
                                {remove.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Supprimer'}
                              </button>
                              <button onClick={e => { e.preventDefault(); setConfirmDeleteId(null) }}
                                className="h-6 w-6 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 text-xs">✕</button>
                            </div>
                          ) : (
                            <button onClick={e => { e.preventDefault(); setConfirmDeleteId(entity.id) }}
                              className="group/del flex items-center gap-1 text-xs text-gray-300 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" /> Supprimer
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
