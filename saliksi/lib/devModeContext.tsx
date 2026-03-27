"use client";
import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";

export type LogEntry = {
  id: string;
  timestamp: Date;
  message: string;
  isStreaming?: boolean;
};

export type LogGroup = {
  id: string;
  route: string;
  source: string;
  title: string;
  timestamp: Date;
  logs: LogEntry[];
  traceOperation?: string;
  traceContext?: string;
};

interface DevModeContextType {
  isDevModeEnabled: boolean;
  setDevModeEnabled: (val: boolean) => void;
  isPaneExpanded: boolean;
  setPaneExpanded: (val: boolean) => void;
  groups: LogGroup[];
  startLogGroup: (route: string, title: string, source?: string) => string;
  addLog: (message: string, sourceOrGroupId?: string) => void;
  streamAITrace: (groupId: string, operation: string, context: string) => Promise<void>;
  clearLogs: (route?: string) => void;
}

const DevModeContext = createContext<DevModeContextType | undefined>(undefined);

export function DevModeProvider({ children }: { children: ReactNode }) {
  const [isDevModeEnabled, setDevModeEnabled] = useState(false);
  const [isPaneExpanded, setPaneExpanded] = useState(false);
  const [groups, setGroups] = useState<LogGroup[]>([]);

  const startLogGroup = useCallback((route: string, title: string, source: string = 'System') => {
    const groupId = Math.random().toString(36).substring(7);
    setGroups(prev => [...prev, {
      id: groupId,
      route,
      source,
      title,
      timestamp: new Date(),
      logs: []
    }]);
    return groupId;
  }, []);

  const addLog = useCallback((message: string, sourceOrGroupId: string = 'System') => {
    setGroups(prev => {
      const groupIndex = prev.findIndex(g => g.id === sourceOrGroupId);
      if (groupIndex !== -1) {
        const newGroups = [...prev];
        newGroups[groupIndex] = {
          ...newGroups[groupIndex],
          logs: [...newGroups[groupIndex].logs, { id: Math.random().toString(36).substring(7), timestamp: new Date(), message }]
        };
        return newGroups;
      }

      let fallbackIndex = -1;
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].source === sourceOrGroupId) {
          fallbackIndex = i;
          break;
        }
      }

      if (fallbackIndex !== -1) {
        const newGroups = [...prev];
        newGroups[fallbackIndex] = {
           ...newGroups[fallbackIndex],
           logs: [...newGroups[fallbackIndex].logs, { id: Math.random().toString(36).substring(7), timestamp: new Date(), message }]
        };
        return newGroups;
      }
      
      return [
        ...prev, 
        {
          id: Math.random().toString(36).substring(7),
          route: typeof window !== 'undefined' ? window.location.pathname : '/',
          source: sourceOrGroupId,
          title: "System Log",
          timestamp: new Date(),
          logs: [{ id: Math.random().toString(36).substring(7), timestamp: new Date(), message }]
        }
      ];
    });
  }, []);

  const streamAITrace = useCallback(async (groupId: string, operation: string, context: string) => {
    // Create a streaming log entry
    const logId = Math.random().toString(36).substring(7);
    
    setGroups(prev => {
      const gi = prev.findIndex(g => g.id === groupId);
      if (gi === -1) return prev;
      const newGroups = [...prev];
      newGroups[gi] = {
        ...newGroups[gi],
        traceOperation: operation,
        traceContext: context,
        logs: [...newGroups[gi].logs, { id: logId, timestamp: new Date(), message: "⟩ Initializing reasoning engine...", isStreaming: true }]
      };
      return newGroups;
    });

    try {
      const res = await fetch("/api/dev-trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation, context }),
      });

      if (!res.ok || !res.body) {
        // Fallback if streaming fails
        setGroups(prev => {
          const gi = prev.findIndex(g => g.id === groupId);
          if (gi === -1) return prev;
          const newGroups = [...prev];
          const logIdx = newGroups[gi].logs.findIndex(l => l.id === logId);
          if (logIdx !== -1) {
            const newLogs = [...newGroups[gi].logs];
            newLogs[logIdx] = { ...newLogs[logIdx], message: "⟩ [Trace engine unavailable]", isStreaming: false };
            newGroups[gi] = { ...newGroups[gi], logs: newLogs };
          }
          return newGroups;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value, { stream: true });
        accumulated += chunkText;

        // Update the log entry with accumulated text
        setGroups(prev => {
          const gi = prev.findIndex(g => g.id === groupId);
          if (gi === -1) return prev;
          const newGroups = [...prev];
          const logIdx = newGroups[gi].logs.findIndex(l => l.id === logId);
          if (logIdx !== -1) {
            const newLogs = [...newGroups[gi].logs];
            newLogs[logIdx] = { ...newLogs[logIdx], message: accumulated, isStreaming: true };
            newGroups[gi] = { ...newGroups[gi], logs: newLogs };
          }
          return newGroups;
        });

        // Artificial typing/thinking delays to make it look realistic
        if (chunkText.includes('>')) {
          await new Promise(r => setTimeout(r, 800)); // big pause before a new reasoning step
        } else if (chunkText.includes('.') || chunkText.includes('?') || chunkText.includes('!')) {
          await new Promise(r => setTimeout(r, 200)); // pause at sentences
        } else {
          await new Promise(r => setTimeout(r, 20)); // baseline token delay
        }
      }

      // Mark streaming as complete
      setGroups(prev => {
        const gi = prev.findIndex(g => g.id === groupId);
        if (gi === -1) return prev;
        const newGroups = [...prev];
        const logIdx = newGroups[gi].logs.findIndex(l => l.id === logId);
        if (logIdx !== -1) {
          const newLogs = [...newGroups[gi].logs];
          newLogs[logIdx] = { ...newLogs[logIdx], isStreaming: false };
          newGroups[gi] = { ...newGroups[gi], logs: newLogs };
        }
        return newGroups;
      });
    } catch (err) {
      console.error("AI trace stream error:", err);
      setGroups(prev => {
        const gi = prev.findIndex(g => g.id === groupId);
        if (gi === -1) return prev;
        const newGroups = [...prev];
        const logIdx = newGroups[gi].logs.findIndex(l => l.id === logId);
        if (logIdx !== -1) {
          const newLogs = [...newGroups[gi].logs];
          newLogs[logIdx] = { ...newLogs[logIdx], message: "⟩ [Trace connection interrupted]", isStreaming: false };
          newGroups[gi] = { ...newGroups[gi], logs: newLogs };
        }
        return newGroups;
      });
    }
  }, []);

  const clearLogs = useCallback((route?: string) => {
    if (route) {
      setGroups(prev => prev.filter(g => g.route !== route));
    } else {
      setGroups([]);
    }
  }, []);

  return (
    <DevModeContext.Provider value={{ isDevModeEnabled, setDevModeEnabled, isPaneExpanded, setPaneExpanded, groups, startLogGroup, addLog, streamAITrace, clearLogs }}>
      {children}
    </DevModeContext.Provider>
  );
}

export const useDevMode = () => {
  const ctx = useContext(DevModeContext);
  if (!ctx) throw new Error("useDevMode must be used within DevModeProvider");
  return ctx;
};
