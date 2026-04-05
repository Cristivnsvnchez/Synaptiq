'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { getEntity, getDocuments, getAccesses, getReminders, uploadDocument, createAccess, dismissReminder, updateDocumentStatus, getDocumentDownloadUrl, getDocumentPreviewUrl, updateEntity, analyzeDocument } from '@/lib/api'
import { Entity, Document, Access, Reminder, DocumentAnalysis } from '@/types'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { Upload, Link as LinkIcon, Bell, Download, Archive, Plus, Loader2, ExternalLink, ChevronLeft, Edit2, Check, X, Eye, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const BILLING_CYCLES = [
  { value: 'monthly', label: 'Mensuel' },
  { value: 'yearly', label: 'Annuel' },
  { value: 'weekly', label: 'Hebdo' },
  { value: 'one_time', label: 'Unique' },
]

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    valid: 'bg-green-100 text-green-700', expired: 'bg-red-100 text-red-600',
    pending: 'bg-yellow-100 text-yellow-700', archived: 'bg-gray-100 text-gray-500',
  }
  const labels: Record<string, string> = { valid: 'Valide', expired: 'Expiré', pending: 'En attente', archived: 'Archivé' }
  return <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', map[status])}>{labels[status] || status}</span>
}

function monthlyPrice(price: number, cycle: string) {
  if (cycle === 'yearly') return price / 12
  if (cycle === 'weekly') return price * 4
  return price
}

export default function SubscriptionDetailPage() {
  const params = useParams()
  const id = params.id as string
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)
  const [analyzingDocId, setAnalyzingDocId] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<{ doc: Document; data: DocumentAnalysis } | null>(null)
  const [showAccessForm, setShowAccessForm] = useState(false)
  const [accessForm, setAccessForm] = useState({ label: '', url: '', account_ref: '', notes: '' })
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, string>>({})

  const { data: entity } = useQuery<Entity>({ queryKey: ['entity', id], queryFn: () => getEntity(id) })
  const { data: documents = [] } = useQuery<Document[]>({ queryKey: ['documents', id], queryFn: () => getDocuments(id) })
  const { data: accesses = [] } = useQuery<Access[]>({ queryKey: ['accesses', id], queryFn: () => getAccesses(id) })
  const { data: allReminders = [] } = useQuery<Reminder[]>({ queryKey: ['reminders'], queryFn: () => getReminders() })
  const reminders = allReminders.filter((r: Reminder) => r.entity_id === id && r.status === 'pending')

  const m = entity?.metadata_ as Record<string, unknown> | null
  const price = Number(m?.price) || 0
  const cycle = String(m?.billing_cycle || 'monthly')
  const category = String(m?.category || '—')
  const website = String(m?.website || '')
  const monthly = monthlyPrice(price, cycle)
  const yearly = monthly * 12

  const updateMeta = useMutation({
    mutationFn: () => updateEntity(id, {
      name: editForm.name || entity?.name,
      metadata_: { ...m, price: parseFloat(editForm.price) || price, billing_cycle: editForm.billing_cycle || cycle, category: editForm.category || category, website: editForm.website ?? website },
      notes: editForm.notes ?? entity?.notes,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['entity', id] }); setEditing(false) },
  })

  const addAccess = useMutation({
    mutationFn: () => createAccess({ entity_id: id, ...accessForm }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['accesses', id] }); setShowAccessForm(false); setAccessForm({ label: '', url: '', account_ref: '', notes: '' }) },
  })

  const dismiss = useMutation({
    mutationFn: dismissReminder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  })

  const archiveDoc = useMutation({
    mutationFn: (docId: string) => updateDocumentStatus(docId, 'archived'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents', id] }),
  })

  async function handleAnalyze(doc: Document) {
    setAnalyzingDocId(doc.id)
    try {
      const data: DocumentAnalysis = await analyzeDocument(doc.id)
      setAnalysisResult({ doc, data })
    } finally {
      setAnalyzingDocId(null)
    }
  }

  function applyAnalysis(analysis: DocumentAnalysis) {
    const s = analysis.suggested_metadata as Record<string, unknown>
    const newMeta = { ...m }
    if (s.price !== undefined) newMeta.price = s.price
    if (s.billing_cycle !== undefined) newMeta.billing_cycle = s.billing_cycle
    if (s.website !== undefined) newMeta.website = s.website
    updateEntity(id, { metadata_: newMeta }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['entity', id] })
      setAnalysisResult(null)
    })
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    const fd = new FormData(); fd.append('entity_id', id); fd.append('file', file)
    await uploadDocument(fd)
    queryClient.invalidateQueries({ queryKey: ['documents', id] })
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  function startEdit() {
    setEditForm({ name: entity?.name || '', price: String(price), billing_cycle: cycle, category, website, notes: entity?.notes || '' })
    setEditing(true)
  }

  const isImage = (mime?: string) => mime?.startsWith('image/')
  const isPdf = (mime?: string) => mime === 'application/pdf'
  const canPreview = (doc: Document) => isImage(doc.mime_type) || isPdf(doc.mime_type)

  return (
    <div className="p-8">
      {/* AI Analysis Result Modal */}
      {analysisResult && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6" onClick={() => setAnalysisResult(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#5b4fcf]" />
                <p className="font-semibold text-gray-800 text-sm">Données extraites — {analysisResult.doc.filename}</p>
              </div>
              <button onClick={() => setAnalysisResult(null)} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {/* Confidence */}
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-[#5b4fcf]" style={{ width: `${Math.round(analysisResult.data.confidence * 100)}%` }} />
                </div>
                <span className="text-xs text-gray-400">{Math.round(analysisResult.data.confidence * 100)}% confiance</span>
              </div>
              {/* All extracted fields */}
              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 max-h-48 overflow-y-auto">
                {Object.entries(analysisResult.data.fields).map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-sm">
                    <span className="text-gray-400 shrink-0 capitalize w-36">{k.replace(/_/g, ' ')} :</span>
                    <span className="text-gray-700 font-medium">{String(v)}</span>
                  </div>
                ))}
              </div>
              {/* Suggested metadata to apply */}
              {Object.keys(analysisResult.data.suggested_metadata).length > 0 && (
                <div className="bg-[#faf9ff] border border-[#5b4fcf]/20 rounded-xl p-3">
                  <p className="text-xs text-[#5b4fcf] font-semibold mb-2">Champs à mettre à jour</p>
                  {Object.entries(analysisResult.data.suggested_metadata).map(([k, v]) => (
                    <div key={k} className="flex gap-2 text-sm">
                      <span className="text-gray-400 shrink-0 w-28 capitalize">{k.replace(/_/g, ' ')} :</span>
                      <span className="text-[#5b4fcf] font-semibold">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
              {analysisResult.data.expires_at && (
                <p className="text-xs text-orange-600 bg-orange-50 rounded-xl px-3 py-2">
                  Date d'expiration détectée : <strong>{new Date(analysisResult.data.expires_at).toLocaleDateString('fr-FR')}</strong>
                </p>
              )}
            </div>
            <div className="px-6 pb-5 flex gap-2">
              {Object.keys(analysisResult.data.suggested_metadata).length > 0 && (
                <button onClick={() => applyAnalysis(analysisResult.data)}
                  className="flex-1 bg-[#5b4fcf] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#4c3fbd] transition-colors flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" /> Appliquer les champs
                </button>
              )}
              <button onClick={() => setAnalysisResult(null)}
                className="px-4 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6" onClick={() => setPreviewDoc(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700 truncate">{previewDoc.filename}</p>
              <div className="flex items-center gap-2 shrink-0">
                <a href={getDocumentDownloadUrl(previewDoc.id)} target="_blank"
                  className="flex items-center gap-1 text-xs text-[#5b4fcf] hover:underline">
                  <Download className="w-3.5 h-3.5" /> Télécharger
                </a>
                <button onClick={() => setPreviewDoc(null)} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center p-4">
              {isImage(previewDoc.mime_type) ? (
                <img src={getDocumentPreviewUrl(previewDoc.id)} alt={previewDoc.filename}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow" />
              ) : isPdf(previewDoc.mime_type) ? (
                <iframe src={getDocumentPreviewUrl(previewDoc.id)} className="w-full h-[70vh] rounded-lg border-0" title={previewDoc.filename} />
              ) : null}
            </div>
          </div>
        </div>
      )}
      {/* Breadcrumb */}
      <Link href="/domains/subscriptions" className="flex items-center gap-1 text-sm text-gray-400 hover:text-[#5b4fcf] mb-6 w-fit">
        <ChevronLeft className="w-4 h-4" /> Abonnements
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#ede9fe] flex items-center justify-center text-3xl shrink-0">
              📦
            </div>
            {editing ? (
              <div className="space-y-2">
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="text-xl font-bold border-b border-[#5b4fcf] focus:outline-none bg-transparent w-64" />
              </div>
            ) : (
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{entity?.name}</h1>
                <p className="text-gray-400 text-sm">{category}</p>
                {website && (
                  <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank"
                    className="flex items-center gap-1 text-xs text-[#5b4fcf] hover:underline mt-1">
                    {website} <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button onClick={() => updateMeta.mutate()}
                  className="flex items-center gap-1 bg-[#5b4fcf] text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-[#4c3fbd]">
                  <Check className="w-4 h-4" /> Enregistrer
                </button>
                <button onClick={() => setEditing(false)}
                  className="flex items-center gap-1 border border-gray-200 text-gray-500 px-3 py-2 rounded-xl text-sm hover:bg-gray-50">
                  <X className="w-4 h-4" /> Annuler
                </button>
              </>
            ) : (
              <button onClick={startEdit}
                className="flex items-center gap-1 border border-gray-200 text-gray-500 px-3 py-2 rounded-xl text-sm hover:bg-gray-50">
                <Edit2 className="w-4 h-4" /> Modifier
              </button>
            )}
          </div>
        </div>

        {/* Données tableau */}
        <div className="mt-6 grid grid-cols-2 gap-px bg-gray-100 rounded-xl overflow-hidden border border-gray-100">
          {[
            { label: 'Prix', value: editing
              ? <input type="number" step="0.01" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} className="border-b border-[#5b4fcf] focus:outline-none bg-transparent w-24 text-sm" />
              : `${price.toFixed(2)} €` },
            { label: 'Fréquence', value: editing
              ? <select value={editForm.billing_cycle} onChange={e => setEditForm(f => ({ ...f, billing_cycle: e.target.value }))} className="border-b border-[#5b4fcf] focus:outline-none bg-transparent text-sm">
                  {BILLING_CYCLES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              : BILLING_CYCLES.find(b => b.value === cycle)?.label || cycle },
            { label: 'Coût mensuel', value: `${monthly.toFixed(2)} €/mois` },
            { label: 'Coût annuel', value: `${yearly.toFixed(2)} €/an` },
            { label: 'Catégorie', value: editing
              ? <input value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} className="border-b border-[#5b4fcf] focus:outline-none bg-transparent text-sm w-40" />
              : category },
            { label: 'Site web', value: editing
              ? <input value={editForm.website} onChange={e => setEditForm(f => ({ ...f, website: e.target.value }))} className="border-b border-[#5b4fcf] focus:outline-none bg-transparent text-sm w-52" placeholder="https://..." />
              : website || '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white px-4 py-3">
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <div className="text-sm font-medium text-gray-800">{value}</div>
            </div>
          ))}
        </div>

        {/* Notes */}
        {(editing || entity?.notes) && (
          <div className="mt-4">
            <p className="text-xs text-gray-400 mb-1">Notes</p>
            {editing
              ? <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b4fcf]/30 resize-none" />
              : <p className="text-sm text-gray-600">{entity?.notes}</p>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Documents */}
        <div className="col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#5b4fcf]" /> Documents
            </h2>
            <div onDrop={async e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (!f) return; setUploading(true); const fd = new FormData(); fd.append('entity_id', id); fd.append('file', f); await uploadDocument(fd); queryClient.invalidateQueries({ queryKey: ['documents', id] }); setUploading(false) }}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-[#5b4fcf]/30 rounded-xl p-4 text-center cursor-pointer hover:border-[#5b4fcf]/60 hover:bg-[#faf9ff] transition-all mb-4">
              <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} />
              {uploading ? <Loader2 className="w-5 h-5 animate-spin text-[#5b4fcf] mx-auto" />
                : <p className="text-sm text-gray-400">Glisser un fichier ou cliquer · <span className="text-[#5b4fcf]">choisir</span></p>}
            </div>
            {documents.length === 0 ? <p className="text-center text-gray-300 text-sm py-4">Aucun document</p>
              : documents.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-[#faf9ff] group mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#ede9fe] flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-[#5b4fcf]">{doc.filename.split('.').pop()?.toUpperCase().slice(0, 3)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{doc.filename}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusBadge status={doc.status} />
                      {doc.expires_at && <span className="text-xs text-gray-400">exp. {new Date(doc.expires_at).toLocaleDateString('fr-FR')}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => handleAnalyze(doc)} disabled={analyzingDocId === doc.id}
                      className="w-7 h-7 rounded-lg hover:bg-[#ede9fe] flex items-center justify-center" title="Analyser avec l'IA">
                      {analyzingDocId === doc.id
                        ? <Loader2 className="w-3.5 h-3.5 text-[#5b4fcf] animate-spin" />
                        : <Sparkles className="w-3.5 h-3.5 text-[#5b4fcf]" />}
                    </button>
                    {canPreview(doc) && (
                      <button onClick={() => setPreviewDoc(doc)} className="w-7 h-7 rounded-lg hover:bg-white flex items-center justify-center">
                        <Eye className="w-3.5 h-3.5 text-[#5b4fcf]" />
                      </button>
                    )}
                    <a href={getDocumentDownloadUrl(doc.id)} target="_blank" className="w-7 h-7 rounded-lg hover:bg-white flex items-center justify-center">
                      <Download className="w-3.5 h-3.5 text-gray-500" />
                    </a>
                    <button onClick={() => archiveDoc.mutate(doc.id)} className="w-7 h-7 rounded-lg hover:bg-white flex items-center justify-center">
                      <Archive className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Accesses + Reminders */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-[#5b4fcf]" /> Accès
              </h2>
              <button onClick={() => setShowAccessForm(true)} className="w-7 h-7 rounded-lg bg-[#ede9fe] flex items-center justify-center hover:bg-[#ddd6fe]">
                <Plus className="w-3.5 h-3.5 text-[#5b4fcf]" />
              </button>
            </div>
            {showAccessForm && (
              <div className="space-y-2 mb-3 p-3 bg-[#faf9ff] rounded-xl border border-[#5b4fcf]/10">
                {(['label', 'url', 'account_ref'] as const).map(f => (
                  <input key={f} placeholder={{ label: 'Libellé *', url: 'URL', account_ref: 'Réf / N° compte' }[f]}
                    value={accessForm[f]} onChange={e => setAccessForm(a => ({ ...a, [f]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#5b4fcf]/30" />
                ))}
                <div className="flex gap-2">
                  <button onClick={() => addAccess.mutate()} disabled={!accessForm.label}
                    className="flex-1 bg-[#5b4fcf] text-white rounded-lg py-1.5 text-xs font-medium disabled:opacity-50">Ajouter</button>
                  <button onClick={() => setShowAccessForm(false)} className="text-gray-400 text-xs px-2">✕</button>
                </div>
              </div>
            )}
            {accesses.length === 0 ? <p className="text-xs text-gray-300 text-center py-3">Aucun accès</p>
              : accesses.map(a => (
                <div key={a.id} className="p-2.5 rounded-xl bg-gray-50 mb-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">{a.label}</p>
                    {a.url && <a href={a.url} target="_blank" className="text-[#5b4fcf] hover:opacity-70"><ExternalLink className="w-3.5 h-3.5" /></a>}
                  </div>
                  {a.account_ref && <p className="text-xs text-gray-400 mt-0.5">Réf: {a.account_ref}</p>}
                </div>
              ))}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
              <Bell className="w-4 h-4 text-[#5b4fcf]" /> Reminders
            </h2>
            {reminders.length === 0 ? <p className="text-xs text-gray-300 text-center py-3">Aucun reminder actif</p>
              : reminders.map(r => (
                <div key={r.id} className="flex items-start gap-2 p-2.5 rounded-xl bg-orange-50 mb-2 group">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-orange-700">{r.title}</p>
                    <p className="text-xs text-orange-400 mt-0.5">{new Date(r.trigger_date).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <button onClick={() => dismiss.mutate(r.id)}
                    className="opacity-0 group-hover:opacity-100 text-orange-300 hover:text-orange-500 text-xs transition-all">✕</button>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
