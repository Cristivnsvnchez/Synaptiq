import axios from 'axios'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Domains
export const getDomains = () => api.get('/domains/').then(r => r.data)
export const getDomain = (slug: string) => api.get(`/domains/${slug}`).then(r => r.data)

// Dashboard
export const getDashboard = () => api.get('/dashboard/').then(r => r.data)

// Entities
export const getEntities = (domain_id?: string) =>
  api.get('/entities/', { params: domain_id ? { domain_id } : {} }).then(r => r.data)
export const getEntity = (id: string) => api.get(`/entities/${id}`).then(r => r.data)
export const createEntity = (data: { domain_id: string; name: string; type: string; notes?: string }) =>
  api.post('/entities/', data).then(r => r.data)
export const deleteEntity = (id: string) => api.delete(`/entities/${id}`)

// Documents
export const getDocuments = (entity_id?: string) =>
  api.get('/documents/', { params: entity_id ? { entity_id } : {} }).then(r => r.data)
export const getExpiringDocuments = (days = 30) =>
  api.get('/documents/expiring', { params: { days } }).then(r => r.data)
export const updateDocumentStatus = (id: string, status: string) =>
  api.patch(`/documents/${id}/status`, { status }).then(r => r.data)
export const getDocumentDownloadUrl = (id: string) =>
  `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/documents/${id}/download`

export const uploadDocument = (formData: FormData) =>
  api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)

// Accesses
export const getAccesses = (entity_id: string) =>
  api.get('/accesses/', { params: { entity_id } }).then(r => r.data)
export const createAccess = (data: object) => api.post('/accesses/', data).then(r => r.data)
export const deleteAccess = (id: string) => api.delete(`/accesses/${id}`)

// Reminders
export const getReminders = (status?: string) =>
  api.get('/reminders/', { params: status ? { status } : {} }).then(r => r.data)
export const dismissReminder = (id: string) =>
  api.patch(`/reminders/${id}/dismiss`).then(r => r.data)

// AI Capture
export const captureFile = (formData: FormData) =>
  api.post('/capture/file', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
export const captureUrl = (url: string, auto_create = false) => {
  const formData = new FormData()
  formData.append('url', url)
  formData.append('auto_create', String(auto_create))
  return api.post('/capture/url', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}
