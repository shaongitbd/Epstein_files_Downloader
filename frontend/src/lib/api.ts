const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export interface Image {
  id: number;
  document_id: string;
  page: number;
  filename: string;
  cdn_url: string;
  width: number;
  height: number;
  size_bytes: number;
  format: string;
  exif?: Record<string, unknown>;
  has_gps: boolean;
  date_taken?: string;
  page_text?: string;
  created_at: string;
  document?: Document;
}

export interface Document {
  id: string;
  filename: string;
  page_count: number;
  created_at: string;
  images?: Image[];
}

export interface Stats {
  total_documents: number;
  total_images: number;
  images_with_gps: number;
  images_with_date: number;
  total_size_bytes: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  next_cursor?: string;
  has_more: boolean;
  total: number;
}

export interface SearchResult {
  documents: Document[];
  images: Image[];
  query: string;
  total: number;
}

export interface ImageFilters {
  has_gps?: boolean;
  has_date?: boolean;
  has_text?: boolean;
  document_id?: string;
}

// API Functions
export async function getImages(
  cursor?: string,
  limit = 50,
  filters: ImageFilters = {}
): Promise<PaginatedResponse<Image>> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  params.set('limit', limit.toString());
  if (filters.has_gps) params.set('has_gps', 'true');
  if (filters.has_date) params.set('has_date', 'true');
  if (filters.has_text) params.set('has_text', 'true');
  if (filters.document_id) params.set('document_id', filters.document_id);

  const res = await fetch(`${API_BASE}/images?${params}`);
  if (!res.ok) throw new Error('Failed to fetch images');
  return res.json();
}

export async function getImageById(id: number): Promise<Image> {
  const res = await fetch(`${API_BASE}/images/${id}`);
  if (!res.ok) throw new Error('Failed to fetch image');
  return res.json();
}

export async function getDocuments(
  cursor?: string,
  limit = 50
): Promise<PaginatedResponse<Document>> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  params.set('limit', limit.toString());

  const res = await fetch(`${API_BASE}/documents?${params}`);
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}

export async function getDocumentById(id: string): Promise<Document> {
  const res = await fetch(`${API_BASE}/documents/${id}`);
  if (!res.ok) throw new Error('Failed to fetch document');
  return res.json();
}

export async function search(query: string, limit = 50): Promise<SearchResult> {
  const params = new URLSearchParams();
  params.set('q', query);
  params.set('limit', limit.toString());

  const res = await fetch(`${API_BASE}/search?${params}`);
  if (!res.ok) throw new Error('Failed to search');
  return res.json();
}

export async function getStats(): Promise<Stats> {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

// Utility functions
export function formatFileSize(bytes: number): string {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(1)} ${units[i]}`;
}

export function formatNumber(num: number): string {
  return num?.toLocaleString() || '0';
}
