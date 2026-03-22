"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  Folder,
  SavedArticle,
  Notebook,
  VaultFile,
  getStoredFolders,
  saveStoredFolders,
} from "./libraryStore";

interface LibraryContextType {
  folders: Folder[];
  activeFolderId: string | null;
  setActiveFolderId: (id: string | null) => void;
  addFolder: (name: string) => void;
  renameAFolder: (id: string, name: string) => void;
  deleteAFolder: (id: string) => void;
  removeArticle: (folderId: string, articleId: string) => void;
  saveArticle: (folderId: string, article: Omit<SavedArticle, "savedAt">) => void;
  addNotebook: (folderId: string, name: string) => string;
  editNotebook: (folderId: string, notebookId: string, updates: Partial<Notebook>) => void;
  removeNotebook: (folderId: string, notebookId: string) => void;
  addToVault: (folderId: string, item: Omit<VaultFile, "addedAt">) => void;
  removeFromVault: (folderId: string, itemId: string) => void;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    const stored = getStoredFolders();
    if (stored && stored.length > 0) {
      setFolders(stored);
      setActiveFolderId(stored[0].id);
    }
  }, []);

  // Save on change
  useEffect(() => {
    if (folders.length > 0) {
      saveStoredFolders(folders);
    }
  }, [folders]);

  const addFolder = (name: string) => {
    const newFolder: Folder = {
      id: `folder_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name,
      articles: [],
      notebooks: [],
      vault: [],
      createdAt: Date.now(),
    };
    setFolders((prev) => [...prev, newFolder]);
    setActiveFolderId(newFolder.id);
  };

  const renameAFolder = (id: string, name: string) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name } : f))
    );
  };

  const deleteAFolder = (id: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== id));
    if (activeFolderId === id) {
      setActiveFolderId(null);
    }
  };

  const removeArticle = (folderId: string, articleId: string) => {
    setFolders((prev) =>
      prev.map((f) =>
        f.id === folderId
          ? { ...f, articles: f.articles.filter((a) => a.id !== articleId) }
          : f
      )
    );
  };

  const saveArticle = (folderId: string, article: Omit<SavedArticle, "savedAt">) => {
    setFolders((prev) =>
      prev.map((f) =>
        f.id === folderId
          ? {
              ...f,
              articles: [
                ...f.articles,
                { ...article, savedAt: Date.now() },
              ],
            }
          : f
      )
    );
  };

  const addNotebook = (folderId: string, name: string) => {
    const id = `nb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const newNotebook: Notebook = {
      id,
      name,
      content: "",
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };
    setFolders((prev) =>
      prev.map((f) =>
        f.id === folderId
          ? { ...f, notebooks: [newNotebook, ...f.notebooks] }
          : f
      )
    );
    return id;
  };

  const editNotebook = (folderId: string, notebookId: string, updates: Partial<Notebook>) => {
    setFolders((prev) =>
      prev.map((f) =>
        f.id === folderId
          ? {
              ...f,
              notebooks: f.notebooks.map((nb) =>
                nb.id === notebookId ? { ...nb, ...updates, updatedAt: Date.now() } : nb
              ),
            }
          : f
      )
    );
  };

  const removeNotebook = (folderId: string, notebookId: string) => {
    setFolders((prev) =>
      prev.map((f) =>
        f.id === folderId
          ? { ...f, notebooks: f.notebooks.filter((nb) => nb.id !== notebookId) }
          : f
      )
    );
  };

  const addToVault = (folderId: string, item: Omit<VaultFile, "addedAt">) => {
    setFolders((prev) =>
      prev.map((f) =>
        f.id === folderId
          ? {
              ...f,
              vault: [...(f.vault || []), { ...item, addedAt: Date.now() }],
            }
          : f
      )
    );
  };

  const removeFromVault = (folderId: string, itemId: string) => {
    setFolders((prev) =>
      prev.map((f) =>
        f.id === folderId
          ? { ...f, vault: (f.vault || []).filter((v) => v.id !== itemId) }
          : f
      )
    );
  };

  return (
    <LibraryContext.Provider
      value={{
        folders,
        activeFolderId,
        setActiveFolderId,
        addFolder,
        renameAFolder,
        deleteAFolder,
        removeArticle,
        saveArticle,
        addNotebook,
        editNotebook,
        removeNotebook,
        addToVault,
        removeFromVault,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (context === undefined) {
    throw new Error("useLibrary must be used within a LibraryProvider");
  }
  return context;
}
