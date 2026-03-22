// writer.types.ts — Shared TypeScript interfaces for the Writer module

export interface VaultSource {
  id: string;
  title: string;
  authors: string[];
  year: string | number;
  journal?: string;
  publisher?: string;
  abstract?: string;
  doi?: string;
  url?: string;
  addedAt?: string;
}

export interface Notebook {
  id: string;
  name: string;
  content: string;
  citationFormat: CitationFormat;
  citedSourceIds: string[];
  updatedAt: number;
  createdAt: string;
  wordCount: number;
}

export interface LibraryFolder {
  id: string;
  name: string;
  notebooks: Notebook[];
  vault: VaultSource[];
  vaultDocuments?: VaultDocSnapshot[];
  createdAt: string;
}

export interface VaultDocSnapshot {
  notebookId: string;
  name: string;
  content: string;
  savedAt: string;
}

export type CitationFormat = 'APA' | 'MLA' | 'Chicago';

export interface CopilotMessage {
  role: 'user' | 'assistant';
  content: string;
  documentEdit?: string | null;
  inlineCitation?: string | null;
  isError?: boolean;
  timestamp: number;
}

export interface WriterSettings {
  groqApiKey: string;
  lastOpenedNotebookId?: string;
}
