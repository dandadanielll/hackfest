// lib/writerStorage.ts
// NOTE: This now reads/writes from the SAME key as libraryStore (dunong_library_v2)
// so Library and Writer share one unified data store.

import type { Folder, Notebook, getStoredFolders, saveStoredFolders } from './libraryStore';
import type { VaultSource, CitationFormat, Author } from './writer.types';

const STORAGE_KEY = 'dunong_library_v2';

// ─── Low-level helpers ────────────────────────────────────────────────────────

function readFolders(): Folder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeFolders(folders: Folder[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
}

// ─── Folder Operations ────────────────────────────────────────────────────────

export function getFolders(): Folder[] {
  return readFolders();
}

export function getFolderById(folderId: string): Folder | null {
  return readFolders().find((f) => f.id === folderId) ?? null;
}

// ─── Notebook Operations ──────────────────────────────────────────────────────

export function getNotebookById(notebookId: string): { notebook: Notebook; folder: Folder } | null {
  const folders = readFolders();
  for (const folder of folders) {
    const nb = folder.notebooks.find((n) => n.id === notebookId);
    if (nb) return { notebook: nb, folder };
  }
  return null;
}

export function saveNotebook(notebookId: string, updates: Partial<Notebook>): Notebook | null {
  const folders = readFolders();
  for (const folder of folders) {
    const idx = folder.notebooks.findIndex((n) => n.id === notebookId);
    if (idx !== -1) {
      folder.notebooks[idx] = {
        ...folder.notebooks[idx],
        ...updates,
        updatedAt: Date.now(),
      };
      writeFolders(folders);
      return folder.notebooks[idx];
    }
  }
  return null;
}

export function renameNotebook(notebookId: string, newName: string): void {
  saveNotebook(notebookId, { name: newName.trim() });
}

export function deleteNotebook(notebookId: string): boolean {
  const folders = readFolders();
  for (const folder of folders) {
    const idx = folder.notebooks.findIndex((n) => n.id === notebookId);
    if (idx !== -1) {
      folder.notebooks.splice(idx, 1);
      writeFolders(folders);
      return true;
    }
  }
  return false;
}

// ─── Vault Operations ─────────────────────────────────────────────────────────

// Helper to ensure authors is always an array of Author objects
function ensureAuthors(authors: any): Author[] {
  if (Array.isArray(authors)) {
    return authors.map((a: any) => {
      if (typeof a === 'object' && a !== null) return a;
      const parts = String(a).split(/\s+/);
      if (parts.length === 1) return { firstName: "", lastName: parts[0] };
      return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
    });
  }
  if (!authors) return [{ firstName: "", lastName: "Unknown" }];
  const parts = String(authors).split(/\s+/);
  if (parts.length === 1) return { firstName: "", lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

/**
 * Returns vault sources for a folder, resolving linked articles + notebooks
 * into a VaultSource shape that the Copilot API understands.
 */
export function getVaultSources(folderId: string): VaultSource[] {
  const folder = getFolderById(folderId);
  if (!folder) return [];

  const sources: VaultSource[] = [];

  // 1. Add all direct articles in the folder
  for (const article of folder.articles ?? []) {
    sources.push({
      id: article.id,
      title: article.title,
      authors: ensureAuthors(article.authors),
      year: article.year,
      journal: article.journal,
      abstract: article.abstract,
      url: article.url,
      addedAt: new Date(article.savedAt ?? Date.now()).toISOString(),
    });
  }

  // 2. Add vault items (notebooks, uploaded files, and linked articles from OTHER folders if any)
  for (const vf of folder.vault ?? []) {
    if (vf.type === 'article' && vf.linkedArticleId && vf.linkedFolderId && vf.linkedFolderId !== folderId) {
      // Resolve linked article from another folder
      const linkedFolder = getFolderById(vf.linkedFolderId);
      const article = linkedFolder?.articles.find((a) => a.id === vf.linkedArticleId);
      if (article) {
        sources.push({
          id: article.id,
          title: article.title,
          authors: ensureAuthors(article.authors),
          year: article.year,
          journal: article.journal,
          abstract: article.abstract,
          url: article.url,
          addedAt: new Date(vf.addedAt ?? Date.now()).toISOString(),
        });
      }
    } else if (vf.type === 'notebook' && vf.linkedNotebookId && vf.linkedFolderId) {
      // Resolve linked notebook
      const linkedFolder = getFolderById(vf.linkedFolderId);
      const nb = linkedFolder?.notebooks.find((n) => n.id === vf.linkedNotebookId);
      if (nb) {
        // Strip HTML tags for plain text content
        const plainContent = nb.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        sources.push({
          id: nb.id,
          title: nb.name,
          authors: [{ firstName: '(Notebook)', lastName: '' }],
          year: new Date(nb.updatedAt).getFullYear().toString(),
          abstract: plainContent.slice(0, 500),
          addedAt: new Date(nb.updatedAt).toISOString(),
        });
      }
    } else if (vf.dataUrl) {
      // Uploaded file — use name as title, no full content extraction here
      sources.push({
        id: vf.id,
        title: vf.name,
        authors: [{ firstName: '(Uploaded file)', lastName: '' }],
        year: new Date(vf.addedAt ?? Date.now()).getFullYear().toString(),
        abstract: `Uploaded file: ${vf.name} (${vf.type})`,
        addedAt: new Date(vf.addedAt ?? Date.now()).toISOString(),
      });
    }
  }

  return sources;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function countWords(html: string): number {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return 0;
  return text.split(' ').filter((w) => w.length > 0).length;
}

export function formatLastSaved(ts: number | string): string {
  if (!ts) return 'Not saved';
  const date = typeof ts === 'number' ? new Date(ts) : new Date(ts);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 10) return 'Saved just now';
  if (diffSec < 60) return `Saved ${diffSec}s ago`;
  if (diffSec < 3600) return `Saved ${Math.floor(diffSec / 60)}m ago`;
  return `Saved at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export function formatDate(ts: number | string): string {
  if (!ts) return '';
  const date = typeof ts === 'number' ? new Date(ts) : new Date(ts);
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}
