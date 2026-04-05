'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { getEntity, getEntities, getDocuments, uploadDocument, updateEntity, createEntity,
  getDocumentPreviewUrl, getDocumentDownloadUrl, updateDocumentStatus } from '@/lib/api'
import { Entity, Document } from '@/types'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { ChevronLeft, Edit2, Check, X, Upload, Download, Eye, Archive,
  Loader2, ExternalLink, FileText, Plus, ChevronRight } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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

// ─── Toolbar helpers ──────────────────────────────────────────────────────────

function insertAtCursor(
  textarea: HTMLTextAreaElement,
  before: string,
  after = '',
  setValue: (v: string) => void
) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = textarea.value.substring(start, end)
  const newValue =
    textarea.value.substring(0, start) +
    before +
    selected +
    after +
    textarea.value.substring(end)
  setValue(newValue)
  // Restore cursor after React re-render
  requestAnimationFrame(() => {
    textarea.focus()
    const cursor = start + before.length + selected.length + after.length
    textarea.setSelectionRange(
      start + before.length,
      start + before.length + selected.length
    )
    if (!selected) textarea.setSelectionRange(cursor, cursor)
  })
}

function insertAtLineStart(
  textarea: HTMLTextAreaElement,
  prefix: string,
  setValue: (v: string) => void
) {
  const start = textarea.selectionStart
  const text = textarea.value
  const lineStart = text.lastIndexOf('\n', start - 1) + 1
  const newValue = text.substring(0, lineStart) + prefix + text.substring(lineStart)
  setValue(newValue)
  requestAnimationFrame(() => {
    textarea.focus()
    const newPos = start + prefix.length
    textarea.setSelectionRange(newPos, newPos)
  })
}

// ─── Custom blockquote renderer for colored callout boxes ─────────────────────

function CalloutBlockquote({ children }: { children: React.ReactNode }) {
  // Convert children to string to detect prefix
  const text = extractText(children)
  if (text.startsWith('ℹ️')) {
    return (
      <div className="flex gap-3 bg-[#5b9bd4]/10 border border-[#5b9bd4]/20 rounded-xl px-4 py-3 my-3 text-sm text-[#5b9bd4]">
        <span className="shrink-0 text-base">ℹ️</span>
        <span>{text.replace(/^ℹ️\s*/, '')}</span>
      </div>
    )
  }
  if (text.startsWith('⚠️')) {
    return (
      <div className="flex gap-3 bg-[#d4925a]/10 border border-[#d4925a]/20 rounded-xl px-4 py-3 my-3 text-sm text-[#d4925a]">
        <span className="shrink-0 text-base">⚠️</span>
        <span>{text.replace(/^⚠️\s*/, '')}</span>
      </div>
    )
  }
  if (text.startsWith('✅')) {
    return (
      <div className="flex gap-3 bg-[#5cc987]/10 border border-[#5cc987]/20 rounded-xl px-4 py-3 my-3 text-sm text-[#5cc987]">
        <span className="shrink-0 text-base">✅</span>
        <span>{text.replace(/^✅\s*/, '')}</span>
      </div>
    )
  }
  return (
    <blockquote className="border-l-4 border-[#243028] pl-4 my-3 text-[#6e9480] italic">
      {children}
    </blockquote>
  )
}

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return (node as React.ReactNode[]).map(extractText).join('')
  if (node && typeof node === 'object' && 'props' in (node as object)) {
    return extractText((node as React.ReactElement<{ children?: React.ReactNode }>).props.children)
  }
  return ''
}

// ─── Toolbar component ────────────────────────────────────────────────────────

function EditorToolbar({
  textareaRef,
  editNotes,
  setEditNotes,
  previewMode,
  setPreviewMode,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  editNotes: string
  setEditNotes: (v: string) => void
  previewMode: boolean
  setPreviewMode: (v: boolean) => void
}) {
  function act(fn: (ta: HTMLTextAreaElement) => void) {
    const ta = textareaRef.current
    if (ta) fn(ta)
  }

  const btn = (label: string, title: string, onClick: () => void, extra = '') =>
    <button
      key={title}
      type="button"
      title={title}
      onClick={onClick}
      className={`h-7 px-2 rounded-md text-xs font-medium text-[#6e9480] hover:bg-[#2a3830] hover:text-[#dce8e1] transition-colors ${extra}`}
    >
      {label}
    </button>

  const sep = <div className="w-px h-5 bg-[#2a3830] mx-0.5 self-center" />

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 bg-[#1e2d27] rounded-xl mb-2 flex-wrap">
      {btn('H1', 'Heading 1', () => act(ta => insertAtLineStart(ta, '# ', setEditNotes)))}
      {btn('H2', 'Heading 2', () => act(ta => insertAtLineStart(ta, '## ', setEditNotes)))}
      {btn('H3', 'Heading 3', () => act(ta => insertAtLineStart(ta, '### ', setEditNotes)))}
      {sep}
      {btn('B', 'Bold', () => act(ta => insertAtCursor(ta, '**', '**', setEditNotes)), 'font-bold')}
      {btn('I', 'Italic', () => act(ta => insertAtCursor(ta, '*', '*', setEditNotes)), 'italic')}
      {btn('`code`', 'Inline code', () => act(ta => insertAtCursor(ta, '`', '`', setEditNotes)), 'font-mono text-[11px]')}
      {btn('```bloc```', 'Code block', () => act(ta => insertAtCursor(ta, '```\n', '\n```', setEditNotes)), 'font-mono text-[11px]')}
      {sep}
      {btn('• Liste', 'Bullet list', () => act(ta => insertAtLineStart(ta, '- ', setEditNotes)))}
      {btn('1. Liste', 'Numbered list', () => act(ta => insertAtLineStart(ta, '1. ', setEditNotes)))}
      {sep}
      {btn('ℹ️ Info', 'Info block', () => act(ta => insertAtCursor(ta, '> ℹ️ ', '', setEditNotes)))}
      {btn('⚠️ Warn', 'Warning block', () => act(ta => insertAtCursor(ta, '> ⚠️ ', '', setEditNotes)))}
      {btn('✅ OK', 'Success block', () => act(ta => insertAtCursor(ta, '> ✅ ', '', setEditNotes)))}
      {sep}
      <button
        type="button"
        onClick={() => setPreviewMode(!previewMode)}
        title={previewMode ? 'Mode écriture' : 'Aperçu'}
        className={`h-7 px-2.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
          previewMode
            ? 'bg-[#5cc987] text-[#0d1a13]'
            : 'text-[#6e9480] hover:bg-[#2a3830] hover:text-[#dce8e1]'
        }`}
      >
        <Eye className="w-3.5 h-3.5" />
        {previewMode ? 'Écriture' : 'Aperçu'}
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LearningWikiPage() {
  const params = useParams()
  const id = params.id as string
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [editing, setEditing] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)

  // Edit state
  const [editName, setEditName] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editMeta, setEditMeta] = useState<Record<string, string>>({})

  // Sub-page form
  const [showSubPageForm, setShowSubPageForm] = useState(false)
  const [subPageName, setSubPageName] = useState('')

  const { data: entity, isLoading } = useQuery<Entity>({
    queryKey: ['entity', id],
    queryFn: () => getEntity(id),
  })

  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ['documents', id],
    queryFn: () => getDocuments(id),
  })

  // Fetch all entities in this domain to find sub-pages and parent
  const { data: allEntities = [] } = useQuery<Entity[]>({
    queryKey: ['entities', entity?.domain_id],
    queryFn: () => getEntities(entity!.domain_id),
    enabled: !!entity?.domain_id,
  })

  const m = (entity?.metadata_ || {}) as Record<string, unknown>
  const type = String(m.type || 'notes_techniques')
  const certName = String(m.certification_name || '')
  const examCode = String(m.exam_code || '')
  const certStatus = String(m.cert_status || '')
  const officialUrl = String(m.official_url || '')
  const sandboxUrl = String(m.sandbox_url || '')
  const parentId = m.parent_id ? String(m.parent_id) : null

  const typeLabel = TYPES.find(t => t.value === type)?.label || type
  const certStatusLabel = CERT_STATUSES.find(s => s.value === certStatus)?.label || ''

  // Sub-pages: entities that have parent_id === current id
  const subPages = allEntities.filter(e => {
    const em = (e.metadata_ || {}) as Record<string, unknown>
    return String(em.parent_id || '') === id
  })

  // Parent entity
  const parentEntity = parentId
    ? allEntities.find(e => e.id === parentId) || null
    : null

  function startEdit() {
    setEditName(entity?.name || '')
    setEditNotes(entity?.notes || '')
    setEditMeta({
      type,
      certification_name: certName,
      exam_code: examCode,
      cert_status: certStatus,
      official_url: officialUrl,
      sandbox_url: sandboxUrl,
    })
    setPreviewMode(false)
    setEditing(true)
  }

  const save = useMutation({
    mutationFn: () => updateEntity(id, {
      name: editName || entity?.name,
      notes: editNotes,
      metadata_: {
        ...m,
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
      setPreviewMode(false)
    },
  })

  const createSubPage = useMutation({
    mutationFn: () => createEntity({
      domain_id: entity!.domain_id,
      name: subPageName,
      type: entity!.type,
      metadata_: {
        type,
        parent_id: id,
      },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities', entity?.domain_id] })
      setSubPageName('')
      setShowSubPageForm(false)
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
        <div className="w-6 h-6 border-4 border-[#5cc987] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#111918]">

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
          onClick={() => setPreviewDoc(null)}>
          <div className="bg-[#182421] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#243028]">
              <p className="text-sm font-semibold text-[#b8d4c4] truncate">{previewDoc.filename}</p>
              <button onClick={() => setPreviewDoc(null)}
                className="w-7 h-7 rounded-lg hover:bg-[#1e2d27] flex items-center justify-center">
                <X className="w-4 h-4 text-[#4d6b5a]" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-[#111918] flex items-center justify-center p-4">
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
      <div className="sticky top-0 z-10 bg-[#0c1210] border-b border-[#182421] px-8 py-3 flex items-center justify-between">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-[#4d6b5a]">
          <Link href="/domains/learning"
            className="hover:text-[#5cc987] transition-colors flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" />
            Knowledge Base
          </Link>
          {parentEntity && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-[#3a5347]" />
              <Link href={`/learning/${parentEntity.id}`}
                className="hover:text-[#5cc987] transition-colors truncate max-w-[180px]">
                {parentEntity.name}
              </Link>
            </>
          )}
          {entity && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-[#3a5347]" />
              <span className="text-[#6e9480] truncate max-w-[200px]">{entity.name}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button onClick={() => save.mutate()} disabled={save.isPending}
                className="flex items-center gap-1.5 bg-[#5cc987] text-[#0d1a13] px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#4db974] disabled:opacity-50 transition-colors">
                {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Enregistrer
              </button>
              <button onClick={() => { setEditing(false); setPreviewMode(false) }}
                className="flex items-center gap-1.5 border border-[#243028] text-[#6e9480] px-4 py-2 rounded-xl text-sm hover:bg-[#1a2822] transition-colors">
                <X className="w-3.5 h-3.5" />
                Annuler
              </button>
            </>
          ) : (
            <button onClick={startEdit}
              className="flex items-center gap-1.5 border border-[#243028] text-[#6e9480] px-4 py-2 rounded-xl text-sm hover:bg-[#1a2822] transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
              Modifier
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-0 max-w-[1400px] mx-auto">

        {/* Main content */}
        <div className="flex-1 min-w-0 px-12 py-8">

          {/* Type + cert status badges */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-[#4d6b5a]">{typeLabel}</span>
            {certStatusLabel && (
              <span className="text-xs bg-[#5cc987]/10 text-[#5cc987] px-2.5 py-1 rounded-full border border-[#5cc987]/20">
                {certStatusLabel}
              </span>
            )}
          </div>

          {/* Title */}
          {editing ? (
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="w-full text-3xl font-bold text-[#dce8e1] focus:outline-none border-b-2 border-[#5cc987]/40 pb-2 mb-2 bg-transparent placeholder:text-[#3a5347]"
              placeholder="Titre de la page..."
            />
          ) : (
            <h1 className="text-3xl font-bold text-[#dce8e1] mb-2 leading-tight">
              {entity?.name}
            </h1>
          )}

          {/* Meta line */}
          <p className="text-xs text-[#3a5347] mb-8">
            Dernière modification : {entity ? new Date(entity.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
          </p>

          {/* Editor toolbar — only in edit mode */}
          {editing && (
            <EditorToolbar
              textareaRef={textareaRef}
              editNotes={editNotes}
              setEditNotes={setEditNotes}
              previewMode={previewMode}
              setPreviewMode={setPreviewMode}
            />
          )}

          {/* Main content area */}
          <div className="min-h-[400px]">
            {editing ? (
              previewMode ? (
                <div className="prose prose-sm max-w-none text-[#b8d4c4] min-h-[400px] py-2">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      blockquote: ({ children }) => <CalloutBlockquote>{children}</CalloutBlockquote>,
                      h1: ({ children }) => <h1 className="text-2xl font-bold text-[#dce8e1] mt-6 mb-3">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-xl font-semibold text-[#dce8e1] mt-5 mb-2">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-base font-semibold text-[#b8d4c4] mt-4 mb-2">{children}</h3>,
                      code: ({ children, className }) => {
                        const isBlock = className?.includes('language-')
                        return isBlock
                          ? <code className="block bg-[#111918] border border-[#243028] rounded-lg px-4 py-3 text-xs font-mono text-[#b8d4c4] overflow-x-auto">{children}</code>
                          : <code className="bg-[#1e2d27] text-[#5cc987] rounded px-1.5 py-0.5 text-xs font-mono">{children}</code>
                      },
                      pre: ({ children }) => <pre className="bg-[#111918] border border-[#243028] rounded-xl p-4 overflow-x-auto my-3">{children}</pre>,
                      a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="text-[#5cc987] hover:underline">{children}</a>,
                      ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2 text-[#b8d4c4]">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2 text-[#b8d4c4]">{children}</ol>,
                      li: ({ children }) => <li className="text-sm">{children}</li>,
                      p: ({ children }) => <p className="text-sm text-[#b8d4c4] leading-relaxed my-2">{children}</p>,
                      hr: () => <hr className="border-[#243028] my-6" />,
                      table: ({ children }) => <table className="w-full border-collapse text-sm my-4">{children}</table>,
                      th: ({ children }) => <th className="text-left border border-[#243028] px-3 py-2 bg-[#1e2d27] font-semibold text-[#b8d4c4] text-xs uppercase">{children}</th>,
                      td: ({ children }) => <td className="border border-[#243028] px-3 py-2 text-[#6e9480]">{children}</td>,
                    }}
                  >
                    {editNotes || '*Rien à prévisualiser*'}
                  </ReactMarkdown>
                </div>
              ) : (
                <textarea
                  ref={textareaRef}
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder={"Commence ta documentation ici...\n\n## Vue d'ensemble\n\n## Points clés\n\n## Ressources\n\n## Notes personnelles"}
                  className="w-full min-h-[500px] text-sm text-[#b8d4c4] leading-relaxed focus:outline-none bg-transparent resize-none font-mono placeholder:text-[#3a5347]"
                  style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
                />
              )
            ) : entity?.notes ? (
              <div className="prose prose-sm max-w-none text-[#b8d4c4]">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    blockquote: ({ children }) => <CalloutBlockquote>{children}</CalloutBlockquote>,
                    h1: ({ children }) => <h1 className="text-2xl font-bold text-[#dce8e1] mt-6 mb-3">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xl font-semibold text-[#dce8e1] mt-5 mb-2">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-base font-semibold text-[#b8d4c4] mt-4 mb-2">{children}</h3>,
                    code: ({ children, className }) => {
                      const isBlock = className?.includes('language-')
                      return isBlock
                        ? <code className="block bg-[#111918] border border-[#243028] rounded-lg px-4 py-3 text-xs font-mono text-[#b8d4c4] overflow-x-auto">{children}</code>
                        : <code className="bg-[#1e2d27] text-[#5cc987] rounded px-1.5 py-0.5 text-xs font-mono">{children}</code>
                    },
                    pre: ({ children }) => <pre className="bg-[#111918] border border-[#243028] rounded-xl p-4 overflow-x-auto my-3">{children}</pre>,
                    a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="text-[#5cc987] hover:underline">{children}</a>,
                    ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2 text-[#b8d4c4]">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2 text-[#b8d4c4]">{children}</ol>,
                    li: ({ children }) => <li className="text-sm">{children}</li>,
                    p: ({ children }) => <p className="text-sm text-[#b8d4c4] leading-relaxed my-2">{children}</p>,
                    hr: () => <hr className="border-[#243028] my-6" />,
                    table: ({ children }) => <table className="w-full border-collapse text-sm my-4">{children}</table>,
                    th: ({ children }) => <th className="text-left border border-[#243028] px-3 py-2 bg-[#1e2d27] font-semibold text-[#b8d4c4] text-xs uppercase">{children}</th>,
                    td: ({ children }) => <td className="border border-[#243028] px-3 py-2 text-[#6e9480]">{children}</td>,
                  }}
                >
                  {entity.notes}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <FileText className="w-12 h-12 text-[#243028] mb-4" />
                <p className="text-[#3a5347] text-sm font-medium">Page vide</p>
                <p className="text-[#3a5347] text-xs mt-1 mb-4">Clique sur Modifier pour commencer à documenter</p>
                <button onClick={startEdit}
                  className="text-[#5cc987] text-sm font-medium hover:underline">
                  + Commencer à écrire
                </button>
              </div>
            )}
          </div>

          {/* Sub-pages section */}
          <div className="mt-10 pt-8 border-t border-[#243028]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#6e9480] uppercase tracking-wide">
                Sous-pages
              </h2>
              <button
                onClick={() => setShowSubPageForm(v => !v)}
                className="flex items-center gap-1.5 text-xs text-[#5cc987] hover:underline font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Nouvelle sous-page
              </button>
            </div>

            {showSubPageForm && (
              <div className="flex gap-2 mb-4">
                <input
                  value={subPageName}
                  onChange={e => setSubPageName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && subPageName && createSubPage.mutate()}
                  placeholder="Titre de la sous-page..."
                  className="flex-1 border border-[#2a3830] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#5cc987]/20 bg-[#1e2d27] text-[#dce8e1] placeholder:text-[#3a5347]"
                  autoFocus
                />
                <button
                  onClick={() => createSubPage.mutate()}
                  disabled={!subPageName || createSubPage.isPending}
                  className="bg-[#5cc987] text-[#0d1a13] px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-[#4db974] flex items-center gap-2 transition-colors"
                >
                  {createSubPage.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Créer'}
                </button>
                <button
                  onClick={() => { setShowSubPageForm(false); setSubPageName('') }}
                  className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#243028] text-[#4d6b5a] hover:bg-[#1a2822] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {subPages.length === 0 && !showSubPageForm ? (
              <p className="text-xs text-[#3a5347] italic">Aucune sous-page — clique sur &quot;Nouvelle sous-page&quot; pour en créer une.</p>
            ) : (
              <div className="space-y-1">
                {subPages.map(sp => (
                  <Link
                    key={sp.id}
                    href={`/learning/${sp.id}`}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#1a2822] group transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#3a5347] group-hover:text-[#5cc987] shrink-0 transition-colors" />
                    <span className="text-sm text-[#6e9480] group-hover:text-[#5cc987] transition-colors flex-1">
                      {sp.name}
                    </span>
                    <span className="text-xs text-[#3a5347]">
                      {new Date(sp.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#3a5347] group-hover:text-[#5cc987] transition-colors opacity-0 group-hover:opacity-100" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Documents section */}
          <div className="mt-10 pt-8 border-t border-[#243028]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#6e9480] uppercase tracking-wide">
                Certificats & Fichiers
              </h2>
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-[#5cc987] hover:underline font-medium">
                <Upload className="w-3.5 h-3.5" />
                Joindre un fichier
              </button>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} />
            </div>

            {uploading && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#5cc987]/10 border border-[#5cc987]/20 mb-2">
                <Loader2 className="w-4 h-4 text-[#5cc987] animate-spin" />
                <span className="text-sm text-[#5cc987]">Envoi en cours...</span>
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
                className="border-2 border-dashed border-[#243028] rounded-xl p-8 text-center cursor-pointer hover:border-[#5cc987]/40 hover:bg-[#5cc987]/10 transition-all">
                <p className="text-sm text-[#3a5347]">
                  Glisser des fichiers ici ou <span className="text-[#5cc987]">choisir</span>
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map(doc => (
                  <div key={doc.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-[#1e2d27] hover:bg-[#5cc987]/10 group transition-all">
                    <div className="w-8 h-8 rounded-lg bg-[#5cc987]/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-[#5cc987]">
                        {doc.filename.split('.').pop()?.toUpperCase().slice(0, 3)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#b8d4c4] truncate">{doc.filename}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      {canPreview(doc) && (
                        <button onClick={() => setPreviewDoc(doc)}
                          className="w-7 h-7 rounded-lg hover:bg-[#182421] flex items-center justify-center" title="Prévisualiser">
                          <Eye className="w-3.5 h-3.5 text-[#5cc987]" />
                        </button>
                      )}
                      <a href={getDocumentDownloadUrl(doc.id)} target="_blank"
                        className="w-7 h-7 rounded-lg hover:bg-[#182421] flex items-center justify-center" title="Télécharger">
                        <Download className="w-3.5 h-3.5 text-[#6e9480]" />
                      </a>
                      <button onClick={() => archiveDoc.mutate(doc.id)}
                        className="w-7 h-7 rounded-lg hover:bg-[#182421] flex items-center justify-center" title="Archiver">
                        <Archive className="w-3.5 h-3.5 text-[#4d6b5a]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar — metadata */}
        <div className="w-72 shrink-0 px-6 py-8 border-l border-[#182421] bg-[#0f1915] min-h-screen">
          <h3 className="text-xs font-semibold text-[#4d6b5a] uppercase tracking-wide mb-5">Informations</h3>

          <div className="space-y-5">

            {/* Type */}
            <div>
              <label className="text-xs text-[#4d6b5a] block mb-1.5">Type</label>
              {editing ? (
                <select value={editMeta.type}
                  onChange={e => setEditMeta(m => ({ ...m, type: e.target.value }))}
                  className="w-full border border-[#2a3830] rounded-lg px-3 py-2 text-sm bg-[#1e2d27] text-[#dce8e1] focus:outline-none focus:ring-1 focus:ring-[#5cc987]/20">
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              ) : (
                <p className="text-sm text-[#b8d4c4]">{typeLabel}</p>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-[#243028] pt-5">
              <p className="text-xs font-semibold text-[#4d6b5a] uppercase tracking-wide mb-4">Certification</p>

              {/* Cert name */}
              <div className="mb-4">
                <label className="text-xs text-[#4d6b5a] block mb-1.5">Nom de la certif</label>
                {editing ? (
                  <input value={editMeta.certification_name}
                    onChange={e => setEditMeta(m => ({ ...m, certification_name: e.target.value }))}
                    placeholder="ex: SAP Certified Associate"
                    className="w-full border border-[#2a3830] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#5cc987]/20 bg-[#1e2d27] text-[#dce8e1] placeholder:text-[#3a5347]" />
                ) : certName ? (
                  <p className="text-sm text-[#b8d4c4]">{certName}</p>
                ) : (
                  <p className="text-xs text-[#3a5347] italic">—</p>
                )}
              </div>

              {/* Exam code */}
              <div className="mb-4">
                <label className="text-xs text-[#4d6b5a] block mb-1.5">Code examen</label>
                {editing ? (
                  <input value={editMeta.exam_code}
                    onChange={e => setEditMeta(m => ({ ...m, exam_code: e.target.value }))}
                    placeholder="ex: AZ-900, C_S4CS_2408"
                    className="w-full border border-[#2a3830] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#5cc987]/20 bg-[#1e2d27] text-[#dce8e1] placeholder:text-[#3a5347]" />
                ) : examCode ? (
                  <span className="text-xs font-mono bg-[#1e2d27] text-[#b8d4c4] px-2 py-1 rounded-md">{examCode}</span>
                ) : (
                  <p className="text-xs text-[#3a5347] italic">—</p>
                )}
              </div>

              {/* Cert status */}
              <div className="mb-4">
                <label className="text-xs text-[#4d6b5a] block mb-1.5">Statut</label>
                {editing ? (
                  <select value={editMeta.cert_status}
                    onChange={e => setEditMeta(m => ({ ...m, cert_status: e.target.value }))}
                    className="w-full border border-[#2a3830] rounded-lg px-3 py-2 text-sm bg-[#1e2d27] text-[#dce8e1] focus:outline-none focus:ring-1 focus:ring-[#5cc987]/20">
                    {CERT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                ) : certStatusLabel ? (
                  <p className="text-sm text-[#b8d4c4]">{certStatusLabel}</p>
                ) : (
                  <p className="text-xs text-[#3a5347] italic">—</p>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-[#243028] pt-5">
              <p className="text-xs font-semibold text-[#4d6b5a] uppercase tracking-wide mb-4">Liens</p>

              {/* Official URL */}
              <div className="mb-4">
                <label className="text-xs text-[#4d6b5a] block mb-1.5">Documentation officielle</label>
                {editing ? (
                  <input value={editMeta.official_url}
                    onChange={e => setEditMeta(m => ({ ...m, official_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full border border-[#2a3830] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#5cc987]/20 bg-[#1e2d27] text-[#dce8e1] placeholder:text-[#3a5347]" />
                ) : officialUrl ? (
                  <a href={officialUrl.startsWith('http') ? officialUrl : `https://${officialUrl}`}
                    target="_blank"
                    className="flex items-center gap-1.5 text-sm text-[#5cc987] hover:underline truncate">
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{officialUrl.replace(/^https?:\/\//, '')}</span>
                  </a>
                ) : (
                  <p className="text-xs text-[#3a5347] italic">—</p>
                )}
              </div>

              {/* Sandbox URL */}
              <div>
                <label className="text-xs text-[#4d6b5a] block mb-1.5">Sandbox / Lab</label>
                {editing ? (
                  <input value={editMeta.sandbox_url}
                    onChange={e => setEditMeta(m => ({ ...m, sandbox_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full border border-[#2a3830] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#5cc987]/20 bg-[#1e2d27] text-[#dce8e1] placeholder:text-[#3a5347]" />
                ) : sandboxUrl ? (
                  <a href={sandboxUrl.startsWith('http') ? sandboxUrl : `https://${sandboxUrl}`}
                    target="_blank"
                    className="flex items-center gap-1.5 text-sm text-[#5cc987] hover:underline truncate">
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{sandboxUrl.replace(/^https?:\/\//, '')}</span>
                  </a>
                ) : (
                  <p className="text-xs text-[#3a5347] italic">—</p>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
