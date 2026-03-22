export type Article = {
  id: string;
  title: string;
  authors: string;
  year: string;
  journal: string;
  credibility: number;
  abstract?: string;
  localSource?: boolean;
  openAccess?: boolean;
  url?: string;
  citations?: number;
};

export type Notebook = {
  id: string;
  name: string;
  content: string; // HTML for Tiptap
  lastSaved: number; // timestamp
  folderId: string;
};

export type Folder = {
  id: string;
  name: string;
  articles: Article[]; // Vault sources
};

const STORAGE_KEY = 'dunong_data';

type DunongData = {
  folders: Folder[];
  notebooks: Notebook[];
};

const defaultData: DunongData = {
  folders: [
    {
      id: 'thesis-ch-2',
      name: 'Thesis Chapter 2',
      articles: [
        {
          id: 'seed-1',
          title: "Stunting and cognitive development in Filipino children: A longitudinal study in rural Mindanao.",
          authors: "Santos, J., Dimaculangan, R., & Reyes, M.",
          year: "2022",
          journal: "Philippine Journal of Health Research",
          credibility: 94,
          abstract: "This study investigates the long-term cognitive impacts of early childhood stunting in rural Mindanao communities...",
          localSource: true,
          openAccess: true,
          url: "https://herdin.ph",
          citations: 124
        }
      ]
    }
  ],
  notebooks: []
};

function getRawData(): DunongData {
  if (typeof window === 'undefined') return defaultData;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
    return defaultData;
  }
  return JSON.parse(raw);
}

function saveRawData(data: DunongData) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getFolders(): Folder[] {
  return getRawData().folders;
}

export function getNotebooks(): Notebook[] {
  return getRawData().notebooks;
}

export function addFolder(name: string): Folder {
  const data = getRawData();
  const newFolder: Folder = {
    id: Math.random().toString(36).substr(2, 9),
    name,
    articles: []
  };
  data.folders.push(newFolder);
  saveRawData(data);
  return newFolder;
}

export function addNotebook(name: string, folderId: string): Notebook {
  const data = getRawData();
  const newNotebook: Notebook = {
    id: Math.random().toString(36).substr(2, 9),
    name,
    content: '',
    lastSaved: Date.now(),
    folderId
  };
  data.notebooks.push(newNotebook);
  saveRawData(data);
  return newNotebook;
}

export function updateNotebook(id: string, updates: Partial<Notebook>): Notebook | undefined {
  const data = getRawData();
  const index = data.notebooks.findIndex(nb => nb.id === id);
  if (index === -1) return undefined;
  
  data.notebooks[index] = { ...data.notebooks[index], ...updates, lastSaved: Date.now() };
  saveRawData(data);
  return data.notebooks[index];
}

export function addArticleToFolder(folderId: string, article: Article) {
  const data = getRawData();
  const folder = data.folders.find(f => f.id === folderId);
  if (folder && !folder.articles.some(a => a.id === article.id)) {
    folder.articles.push(article);
    saveRawData(data);
  }
}

export function getFolderWithArticles(folderId: string): Folder | undefined {
  return getRawData().folders.find(f => f.id === folderId);
}

export function getNotebookWithFolder(notebookId: string): { notebook: Notebook, folder: Folder } | undefined {
  const data = getRawData();
  const notebook = data.notebooks.find(nb => nb.id === notebookId);
  if (!notebook) return undefined;
  const folder = data.folders.find(f => f.id === notebook.folderId);
  if (!folder) return undefined;
  return { notebook, folder };
}
