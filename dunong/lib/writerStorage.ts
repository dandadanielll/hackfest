// lib/writerStorage.ts
import type { LibraryFolder, Notebook, VaultSource, WriterSettings, CitationFormat } from './writer.types';

const KEYS = {
  FOLDERS: 'dunong_library_folders',
  SETTINGS: 'dunong_writer_settings',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readFolders(): LibraryFolder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEYS.FOLDERS);
    if (!raw) return defaultFolders();
    return JSON.parse(raw) as LibraryFolder[];
  } catch {
    return defaultFolders();
  }
}

function writeFolders(folders: LibraryFolder[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEYS.FOLDERS, JSON.stringify(folders));
}

function defaultFolders(): LibraryFolder[] {
  const folder: LibraryFolder = {
    id: 'unsorted',
    name: 'Unsorted',
    notebooks: [],
    vault: [],
    createdAt: new Date().toISOString(),
  };
  writeFolders([folder]);
  return [folder];
}

// ─── Folder Operations ────────────────────────────────────────────────────────

export function getFolders(): LibraryFolder[] {
  return readFolders();
}

export function getFolderById(folderId: string): LibraryFolder | null {
  return readFolders().find((f) => f.id === folderId) ?? null;
}

export function createFolder(name: string): LibraryFolder {
  const folders = readFolders();
  const newFolder: LibraryFolder = {
    id: `folder_${Date.now()}`,
    name: name.trim(),
    notebooks: [],
    vault: [],
    createdAt: new Date().toISOString(),
  };
  writeFolders([...folders, newFolder]);
  return newFolder;
}

export function renameFolder(folderId: string, newName: string): void {
  const folders = readFolders();
  const idx = folders.findIndex((f) => f.id === folderId);
  if (idx !== -1) {
    folders[idx].name = newName.trim();
    writeFolders(folders);
  }
}

export function deleteFolder(folderId: string): void {
  const folders = readFolders().filter((f) => f.id !== folderId);
  writeFolders(folders);
}

// ─── Notebook Operations ──────────────────────────────────────────────────────

export function createNotebook(
  folderId: string,
  name = 'Untitled Document'
): { notebook: Notebook; folder: LibraryFolder } | null {
  const folders = readFolders();
  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return null;

  const notebook: Notebook = {
    id: `nb_${Date.now()}`,
    name: name.trim(),
    content: '',
    citationFormat: 'APA',
    citedSourceIds: [],
    lastSaved: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    wordCount: 0,
  };

  folder.notebooks.unshift(notebook); // newest first
  writeFolders(folders);
  return { notebook, folder };
}

export function getNotebookById(
  notebookId: string
): { notebook: Notebook; folder: LibraryFolder } | null {
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
        lastSaved: new Date().toISOString(),
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

export function getVaultSources(folderId: string): VaultSource[] {
  return getFolderById(folderId)?.vault ?? [];
}

export function addSourceToVault(folderId: string, source: VaultSource): boolean {
  const folders = readFolders();
  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return false;
  if (!folder.vault) folder.vault = [];

  const exists = folder.vault.some(
    (s) => (s.doi && s.doi === source.doi) || s.title === source.title
  );
  if (!exists) {
    folder.vault.push({ ...source, addedAt: new Date().toISOString() });
    writeFolders(folders);
  }
  return true;
}

export function saveDocumentToVault(folderId: string, notebookId: string): boolean {
  const folders = readFolders();
  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return false;

  const notebook = folder.notebooks.find((n) => n.id === notebookId);
  if (!notebook) return false;

  if (!folder.vaultDocuments) folder.vaultDocuments = [];
  const existingIdx = folder.vaultDocuments.findIndex((d) => d.notebookId === notebookId);
  const snapshot = {
    notebookId,
    name: notebook.name,
    content: notebook.content,
    savedAt: new Date().toISOString(),
  };

  if (existingIdx !== -1) {
    folder.vaultDocuments[existingIdx] = snapshot;
  } else {
    folder.vaultDocuments.push(snapshot);
  }

  writeFolders(folders);
  return true;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function getWriterSettings(): WriterSettings {
  if (typeof window === 'undefined') return { groqApiKey: '' };
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    return raw ? JSON.parse(raw) : { groqApiKey: '' };
  } catch {
    return { groqApiKey: '' };
  }
}

export function saveWriterSettings(settings: Partial<WriterSettings>): void {
  if (typeof window === 'undefined') return;
  const current = getWriterSettings();
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify({ ...current, ...settings }));
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function countWords(html: string): number {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return 0;
  return text.split(' ').filter((w) => w.length > 0).length;
}

export function formatLastSaved(isoString: string): string {
  if (!isoString) return 'Not saved';
  const date = new Date(isoString);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 10) return 'Saved just now';
  if (diffSec < 60) return `Saved ${diffSec}s ago`;
  if (diffSec < 3600) return `Saved ${Math.floor(diffSec / 60)}m ago`;
  return `Saved at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export function formatDate(isoString: string): string {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
