'use client'
import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { captureFile, captureUrl } from '@/lib/api'
import { CaptureResult } from '@/types'
import { Upload, Link, Sparkles, Loader2, CheckCircle, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const DOMAIN_LABELS: Record<string, string> = {
  identity: '🪪 Identité', housing: '🏠 Logement', finance: '💶 Finance',
  work: '💼 Travail', health: '🏥 Santé', learning: '📚 Learning',
  vehicle: '🚗 Véhicule', travel: '✈️ Voyage', subscriptions: '📦 Abonnements',
  contacts: '👥 Contacts', projects: '🚀 Projets',
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 70 ? 'bg-green-400' : pct >= 40 ? 'bg-orange-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className={cn('h-1.5 rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-500">{pct}%</span>
    </div>
  )
}

export default function CapturePage() {
  const [mode, setMode] = useState<'file' | 'url'>('file')
  const [url, setUrl] = useState('')
  const [autoCreate, setAutoCreate] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [result, setResult] = useState<CaptureResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const capture = useMutation({
    mutationFn: async (payload: { file?: File; url?: string }) => {
      if (payload.file) {
        const fd = new FormData()
        fd.append('file', payload.file)
        fd.append('auto_create', String(autoCreate))
        return captureFile(fd)
      } else {
        return captureUrl(payload.url!, autoCreate)
      }
    },
    onSuccess: (data) => {
      setResult(data)
      if (autoCreate) {
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        queryClient.invalidateQueries({ queryKey: ['entities'] })
      }
    },
  })

  function handleFile(file: File) {
    setResult(null)
    capture.mutate({ file })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-[#5b4fcf]" />
          <h1 className="text-2xl font-bold text-gray-900">AI Capture</h1>
        </div>
        <p className="text-gray-400 text-sm">
          Donne un fichier ou une URL — Claude extrait, structure, et route automatiquement vers le bon domaine.
        </p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {(['file', 'url'] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              mode === m ? 'bg-white text-[#5b4fcf] shadow-sm' : 'text-gray-400 hover:text-gray-600'
            )}>
            {m === 'file' ? '📄 Fichier' : '🔗 URL'}
          </button>
        ))}
      </div>

      {/* File drop zone */}
      {mode === 'file' && (
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all',
            dragOver
              ? 'border-[#5b4fcf] bg-[#faf9ff]'
              : 'border-[#5b4fcf]/30 hover:border-[#5b4fcf]/60 hover:bg-[#faf9ff]'
          )}>
          <input ref={fileRef} type="file" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          {capture.isPending
            ? <Loader2 className="w-10 h-10 animate-spin text-[#5b4fcf] mx-auto" />
            : <>
              <div className="w-14 h-14 rounded-2xl bg-[#ede9fe] flex items-center justify-center mx-auto mb-4">
                <Upload className="w-7 h-7 text-[#5b4fcf]" />
              </div>
              <p className="text-gray-600 font-medium">Glisser un fichier ici</p>
              <p className="text-gray-400 text-sm mt-1">ou cliquer pour choisir</p>
              <p className="text-gray-300 text-xs mt-3">PDF, images, documents...</p>
            </>}
        </div>
      )}

      {/* URL input */}
      {mode === 'url' && (
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1 flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-[#5b4fcf]/30 bg-white">
              <Link className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                placeholder="https://..."
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && url && capture.mutate({ url })}
                className="flex-1 text-sm focus:outline-none"
              />
            </div>
            <button
              onClick={() => url && capture.mutate({ url })}
              disabled={!url || capture.isPending}
              className="bg-[#5b4fcf] text-white px-5 py-3 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center gap-2 hover:bg-[#4c3fbd] transition-colors">
              {capture.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Analyser</>}
            </button>
          </div>
        </div>
      )}

      {/* Auto-create toggle */}
      <label className="flex items-center gap-3 mt-5 cursor-pointer">
        <div
          onClick={() => setAutoCreate(a => !a)}
          className={cn(
            'w-10 h-5 rounded-full transition-colors relative',
            autoCreate ? 'bg-[#5b4fcf]' : 'bg-gray-200'
          )}>
          <div className={cn(
            'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
            autoCreate ? 'translate-x-5' : 'translate-x-0.5'
          )} />
        </div>
        <span className="text-sm text-gray-600">
          Créer automatiquement l'entité dans le bon domaine
        </span>
      </label>

      {/* Error */}
      {capture.isError && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm space-y-1">
          <p className="font-semibold">Erreur lors de l'analyse</p>
          <p className="text-red-500">
            {(capture.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
              || (capture.error as Error)?.message
              || 'Vérifie que l\'API tourne et que ta clé Anthropic est configurée.'}
          </p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-5">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <h3 className="font-semibold text-gray-800">Résultat de l'analyse</h3>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="bg-[#faf9ff] rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Domaine détecté</p>
              <p className="font-semibold text-[#5b4fcf]">
                {DOMAIN_LABELS[result.suggested_domain] || result.suggested_domain}
              </p>
            </div>
            <div className="bg-[#faf9ff] rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Type d'entité</p>
              <p className="font-semibold text-gray-700">{result.suggested_entity_type.replace(/_/g, ' ')}</p>
            </div>
            <div className="bg-[#faf9ff] rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Nom suggéré</p>
              <p className="font-semibold text-gray-700">{result.suggested_name}</p>
            </div>
            {result.expires_at && (
              <div className="bg-orange-50 rounded-xl p-4">
                <p className="text-xs text-orange-400 mb-1">Date d'expiration</p>
                <p className="font-semibold text-orange-700">
                  {new Date(result.expires_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
            )}
          </div>

          <div className="mb-5">
            <p className="text-xs text-gray-400 mb-2">Confiance du modèle</p>
            <ConfidenceBar value={result.confidence} />
          </div>

          {Object.keys(result.extracted_data).length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2">Données extraites</p>
              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                {Object.entries(result.extracted_data).map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-sm">
                    <span className="text-gray-400 shrink-0 capitalize">{k.replace(/_/g, ' ')} :</span>
                    <span className="text-gray-700 font-medium">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.notes && (
            <div className="mt-4">
              <p className="text-xs text-gray-400 mb-2">Contenu wiki généré</p>
              <div className="bg-[#faf9ff] border border-[#5b4fcf]/10 rounded-xl p-3 max-h-40 overflow-y-auto">
                <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">{result.notes}</pre>
              </div>
            </div>
          )}

          {result.entity_id && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <p className="text-sm text-green-600 font-medium">✓ Entité créée automatiquement</p>
                <a href={result.suggested_domain === 'learning'
                    ? `/learning/${result.entity_id}`
                    : `/${result.suggested_domain}/${result.entity_id}`}
                  className="flex items-center gap-1 text-sm text-[#5b4fcf] hover:underline font-medium">
                  Voir l'entité <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
