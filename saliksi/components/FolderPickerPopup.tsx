"use client";

import { X, FolderOpen, Check, Plus, Loader2, FolderInput } from "lucide-react";
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-[#e8e4df] rounded-3xl shadow-2xl shadow-[#2b090d]/20 p-8 w-full max-w-md mx-4 border border-[#2b090d]/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-[#521118]/40 hover:text-[#521118] p-1 rounded-lg hover:bg-[#521118]/5 transition">
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className="bg-[#521118]/10 text-[#521118] p-3 rounded-2xl">
            <FolderInput size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-xl text-[#2b090d] font-serif tracking-tight truncate">Save to Library</h2>
            <p className="text-[#521118]/60 text-sm truncate">{articleTitle}</p>
          </div>
        </div>

        <div className="p-2 -mx-4 max-h-[40vh] overflow-y-auto custom-scrollbar mb-1">
          {folders.length === 0 && !showCreate && (
            <div className="py-8 px-4 text-center text-[#521118]/40">
              <FolderOpen size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-bold font-serif italic">Select a folder to save this article...</p>
            </div>
          )}

          <div className="flex flex-col gap-1.5 px-2">
            {folders.map((f) => {
              const isSaved = savedFolderIds.includes(f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => onPick(f.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left group ${
                    isSaved
                      ? "bg-[#521118] text-[#e8e4df] shadow-md shadow-[#521118]/20"
                      : "hover:bg-[#2b090d]/5 text-[#2b090d]/70"
                  }`}
                >
                  <div className={`p-2 rounded-lg transition-colors ${isSaved ? "bg-[#e8e4df]/20 text-[#e8e4df]" : "bg-[#2b090d]/5 text-[#521118]/40 group-hover:bg-[#521118]/10"}`}>
                    <FolderOpen size={16} />
                  </div>
                  <span className="flex-1 truncate">{f.name}</span>
                  {isSaved && (
                    <div className="bg-[#e8e4df] text-[#521118] p-0.5 rounded-full">
                        <Check size={12} strokeWidth={4} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-[#2b090d]/10 pt-6">
          {showCreate ? (
            <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-2 duration-200">
              <input
                autoFocus
                type="text"
                placeholder="Folder name..."
                className="w-full border-2 border-[#2b090d]/10 bg-white/50 focus:border-[#521118]/30 focus:bg-white focus:ring-4 focus:ring-[#521118]/10 rounded-2xl px-5 py-3 text-[#2b090d] font-semibold outline-none transition text-base placeholder:text-[#2b090d]/20"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 px-5 py-2.5 rounded-2xl font-bold text-[#521118]/60 bg-[#2b090d]/5 hover:bg-[#2b090d]/10 transition text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim()}
                  className="flex-[2] px-5 py-2.5 rounded-2xl font-bold text-[#f4f2f0] bg-[#521118] hover:bg-[#2b090d] transition text-sm disabled:opacity-50 shadow-lg shadow-[#2b090d]/20"
                >
                  Create & Save
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full py-3.5 flex items-center justify-center gap-2 text-sm font-bold text-[#521118] bg-[#2b090d]/5 hover:bg-[#2b090d]/10 hover:text-[#2b090d] rounded-2xl transition-all border border-[#2b090d]/5"
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
