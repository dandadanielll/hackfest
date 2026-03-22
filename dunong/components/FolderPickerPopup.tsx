"use client";

import { X, FolderOpen, Check, Plus, Loader2 } from "lucide-react";
import { useState } from "react";
import { useLibrary } from "@/lib/libraryContext";

interface FolderPickerPopupProps {
  articleTitle: string;
  savedFolderIds: string[];
  onPick: (folderId: string) => void;
  onClose: () => void;
}

export default function FolderPickerPopup({
  articleTitle,
  savedFolderIds,
  onPick,
  onClose,
}: FolderPickerPopupProps) {
  const { folders, addFolder } = useLibrary();
  const [showCreate, setShowCreate] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newId = addFolder(newFolderName.trim());
    onPick(newId);
    setNewFolderName("");
    setShowCreate(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-stone-100 bg-stone-50/50">
          <div className="flex items-center justify-between mb-1">
            <p className="font-bold text-stone-900 text-lg">Save to Library</p>
            <button 
              onClick={onClose} 
              className="p-2 -mr-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <p className="text-stone-500 text-sm truncate font-medium">{articleTitle}</p>
        </div>

        <div className="p-2 max-h-[60vh] overflow-y-auto">
          {folders.length === 0 && !showCreate && (
            <div className="py-8 px-4 text-center">
              <FolderOpen size={32} className="mx-auto text-stone-300 mb-3" />
              <p className="text-sm text-stone-500 font-medium">No folders yet.</p>
            </div>
          )}

          <div className="flex flex-col gap-1">
            {folders.map((f) => {
              const isSaved = savedFolderIds.includes(f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => onPick(f.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left ${
                    isSaved
                      ? "bg-amber-50 text-amber-900 border border-amber-200"
                      : "hover:bg-stone-100 text-stone-700 border border-transparent"
                  }`}
                >
                  <div className={`p-2 rounded-lg ${isSaved ? "bg-amber-200 text-amber-700" : "bg-stone-200 text-stone-500"}`}>
                    <FolderOpen size={16} />
                  </div>
                  <span className="flex-1 truncate">{f.name}</span>
                  {isSaved && (
                    <div className="bg-emerald-500 text-white p-0.5 rounded-full">
                        <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 bg-stone-50 border-t border-stone-100">
          {showCreate ? (
            <div className="flex flex-col gap-3 animate-in slide-in-from-bottom-2 duration-200">
              <input
                autoFocus
                type="text"
                placeholder="Folder name..."
                className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none font-bold"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2 text-xs font-bold text-stone-500 hover:text-stone-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim()}
                  className="flex-[2] py-2 bg-rose-900 text-white rounded-xl text-xs font-bold hover:bg-rose-800 transition disabled:opacity-50 shadow-sm"
                >
                  Create & Save
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full py-3 flex items-center justify-center gap-2 text-sm font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-2xl transition-colors border border-amber-200"
            >
              <Plus size={18} />
              Create New Folder
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
