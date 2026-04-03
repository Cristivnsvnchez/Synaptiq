'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { getDomain, getEntities, createEntity, deleteEntity } from '@/lib/api'
import { Entity, Domain } from '@/types'
import { useState } from 'react'
import Link from 'next/link'
import { Plus, Trash2, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const ENTITY_TYPES: Record<string, string[]> = {
  identity: ['passeport', 'cni', 'permis_conduire', 'carte_vitale', 'diplome', 'titre_sejour'],
  housing: ['bail', 'assurance_habitation', 'contrat_electricite', 'contrat_gaz', 'contrat_internet', 'quittance'],
  finance: ['compte_bancaire', 'carte_bancaire', 'credit', 'epargne', 'declaration_fiscale', 'facture'],
  work: ['employeur', 'contrat_travail', 'fiche_paie', 'contact_rh', 'projet'],
  health: ['medecin', 'medicament', 'vaccin', 'resultat_analyse', 'mutuelle', 'ordonnance'],
  learning: ['certification', 'cours', 'formation', 'note'],
  vehicle: ['carte_grise', 'assurance_auto', 'controle_technique', 'entretien'],
  travel: ['trip', 'visa', 'reservation_hotel', 'billet_avion', 'assurance_voyage'],
  subscriptions: ['abonnement_logiciel', 'abonnement_physique', 'licence'],
  contacts: ['contact'],
  projects: ['projet', 'idee', 'goal'],
}

export default function DomainPage() {
  const params = useParams()
  const slug = params.slug as string
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', type: '' })

  const { data: domain } = useQuery<Domain>({ queryKey: ['domain', slug], queryFn: () => getDomain(slug) })
  const { data: entities = [], isLoading } = useQuery<Entity[]>({
    queryKey: ['entities', slug],
    queryFn: async () => {
      if (!domain) return []
      return getEntities(domain.id)
    },
    enabled: !!domain,
  })

  const create = useMutation({
    mutationFn: () => createEntity({ domain_id: domain!.id, name: form.name, type: form.type }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['entities', slug] }); setShowForm(false); setForm({ name: '', type: '' }) },
  })

  const remove = useMutation({
    mutationFn: deleteEntity,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['entities', slug] }),
  })

  const types = ENTITY_TYPES[slug] || ['document']

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{domain?.icon}</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{domain?.label}</h1>
            <p className="text-sm text-gray-400">{entities.length} entité{entities.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-[#5b4fcf] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#4c3fbd] transition-colors">
          <Plus className="w-4 h-4" /> Nouvelle entité
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white border border-[#5b4fcf]/20 rounded-2xl p-5 mb-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Nouvelle entité</h3>
          <div className="flex gap-3">
            <input
              placeholder="Nom (ex: Passeport FR, Bail 12 rue...)"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b4fcf]/30"
            />
            <select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b4fcf]/30 bg-white">
              <option value="">Type...</option>
              {types.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
            <button
              onClick={() => create.mutate()}
              disabled={!form.name || !form.type || create.isPending}
              className="bg-[#5b4fcf] text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center gap-2 hover:bg-[#4c3fbd] transition-colors">
              {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 px-2">✕</button>
          </div>
        </div>
      )}

      {/* Entities list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-4 border-[#5b4fcf] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : entities.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <span className="text-4xl">{domain?.icon}</span>
          <p className="text-gray-400 mt-3 text-sm">Aucune entité dans ce domaine</p>
          <button onClick={() => setShowForm(true)}
            className="mt-4 text-[#5b4fcf] text-sm font-medium hover:underline">
            + Créer la première
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {entities.map((entity) => (
            <div key={entity.id}
              className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-[#5b4fcf]/20 transition-all group">
              <div className="flex items-start justify-between">
                <Link href={`/entities/${entity.id}`} className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-[#ede9fe] text-[#5b4fcf] px-2 py-0.5 rounded-full font-medium">
                      {entity.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-800 group-hover:text-[#5b4fcf] transition-colors">
                    {entity.name}
                  </h3>
                  {entity.notes && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{entity.notes}</p>}
                  <p className="text-xs text-gray-300 mt-2">
                    {new Date(entity.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </Link>
                <div className="flex items-center gap-1 ml-2">
                  <Link href={`/entities/${entity.id}`}
                    className="w-7 h-7 rounded-lg hover:bg-[#ede9fe] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <ChevronRight className="w-4 h-4 text-[#5b4fcf]" />
                  </Link>
                  <button
                    onClick={() => remove.mutate(entity.id)}
                    className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
