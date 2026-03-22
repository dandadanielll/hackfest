// lib/libraryStore.ts

export type Author = {
  firstName: string;
  middleName?: string;
  lastName: string;
};

export type SavedArticle = {
  id: string;
  title: string;
  authors: Author[];
  year: string;
  month?: string;
  day?: string;
  journal: string;
  credibility: number;
  abstract: string;
  keywords: string[];
  localSource: boolean;
  url: string;
  savedAt: number;
  openAccess?: boolean;
};

export type Notebook = {
  id: string;
  name: string;
  content: string;
  updatedAt: number;
  createdAt: number;
  // Writer-extended fields
  wordCount?: number;
  citationFormat?: 'APA' | 'MLA' | 'Chicago';
  citedSourceIds?: string[];
};

export type VaultFile = {
  id: string;
  name: string;
  type: string | "article" | "notebook";
  size?: number;
  dataUrl?: string;
  linkedArticleId?: string;
  linkedNotebookId?: string;
  linkedFolderId?: string;
  addedAt: number;
};

export type Folder = {
  id: string;
  name: string;
  articles: SavedArticle[];
  notebooks: Notebook[];
  vault: VaultFile[];
  createdAt: number;
};

const STORAGE_KEY = 'dunong_library_v2';

export function getStoredFolders(): Folder[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredFolders(folders: Folder[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
}
