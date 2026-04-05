'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { getEntity, getDocuments, uploadDocument, updateEntity,
  getDocumentPreviewUrl, getDocumentDownloadUrl, updateDocumentStatus } from '@/lib/api'
import { Entity, Document } from '@/types'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { ChevronLeft, Edit2, Check, X, Upload, Download, Eye, Archive,
  Loader2, ExternalLink, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

const VENDORS = ['SAP', 'Microsoft', 'Google', 'AWS', 'Cisco', 'Oracle', 'Salesforce', 'Linux', 'Autre']
const TYPES = [
  { value: 'notes_techniques', label: '📝 Notes techniques' },
  { value: 'certification_prep', label: '🎓 Préparation certif' },
  { value: 'sandbox', label: '🧪 Sandbox / Labs' },
  { value: 'veille', label: '📡 Veille technologique' },
  { value: 'formation', label: '🎬 Formation suivie' },
]
const CERT_STATUSES = [
  { value: '', label: '—' },
  { value: 'not_started', label: 'Non commencée' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'passed', label: '✅ Obtenue' },
  { value: 'failed', label: '❌ Échouée' },
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

export default function LearningWikiPage() {
  const params = useParams()
  const id = params.id as string
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [editing, setEditing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)

  // Edit state
  const [editName, setEditName] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editMeta, setEditMeta] = useState<Record<string, string>>({})

  const { data: entity, isLoading } = useQuery<Entity>({
    queryKey: ['entity', id],
    queryFn: () => getEntity(id),
  })
  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ['documents', id],
    queryFn: () => getDocuments(id),
  })

  const m = (entity?.metadata_ || {}) as Record<string, unknown>
  const vendor = String(m.vendor || 'Autre')
  const type = String(m.type || 'notes_techniques')
  const certName = String(m.certification_name || '')
  const examCode = String(m.exam_code || '')
  const certStatus = String(m.cert_status || '')
  const officialUrl = String(m.official_url || '')
  const sandboxUrl = String(m.sandbox_url || '')

  const typeLabel = TYPES.find(t => t.value === type)?.label || type
  const vendorColor = VENDOR_COLORS[vendor] || VENDOR_COLORS['Autre']
  const certStatusLabel = CERT_STATUSES.find(s => s.value === certStatus)?.label || ''

  function startEdit() {
    setEditName(entity?.name || '')
    setEditNotes(entity?.notes || '')
    setEditMeta({
      vendor,
      type,
      certification_name: certName,
      exam_code: examCode,
      cert_status: certStatus,
      official_url: officialUrl,
      sandbox_url: sandboxUrl,
    })
    setEditing(true)
  }

  const save = useMutation({
    mutationFn: () => updateEntity(id, {
      name: editName || entity?.name,
      notes: editNotes,
      metadata_: {
        ...m,
        vendor: editMeta.vendor,
        type: editMeta.type,
        certification_name: editMeta.certification_name,
        exam_code: editMeta.exam_code,
        cert_status: editMeta.cert_status,
        official_url: editMeta.official_url,
        sandbox_url: editMeta.sandbox_url,
      },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity', id] })
      setEditing(false)
    },
  })

  const archiveDoc = useMutation({
    mutationFn: (docId: string) => updateDocumentStatus(docId, 'archived'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents', id] }),
  })

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    const fd = new FormData(); fd.append('entity_id', id); fd.append('file', file)
    await uploadDocument(fd)
    queryClient.invalidateQueries({ queryKey: ['documents', id] })
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const isImage = (mime?: string | null) => !!mime?.startsWith('image/')
  const isPdf   = (mime?: string | null) => mime === 'application/pdf'
  const canPreview = (doc: Document) => isImage(doc.mime_type) || isPdf(doc.mime_type)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="w-6 h-6 border-4 border-[#5b4fcf] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/40">

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
          onClick={() => setPreviewDoc(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700 truncate">{previewDoc.filename}</p>
              <button onClick={() => setPreviewDoc(null)}
                className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center p-4">
              {isImage(previewDoc.mime_type)
                ? <img src={getDocumentPreviewUrl(previewDoc.id)} alt={previewDoc.filename}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow" />
                : <iframe src={getDocumentPreviewUrl(previewDoc.id)}
                    className="w-full h-[70vh] rounded-lg border-0" title={previewDoc.filename} />}
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-8 py-3 flex items-center justify-between">
        <Link href="/domains/learning"
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#5b4fcf] transition-colors">
          <ChevronLeft className="w-4 h-4" />
          <span>Knowledge Base</span>
        </Link>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button onClick={() => save.mutate()} disabled={save.isPending}
                className="flex items-center gap-1.5 bg-[#5b4fcf] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#4c3fbd] disabled:opacity-50 transition-colors">
                {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Enregistrer
              </button>
              <button onClick={() => setEditing(false)}
                className="flex items-center gap-1.5 border border-gray-200 text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                <X className="w-3.5 h-3.5" />
                Annuler
              </button>
            </>
          ) : (
            <button onClick={startEdit}
              className="flex items-center gap-1.5 border border-gray-200 text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-50 transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
              Modifier
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-0 max-w-[1400px] mx-auto">

        {/* Main content */}
        <div className="flex-1 min-w-0 px-12 py-8">

          {/* Vendor + type badges */}
          <div className="flex items-center gap-2 mb-4">
            <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full border', vendorColor)}>
              {vendor}
            </span>
            <span className="text-xs text-gray-400">{typeLabel}</span>
            {certStatusLabel && (
              <span className="text-xs bg-purple-50 text-purple-600 px-2.5 py-1 rounded-full border border-purple-200">
                {certStatusLabel}
              </span>
            )}
          </div>

          {/* Title */}
          {editing ? (
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="w-full text-3xl font-bold text-gray-900 focus:outline-none border-b-2 border-[#5b4fcf]/40 pb-2 mb-2 bg-transparent"
              placeholder="Titre de la page..."
            />
          ) : (
            <h1 className="text-3xl font-bold text-gray-900 mb-2 leading-tight">
              {entity?.name}
            </h1>
          )}

          {/* Meta line */}
          <p className="text-xs text-gray-300 mb-8">
            Dernière modification : {entity ? new Date(entity.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
          </p>

          {/* Main content area */}
          <div className="min-h-[400px]">
            {editing ? (
              <textarea
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                placeholder={'Commence ta documentation ici...\n\n## Vue d\'ensemble\n\n## Points clés\n\n## Ressources\n\n## Notes personnelles'}
                className="w-full min-h-[500px] text-sm text-gray-700 leading-relaxed focus:outline-none bg-transparent resize-none font-mono"
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
              />
            ) : entity?.notes ? (
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {entity.notes}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <FileText className="w-12 h-12 text-gray-100 mb-4" />
                <p className="text-gray-300 text-sm font-medium">Page vide</p>
                <p className="text-gray-200 text-xs mt-1 mb-4">Clique sur Modifier pour commencer à documenter</p>
                <button onClick={startEdit}
                  className="text-[#5b4fcf] text-sm font-medium hover:underline">
                  + Commencer à écrire
                </button>
              </div>
            )}
          </div>

          {/* Documents section */}
          <div className="mt-12 pt-8 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Certificats & Fichiers
              </h2>
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-[#5b4fcf] hover:underline font-medium">
                <Upload className="w-3.5 h-3.5" />
                Joindre un fichier
              </button>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} />
            </div>

            {uploading && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#faf9ff] border border-[#5b4fcf]/20 mb-2">
                <Loader2 className="w-4 h-4 text-[#5b4fcf] animate-spin" />
                <span className="text-sm text-[#5b4fcf]">Envoi en cours...</span>
              </div>
            )}

            {documents.length === 0 && !uploading ? (
              <div
                onDrop={async e => {
                  e.preventDefault()
                  const f = e.dataTransfer.files?.[0]; if (!f) return
                  setUploading(true)
                  const fd = new FormData(); fd.append('entity_id', id); fd.append('file', f)
                  await uploadDocument(fd)
                  queryClient.invalidateQueries({ queryKey: ['documents', id] })
                  setUploading(false)
                }}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-[#5b4fcf]/40 hover:bg-[#faf9ff] transition-all">
                <p className="text-sm text-gray-300">
                  Glisser des fichiers ici ou <span className="text-[#5b4fcf]">choisir</span>
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map(doc => (
                  <div key={doc.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-[#faf9ff] group transition-all">
                    <div className="w-8 h-8 rounded-lg bg-[#ede9fe] flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-[#5b4fcf]">
                        {doc.filename.split('.').pop()?.toUpperCase().slice(0, 3)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{doc.filename}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      {canPreview(doc) && (
                        <button onClick={() => setPreviewDoc(doc)}
                          className="w-7 h-7 rounded-lg hover:bg-white flex items-center justify-center" title="Prévisualiser">
                          <Eye className="w-3.5 h-3.5 text-[#5b4fcf]" />
                        </button>
                      )}
                      <a href={getDocumentDownloadUrl(doc.id)} target="_blank"
                        className="w-7 h-7 rounded-lg hover:bg-white flex items-center justify-center" title="Télécharger">
                        <Download className="w-3.5 h-3.5 text-gray-500" />
                      </a>
                      <button onClick={() => archiveDoc.mutate(doc.id)}
                        className="w-7 h-7 rounded-lg hover:bg-white flex items-center justify-center" title="Archiver">
                        <Archive className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar — metadata */}
        <div className="w-72 shrink-0 px-6 py-8 border-l border-gray-100 bg-white min-h-screen">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-5">Informations</h3>

          <div className="space-y-5">

            {/* Vendor */}
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Vendor</label>
              {editing ? (
                <select value={editMeta.vendor}
                  onChange={e => setEditMeta(m => ({ ...m, vendor: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5b4fcf]/30">
                  {VENDORS.map(v => <option key={v}>{v}</option>)}
                </select>
              ) : (
                <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full border inline-block', vendorColor)}>
                  {vendor}
                </span>
              )}
            </div>

            {/* Type */}
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Type</label>
              {editing ? (
                <select value={editMeta.type}
                  onChange={e => setEditMeta(m => ({ ...m, type: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5b4fcf]/30">
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              ) : (
                <p className="text-sm text-gray-700">{typeLabel}</p>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 pt-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Certification</p>

              {/* Cert name */}
              <div className="mb-4">
                <label className="text-xs text-gray-400 block mb-1.5">Nom de la certif</label>
                {editing ? (
                  <input value={editMeta.certification_name}
                    onChange={e => setEditMeta(m => ({ ...m, certification_name: e.target.value }))}
                    placeholder="ex: SAP Certified Associate"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b4fcf]/30" />
                ) : certName ? (
                  <p className="text-sm text-gray-700">{certName}</p>
                ) : (
                  <p className="text-xs text-gray-300 italic">—</p>
                )}
              </div>

              {/* Exam code */}
              <div className="mb-4">
                <label className="text-xs text-gray-400 block mb-1.5">Code examen</label>
                {editing ? (
                  <input value={editMeta.exam_code}
                    onChange={e => setEditMeta(m => ({ ...m, exam_code: e.target.value }))}
                    placeholder="ex: AZ-900, C_S4CS_2408"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b4fcf]/30" />
                ) : examCode ? (
                  <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded-md">{examCode}</span>
                ) : (
                  <p className="text-xs text-gray-300 italic">—</p>
                )}
              </div>

              {/* Cert status */}
              <div className="mb-4">
                <label className="text-xs text-gray-400 block mb-1.5">Statut</label>
                {editing ? (
                  <select value={editMeta.cert_status}
                    onChange={e => setEditMeta(m => ({ ...m, cert_status: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5b4fcf]/30">
                    {CERT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                ) : certStatusLabel ? (
                  <p className="text-sm text-gray-700">{certStatusLabel}</p>
                ) : (
                  <p className="text-xs text-gray-300 italic">—</p>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 pt-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Liens</p>

              {/* Official URL */}
              <div className="mb-4">
                <label className="text-xs text-gray-400 block mb-1.5">Documentation officielle</label>
                {editing ? (
                  <input value={editMeta.official_url}
                    onChange={e => setEditMeta(m => ({ ...m, official_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b4fcf]/30" />
                ) : officialUrl ? (
                  <a href={officialUrl.startsWith('http') ? officialUrl : `https://${officialUrl}`}
                    target="_blank"
                    className="flex items-center gap-1.5 text-sm text-[#5b4fcf] hover:underline truncate">
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{officialUrl.replace(/^https?:\/\//, '')}</span>
                  </a>
                ) : (
                  <p className="text-xs text-gray-300 italic">—</p>
                )}
              </div>

              {/* Sandbox URL */}
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Sandbox / Lab</label>
                {editing ? (
                  <input value={editMeta.sandbox_url}
                    onChange={e => setEditMeta(m => ({ ...m, sandbox_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b4fcf]/30" />
                ) : sandboxUrl ? (
                  <a href={sandboxUrl.startsWith('http') ? sandboxUrl : `https://${sandboxUrl}`}
                    target="_blank"
                    className="flex items-center gap-1.5 text-sm text-[#5b4fcf] hover:underline truncate">
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{sandboxUrl.replace(/^https?:\/\//, '')}</span>
                  </a>
                ) : (
                  <p className="text-xs text-gray-300 italic">—</p>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
