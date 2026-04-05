'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDomain, getEntities, createEntity, deleteEntity } from '@/lib/api'
import { Entity, Domain } from '@/types'
import { useState } from 'react'
import Link from 'next/link'
import { Plus, Trash2, Loader2, Search, X, FileText, Layers } from 'lucide-react'

// Auto-detect technology from title
const TECH_KEYWORDS: [string, string][] = [
  ['SAP', 'SAP'],
  ['Microsoft', 'Microsoft'], ['Azure', 'Microsoft'], ['M365', 'Microsoft'],
  ['Office 365', 'Microsoft'], ['Entra', 'Microsoft'], ['Teams', 'Microsoft'],
  ['Google', 'Google'], ['GCP', 'Google'], ['Firebase', 'Google'],
  ['AWS', 'AWS'], ['Amazon', 'AWS'],
  ['Cisco', 'Cisco'],
  ['Oracle', 'Oracle'],
  ['Salesforce', 'Salesforce'],
  ['Linux', 'Linux'], ['Ubuntu', 'Linux'], ['RHEL', 'Linux'],
]

function detectTech(title: string): string {
  const lower = title.toLowerCase()
  for (const [keyword, tech] of TECH_KEYWORDS) {
    if (lower.includes(keyword.toLowerCase())) return tech
  }
  return ''
}

export default function LearningPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', type: '' })

  const { data: domain } = useQuery<Domain>({
    queryKey: ['domain', 'learning'],
    queryFn: () => getDomain('learning'),
  })

  const { data: entities = [], isLoading } = useQuery<Entity[]>({
    queryKey: ['entities', 'learning'],
    queryFn: () => domain ? getEntities(domain.id) : [],
    enabled: !!domain,
  })

  // Only root pages (no parent_id) shown in the list
  const rootEntities = entities.filter(e => {
    const em = (e.metadata_ || {}) as Record<string, unknown>
    return !em.parent_id
  })

  // Count sub-pages per root entity
  const subPageCount = (parentId: string) =>
    entities.filter(e => {
      const em = (e.metadata_ || {}) as Record<string, unknown>
      return String(em.parent_id || '') === parentId
    }).length

  // Derive a display tech group from entity
  const getType = (e: Entity) => {
    const fromMeta = String(
      (e.metadata_ as Record<string, unknown> | null)?.vendor ||
      (e.metadata_ as Record<string, unknown> | null)?.type || ''
    )
    const isTech = (s: string) => s.length > 0 && !s.includes('_')
    if (isTech(e.type)) return e.type
    if (isTech(fromMeta)) return fromMeta
    const detected = detectTech(e.name)
    if (detected) return detected
    return fromMeta || e.type || 'Autre'
  }

  // All unique tech groups present in root entities only
  const allTypes = [...new Set(rootEntities.map(e => getType(e)))].filter(Boolean).sort()

  const filtered = rootEntities.filter(e => {
    const matchSearch = !search
      || e.name.toLowerCase().includes(search.toLowerCase())
      || (e.notes || '').toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'all' || getType(e) === filterType
    return matchSearch && matchType
  })

  const byType = allTypes.filter(t => filtered.some(e => getType(e) === t))

  function handleNameChange(name: string) {
    const detected = detectTech(name)
    setForm(f => ({ ...f, name, type: f.type || detected }))
  }

  const create = useMutation({
    mutationFn: () => {
      const type = form.type || detectTech(form.name) || 'Autre'
      return createEntity({
        domain_id: domain!.id,
        name: form.name,
        type,
        metadata_: { type },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities', 'learning'] })
      setShowForm(false)
      setForm({ name: '', type: '' })
    },
  })

  const remove = useMutation({
    mutationFn: deleteEntity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities', 'learning'] })
      setConfirmDeleteId(null)
    },
  })

  // Total shown in header — all entities, including sub-pages
  const totalCount = entities.length

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#dce8e1]">Knowledge Base</h1>
          <p className="text-sm text-[#4d6b5a] mt-1">
            {rootEntities.length} page{rootEntities.length !== 1 ? 's' : ''}
            {totalCount > rootEntities.length && (
              <span className="ml-1 text-[#3a5347]">· {totalCount - rootEntities.length} sous-page{totalCount - rootEntities.length !== 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-[#5cc987] text-[#0d1a13] px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#4db974] transition-colors"
        >
          <Plus className="w-4 h-4" /> Nouvelle page
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 flex items-center gap-2 bg-[#1e2d27] border border-[#2a3830] rounded-xl px-4 py-2.5 focus-within:ring-1 focus-within:ring-[#5cc987]/20">
          <Search className="w-4 h-4 text-[#3a5347] shrink-0" />
          <input
            placeholder="Rechercher dans la knowledge base..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 text-sm focus:outline-none bg-transparent text-[#dce8e1] placeholder:text-[#3a5347]"
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <X className="w-3.5 h-3.5 text-[#3a5347]" />
            </button>
          )}
        </div>
        {allTypes.length > 0 && (
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="border border-[#2a3830] rounded-xl px-3 py-2 text-sm bg-[#1e2d27] text-[#dce8e1] focus:outline-none focus:ring-1 focus:ring-[#5cc987]/20"
          >
            <option value="all">Tous</option>
            {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-[#182421] border border-[#5cc987]/20 rounded-2xl p-5 mb-6 shadow-sm">
          <h3 className="text-sm font-semibold text-[#b8d4c4] mb-4">Nouvelle page</h3>
          <div className="flex gap-3">
            <input
              placeholder="Titre (ex: SAP BTP – Architecture, Azure AD...)"
              value={form.name}
              onChange={e => handleNameChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && form.name && create.mutate()}
              className="flex-1 border border-[#2a3830] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#5cc987]/20 bg-[#1e2d27] text-[#dce8e1] placeholder:text-[#3a5347]"
            />
            <div className="relative">
              <input
                list="tech-suggestions"
                placeholder="Techno (ex: SAP)"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-40 border border-[#2a3830] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#5cc987]/20 bg-[#1e2d27] text-[#dce8e1] placeholder:text-[#3a5347]"
              />
              <datalist id="tech-suggestions">
                {allTypes.map(t => <option key={t} value={t} />)}
                {['SAP', 'Microsoft', 'Google', 'AWS', 'Cisco', 'Oracle', 'Salesforce', 'Linux']
                  .filter(t => !allTypes.includes(t))
                  .map(t => <option key={t} value={t} />)}
              </datalist>
            </div>
            <button
              onClick={() => create.mutate()}
              disabled={!form.name || create.isPending}
              className="bg-[#5cc987] text-[#0d1a13] px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center gap-2 hover:bg-[#4db974]"
            >
              {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-[#4d6b5a] hover:text-[#6e9480] px-2"
            >
              ✕
            </button>
          </div>
          {form.name && !form.type && detectTech(form.name) && (
            <p className="text-xs text-[#5cc987] mt-2 ml-1">
              Détecté : <strong>{detectTech(form.name)}</strong>
            </p>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center h-40 items-center">
          <div className="w-6 h-6 border-4 border-[#5cc987] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#182421] rounded-2xl border border-dashed border-[#243028] p-16 text-center">
          <FileText className="w-10 h-10 text-[#243028] mx-auto mb-3" />
          <p className="text-[#4d6b5a] text-sm font-medium">
            Aucune page{search ? ` pour "${search}"` : ''}
          </p>
          <p className="text-[#3a5347] text-xs mt-1">
            Crée une première page pour documenter ce que tu apprends
          </p>
          {!search && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-[#5cc987] text-sm font-medium hover:underline"
            >
              + Nouvelle page
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {(filterType === 'all' ? byType : [filterType]).map(tech => {
            const techEntities = filtered.filter(e => getType(e) === tech)
            if (techEntities.length === 0) return null
            return (
              <div key={tech}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-semibold text-[#b8d4c4]">{tech}</span>
                  <div className="flex-1 h-px bg-[#243028]" />
                  <span className="text-xs text-[#3a5347]">
                    {techEntities.length} page{techEntities.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {techEntities.map(entity => {
                    const em = (entity.metadata_ || {}) as Record<string, unknown>
                    const excerpt = (entity.notes || '').slice(0, 120)
                    const hasCert = !!(em.certification_name || em.cert_status)
                    const subCount = subPageCount(entity.id)
                    return (
                      <div
                        key={entity.id}
                        className="bg-[#182421] rounded-xl border border-[#243028] hover:border-[#5cc987]/30 hover:bg-[#1e2e28] transition-all group cursor-pointer"
                      >
                        <Link href={`/learning/${entity.id}`} className="block p-4">
                          <div className="flex items-start gap-2 mb-2">
                            <h3 className="font-semibold text-[#dce8e1] group-hover:text-[#5cc987] transition-colors leading-snug flex-1">
                              {entity.name}
                            </h3>
                            <div className="flex items-center gap-1 shrink-0">
                              {hasCert && (
                                <span className="text-xs bg-[#5cc987]/10 text-[#5cc987] px-2 py-0.5 rounded-full border border-[#5cc987]/20">
                                  🎓
                                </span>
                              )}
                              {subCount > 0 && (
                                <span
                                  title={`${subCount} sous-page${subCount !== 1 ? 's' : ''}`}
                                  className="flex items-center gap-1 text-xs bg-[#1e2d27] text-[#6e9480] px-2 py-0.5 rounded-full border border-[#243028]"
                                >
                                  <Layers className="w-3 h-3" />
                                  {subCount}
                                </span>
                              )}
                            </div>
                          </div>
                          {excerpt ? (
                            <p className="text-xs text-[#4d6b5a] line-clamp-2 leading-relaxed">{excerpt}</p>
                          ) : (
                            <p className="text-xs text-[#3a5347] italic">Page vide — cliquer pour éditer</p>
                          )}
                          <p className="text-xs text-[#3a5347] mt-3">
                            {new Date(entity.updated_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </Link>
                        <div className="px-4 pb-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all">
                          <Link
                            href={`/learning/${entity.id}`}
                            className="text-xs text-[#5cc987] hover:underline font-medium"
                          >
                            Ouvrir →
                          </Link>
                          {confirmDeleteId === entity.id ? (
                            <div className="flex gap-1">
                              <button
                                onClick={e => { e.preventDefault(); remove.mutate(entity.id) }}
                                disabled={remove.isPending}
                                className="h-6 px-2 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 flex items-center"
                              >
                                {remove.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Supprimer'}
                              </button>
                              <button
                                onClick={e => { e.preventDefault(); setConfirmDeleteId(null) }}
                                className="h-6 w-6 rounded-lg hover:bg-[#1e2d27] flex items-center justify-center text-[#4d6b5a] text-xs"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={e => { e.preventDefault(); setConfirmDeleteId(entity.id) }}
                              className="flex items-center gap-1 text-xs text-[#3a5347] hover:text-[#e05555] transition-colors"
                            >
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
