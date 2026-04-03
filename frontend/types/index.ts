export interface Domain {
  id: string
  slug: string
  label: string
  icon: string
  health_score: number
  created_at: string
}

export interface Entity {
  id: string
  domain_id: string
  name: string
  type: string
  metadata_: Record<string, unknown> | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type DocumentStatus = 'valid' | 'expired' | 'pending' | 'archived'

export interface Document {
  id: string
  entity_id: string
  filename: string
  mime_type: string | null
  doc_type: string | null
  status: DocumentStatus
  expires_at: string | null
  ai_extracted_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface Access {
  id: string
  entity_id: string
  label: string
  url: string | null
  account_ref: string | null
  username: string | null
  notes: string | null
  created_at: string
}

export type ReminderType = 'expiry' | 'deadline' | 'renewal' | 'custom'
export type ReminderStatus = 'pending' | 'sent' | 'dismissed'

export interface Reminder {
  id: string
  entity_id: string
  document_id: string | null
  title: string
  trigger_date: string
  type: ReminderType
  status: ReminderStatus
  recurrence: string | null
  created_at: string
}

export interface AttentionItem {
  type: 'document' | 'reminder'
  id: string
  title: string
  domain_slug: string
  expires_at?: string
  trigger_date?: string
  status?: string
  reminder_type?: string
  urgency: 'overdue' | 'soon' | 'upcoming'
}

export interface DomainHealth {
  slug: string
  label: string
  icon: string
  health_score: number
  entity_count: number
  expired_docs: number
  expiring_soon: number
  pending_reminders: number
}

export interface DashboardData {
  attention_required: AttentionItem[]
  upcoming_30_days: AttentionItem[]
  domains_health: DomainHealth[]
  total_entities: number
  total_documents: number
  expired_count: number
}

export interface CaptureResult {
  suggested_domain: string
  suggested_entity_type: string
  suggested_name: string
  extracted_data: Record<string, unknown>
  expires_at: string | null
  confidence: number
  entity_id?: string
  document_id?: string
}
