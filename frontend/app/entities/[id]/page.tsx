'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { getEntity, getDocuments, getAccesses, getReminders, uploadDocument, createAccess, dismissReminder, updateDocumentStatus, getDocumentDownloadUrl } from '@/lib/api'
import { Entity, Document, Access, Reminder } from '@/types'
import { useState, useRef } from 'react'
import { Upload, Link as LinkIcon, Bell, Download, Archive, Plus, Loader2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    valid: 'bg-green-100 text-green-700',
    expired: 'bg-red-100 text-red-600',
    pending: 'bg-yellow-100 text-yellow-700',
    archived: 'bg-gray-100 text-gray-500',
  }
  const labels: Record<string, string> = { valid: 'Valide', expired: 'Expiré', pending: 'En attente', archived: 'Archivé' }
  return <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', map[status] || map.pending)}>{labels[status] || status}</span>
}

export default function EntityPage() {
  const params = useParams()
  const id = params.id as string
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [showAccessForm, setShowAccessForm] = useState(false)
  const [accessForm, setAccessForm] = useState({ label: '', url: '', account_ref: '', notes: '' })

  const { data: entity } = useQuery<Entity>({ queryKey: ['entity', id], queryFn: () => getEntity(id) })
  const { data: documents = [] } = useQuery<Document[]>({ queryKey: ['documents', id], queryFn: () => getDocuments(id) })
  const { data: accesses = [] } = useQuery<Access[]>({ queryKey: ['accesses', id], queryFn: () => getAccesses(id) })
  const { data: reminders = [] } = useQuery<Reminder[]>({
    queryKey: ['reminders', id],
    queryFn: async () => { const all = await getReminders(); return all.filter((r: Reminder) => r.entity_id === id) }
  })

  const addAccess = useMutation({
    mutationFn: () => createAccess({ entity_id: id, ...accessForm }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['accesses', id] }); setShowAccessForm(false); setAccessForm({ label: '', url: '', account_ref: '', notes: '' }) },
  })

  const dismiss = useMutation({
    mutationFn: dismissReminder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders', id] }),
  })

  const archiveDoc = useMutation({
    mutationFn: (docId: string) => updateDocumentStatus(docId, 'archived'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents', id] }),
  })

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('entity_id', id)
    fd.append('file', file)
    await uploadDocument(fd)
    queryClient.invalidateQueries({ queryKey: ['documents', id] })
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('entity_id', id)
    fd.append('file', file)
    await uploadDocument(fd)
    queryClient.invalidateQueries({ queryKey: ['documents', id] })
    setUploading(false)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <span>Domaines</span><span>/</span>
          <span className="text-[#5b4fcf] font-medium">{entity?.type?.replace(/_/g, ' ')}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{entity?.name}</h1>
        {entity?.notes && <p className="text-gray-400 text-sm mt-1">{entity.notes}</p>}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Documents */}
        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#5b4fcf]" /> Documents
            </h2>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-[#5b4fcf]/30 rounded-xl p-6 text-center cursor-pointer hover:border-[#5b4fcf]/60 hover:bg-[#faf9ff] transition-all mb-4">
              <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} />
              {uploading
                ? <Loader2 className="w-6 h-6 animate-spin text-[#5b4fcf] mx-auto" />
                : <>
                  <Upload className="w-6 h-6 text-[#5b4fcf]/50 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Glisser un fichier ici</p>
                  <p className="text-xs text-gray-300 mt-1">ou cliquer pour choisir</p>
                </>}
            </div>

            {/* Document list */}
            {documents.length === 0 ? (
              <p className="text-center text-gray-300 text-sm py-4">Aucun document</p>
            ) : (
              <div className="space-y-2">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-[#faf9ff] group">
                    <div className="w-8 h-8 rounded-lg bg-[#ede9fe] flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-[#5b4fcf]">
                        {doc.filename.split('.').pop()?.toUpperCase().slice(0, 3) || 'DOC'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{doc.filename}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusBadge status={doc.status} />
                        {doc.expires_at && (
                          <span className="text-xs text-gray-400">
                            exp. {new Date(doc.expires_at).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <a href={getDocumentDownloadUrl(doc.id)} target="_blank"
                        className="w-7 h-7 rounded-lg hover:bg-white flex items-center justify-center">
                        <Download className="w-3.5 h-3.5 text-gray-500" />
                      </a>
                      <button onClick={() => archiveDoc.mutate(doc.id)}
                        className="w-7 h-7 rounded-lg hover:bg-white flex items-center justify-center">
                        <Archive className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Accesses + Reminders */}
        <div className="space-y-4">
          {/* Accesses */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-[#5b4fcf]" /> Accès
              </h2>
              <button onClick={() => setShowAccessForm(true)}
                className="w-7 h-7 rounded-lg bg-[#ede9fe] flex items-center justify-center hover:bg-[#ddd6fe]">
                <Plus className="w-3.5 h-3.5 text-[#5b4fcf]" />
              </button>
            </div>

            {showAccessForm && (
              <div className="space-y-2 mb-3 p-3 bg-[#faf9ff] rounded-xl border border-[#5b4fcf]/10">
                {(['label', 'url', 'account_ref'] as const).map(f => (
                  <input key={f}
                    placeholder={{ label: 'Libellé *', url: 'URL', account_ref: 'Référence / N° compte' }[f]}
                    value={accessForm[f]}
                    onChange={e => setAccessForm(a => ({ ...a, [f]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#5b4fcf]/30"
                  />
                ))}
                <div className="flex gap-2">
                  <button onClick={() => addAccess.mutate()} disabled={!accessForm.label}
                    className="flex-1 bg-[#5b4fcf] text-white rounded-lg py-1.5 text-xs font-medium disabled:opacity-50">
                    Ajouter
                  </button>
                  <button onClick={() => setShowAccessForm(false)} className="text-gray-400 text-xs px-2">✕</button>
                </div>
              </div>
            )}

            {accesses.length === 0
              ? <p className="text-xs text-gray-300 text-center py-3">Aucun accès enregistré</p>
              : accesses.map(a => (
                <div key={a.id} className="p-2.5 rounded-xl bg-gray-50 mb-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">{a.label}</p>
                    {a.url && <a href={a.url} target="_blank" className="text-[#5b4fcf] hover:opacity-70">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>}
                  </div>
                  {a.account_ref && <p className="text-xs text-gray-400 mt-0.5">Réf: {a.account_ref}</p>}
                </div>
              ))
            }
          </div>

          {/* Reminders */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
              <Bell className="w-4 h-4 text-[#5b4fcf]" /> Reminders
            </h2>
            {reminders.filter(r => r.status === 'pending').length === 0
              ? <p className="text-xs text-gray-300 text-center py-3">Aucun reminder actif</p>
              : reminders.filter(r => r.status === 'pending').map(r => (
                <div key={r.id} className="flex items-start gap-2 p-2.5 rounded-xl bg-orange-50 mb-2 group">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-orange-700">{r.title}</p>
                    <p className="text-xs text-orange-400 mt-0.5">
                      {new Date(r.trigger_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <button onClick={() => dismiss.mutate(r.id)}
                    className="opacity-0 group-hover:opacity-100 text-orange-300 hover:text-orange-500 text-xs transition-all">✕</button>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}
