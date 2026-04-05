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
  const color = pct >= 70 ? 'bg-[#5cc987]' : pct >= 40 ? 'bg-[#d4925a]' : 'bg-[#e05555]'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-[#243028] rounded-full h-1">
        <div className={cn('h-1 rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-[#6e9480]">{pct}%</span>
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

  function handleFile(file: File) { setResult(null); capture.mutate({ file }) }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files?.[0]; if (file) handleFile(file)
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-[#5cc987]" />
          <h1 className="text-xl font-semibold text-[#dce8e1]">AI Capture</h1>
        </div>
        <p className="text-[#4d6b5a] text-sm">
          Fichier ou URL — Claude extrait et route vers le bon domaine.
        </p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 bg-[#182421] rounded-xl p-1 mb-6 w-fit border border-[#243028]">
        {(['file', 'url'] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              mode === m
                ? 'bg-[#243028] text-[#dce8e1]'
                : 'text-[#4d6b5a] hover:text-[#8db89e]'
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
              ? 'border-[#5cc987] bg-[#5cc987]/5'
              : 'border-[#243028] hover:border-[#5cc987]/40 hover:bg-[#182421]'
          )}>
          <input ref={fileRef} type="file" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          {capture.isPending
            ? <Loader2 className="w-8 h-8 animate-spin text-[#5cc987] mx-auto" />
            : <>
              <div className="w-12 h-12 rounded-2xl bg-[#5cc987]/10 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-6 h-6 text-[#5cc987]" />
              </div>
              <p className="text-[#8db89e] font-medium text-sm">Glisser un fichier ici</p>
              <p className="text-[#4d6b5a] text-xs mt-1">ou cliquer pour choisir</p>
              <p className="text-[#3a5347] text-xs mt-2">PDF, images, documents...</p>
            </>}
        </div>
      )}

      {/* URL input */}
      {mode === 'url' && (
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 border border-[#243028] rounded-xl px-4 py-3 bg-[#182421] focus-within:border-[#5cc987]/40">
            <Link className="w-4 h-4 text-[#4d6b5a] shrink-0" />
            <input placeholder="https://..." value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && url && capture.mutate({ url })}
              className="flex-1 text-sm focus:outline-none bg-transparent text-[#dce8e1] placeholder:text-[#3a5347]" />
          </div>
          <button onClick={() => url && capture.mutate({ url })} disabled={!url || capture.isPending}
            className="bg-[#5cc987] text-[#0d1a13] px-5 py-3 rounded-xl text-sm font-semibold disabled:opacity-40 flex items-center gap-2 hover:bg-[#4db974] transition-colors">
            {capture.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Analyser</>}
          </button>
        </div>
      )}

      {/* Auto-create toggle */}
      <div className="flex items-center gap-3 mt-5 cursor-pointer" onClick={() => setAutoCreate(a => !a)}>
        <div className={cn('w-9 h-5 rounded-full transition-colors relative shrink-0', autoCreate ? 'bg-[#5cc987]' : 'bg-[#243028]')}>
          <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform', autoCreate ? 'translate-x-4' : 'translate-x-0.5')} />
        </div>
        <span className="text-sm text-[#6e9480]">Créer automatiquement dans le bon domaine</span>
      </div>

      {/* Error */}
      {capture.isError && (
        <div className="mt-6 bg-[#e05555]/10 border border-[#e05555]/20 rounded-2xl p-4 text-sm space-y-1">
          <p className="font-semibold text-[#e05555]">Erreur lors de l'analyse</p>
          <p className="text-[#e05555]/70">
            {(capture.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
              || (capture.error as Error)?.message
              || "Vérifie que l'API tourne et que ta clé Anthropic est configurée."}
          </p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-6 bg-[#182421] rounded-2xl border border-[#243028] p-5">
          <div className="flex items-center gap-2 mb-5">
            <CheckCircle className="w-4 h-4 text-[#5cc987]" />
            <h3 className="font-semibold text-[#dce8e1] text-sm">Résultat de l'analyse</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-[#111918] rounded-xl p-3 border border-[#243028]">
              <p className="text-xs text-[#4d6b5a] mb-1">Domaine détecté</p>
              <p className="font-semibold text-[#5cc987] text-sm">{DOMAIN_LABELS[result.suggested_domain] || result.suggested_domain}</p>
            </div>
            <div className="bg-[#111918] rounded-xl p-3 border border-[#243028]">
              <p className="text-xs text-[#4d6b5a] mb-1">Type d'entité</p>
              <p className="font-semibold text-[#b8d4c4] text-sm">{result.suggested_entity_type.replace(/_/g, ' ')}</p>
            </div>
            <div className="bg-[#111918] rounded-xl p-3 border border-[#243028]">
              <p className="text-xs text-[#4d6b5a] mb-1">Nom suggéré</p>
              <p className="font-semibold text-[#b8d4c4] text-sm">{result.suggested_name}</p>
            </div>
            {result.expires_at && (
              <div className="bg-[#d4925a]/5 rounded-xl p-3 border border-[#d4925a]/20">
                <p className="text-xs text-[#d4925a]/70 mb-1">Expiration</p>
                <p className="font-semibold text-[#d4925a] text-sm">{new Date(result.expires_at).toLocaleDateString('fr-FR')}</p>
              </div>
            )}
          </div>

          <div className="mb-4">
            <p className="text-xs text-[#4d6b5a] mb-2">Confiance</p>
            <ConfidenceBar value={result.confidence} />
          </div>

          {Object.keys(result.extracted_data).length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-[#4d6b5a] mb-2">Données extraites</p>
              <div className="bg-[#111918] rounded-xl p-3 space-y-1.5 border border-[#243028]">
                {Object.entries(result.extracted_data).map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-xs">
                    <span className="text-[#4d6b5a] shrink-0 capitalize">{k.replace(/_/g, ' ')} :</span>
                    <span className="text-[#8db89e] font-medium">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.notes && (
            <div className="mb-4">
              <p className="text-xs text-[#4d6b5a] mb-2">Contenu wiki généré</p>
              <div className="bg-[#111918] border border-[#5cc987]/10 rounded-xl p-3 max-h-36 overflow-y-auto">
                <pre className="text-xs text-[#6e9480] whitespace-pre-wrap font-sans leading-relaxed">{result.notes}</pre>
              </div>
            </div>
          )}

          {result.entity_id && (
            <div className="pt-4 border-t border-[#243028] flex items-center justify-between">
              <p className="text-sm text-[#5cc987] font-medium">✓ Entité créée</p>
              <a href={result.suggested_domain === 'learning'
                  ? `/learning/${result.entity_id}`
                  : `/${result.suggested_domain}/${result.entity_id}`}
                className="flex items-center gap-1 text-sm text-[#5cc987] hover:underline font-medium">
                Voir l'entité <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
