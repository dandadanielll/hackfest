"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";

export type LogEntry = {
  id: string;
  timestamp: Date;
  message: string;
};

export type LogGroup = {
  id: string;
  route: string;
  source: string;
  title: string;
  timestamp: Date;
  logs: LogEntry[];
};

interface DevModeContextType {
  isDevModeEnabled: boolean;
  setDevModeEnabled: (val: boolean) => void;
  isPaneExpanded: boolean;
  setPaneExpanded: (val: boolean) => void;
  groups: LogGroup[];
  startLogGroup: (route: string, title: string, source?: string) => string;
  addLog: (message: string, sourceOrGroupId?: string) => void;
  clearLogs: (route?: string) => void;
}

const DevModeContext = createContext<DevModeContextType | undefined>(undefined);

export function DevModeProvider({ children }: { children: ReactNode }) {
  const [isDevModeEnabled, setDevModeEnabled] = useState(false);
  const [isPaneExpanded, setPaneExpanded] = useState(false);
  const [groups, setGroups] = useState<LogGroup[]>([]);

  const startLogGroup = React.useCallback((route: string, title: string, source: string = 'System') => {
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

  const addLog = React.useCallback((message: string, sourceOrGroupId: string = 'System') => {
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

  const clearLogs = React.useCallback((route?: string) => {
    if (route) {
      setGroups(prev => prev.filter(g => g.route !== route));
    } else {
      setGroups([]);
    }
  }, []);

  return (
    <DevModeContext.Provider value={{ isDevModeEnabled, setDevModeEnabled, isPaneExpanded, setPaneExpanded, groups, startLogGroup, addLog, clearLogs }}>
      {children}
    </DevModeContext.Provider>
  );
}

export const useDevMode = () => {
  const ctx = useContext(DevModeContext);
  if (!ctx) throw new Error("useDevMode must be used within DevModeProvider");
  return ctx;
};
