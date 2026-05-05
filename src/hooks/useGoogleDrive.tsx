import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import { DriveService } from '@/lib/drive';
import { CalendarService } from '@/lib/calendar';
import { store } from '@/lib/storage';
import { emit, subscribeToFocoData } from '@/lib/events';

const TOKEN_KEY = 'foco.google.token';
const TOKEN_EXPIRY_KEY = 'foco.google.expiry';
const FOLDER_KEY = 'foco.google.folderId';

type DriveContextType = {
  driveService: DriveService | null;
  calendarService: CalendarService | null;
  appFolderId: string | null;
  isSyncing: boolean;
  login: () => void;
  logout: () => void;
};

const DriveContext = createContext<DriveContextType>({
  driveService: null,
  calendarService: null,
  appFolderId: null,
  isSyncing: false,
  login: () => {},
  logout: () => {},
});

export const useGoogleDrive = () => useContext(DriveContext);

/** Persists token to localStorage with a 55-minute expiry (tokens last 60min). */
function saveToken(token: string, expiresInSeconds = 3599) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + expiresInSeconds * 1000));
}

function loadToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = Number(localStorage.getItem(TOKEN_EXPIRY_KEY) || '0');
  if (!token || Date.now() > expiry) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    return null;
  }
  return token;
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem(FOLDER_KEY);
}

export function GoogleDriveProvider({ children }: { children: React.ReactNode }) {
  const [driveService, setDriveService] = useState<DriveService | null>(null);
  const [calendarService, setCalendarService] = useState<CalendarService | null>(null);
  const [appFolderId, setAppFolderId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const initWithToken = useCallback(async (token: string) => {
    const ds = new DriveService(token);
    setDriveService(ds);
    setCalendarService(new CalendarService(token));
    setIsSyncing(true);
    try {
      // Try to restore cached folder ID first for speed
      let folderId = localStorage.getItem(FOLDER_KEY);
      if (!folderId) {
        folderId = await ds.getAppFolderId();
        localStorage.setItem(FOLDER_KEY, folderId);
      }
      setAppFolderId(folderId);

      const db = await ds.loadDatabase(folderId);
      if (db) {
        store.setClients(db.clients || []);
        store.setTasks(db.tasks || []);
        store.setCycles(db.cycles || []);
        store.setReportsSent(db.reportsSent || {});
        if (db.workspaces) store.setWorkspaces(db.workspaces);
        if (db.notes) {
          Object.keys(db.notes).forEach(ws => {
            store.setNotes(ws as any, db.notes[ws]);
          });
        }
        emit();
      } else {
        await syncToCloud(ds, folderId);
      }
    } catch (e) {
      console.error("Erro ao inicializar Drive", e);
      // If folder ID cached is stale, clear and retry
      localStorage.removeItem(FOLDER_KEY);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Auto-restore session on page load if token is still valid
  useEffect(() => {
    const savedToken = loadToken();
    if (savedToken) {
      initWithToken(savedToken);
    }
  }, []);

  const login = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/calendar.events',
    onSuccess: async (tokenResponse) => {
      saveToken(tokenResponse.access_token, tokenResponse.expires_in ?? 3599);
      await initWithToken(tokenResponse.access_token);
    },
    onError: (error) => console.error('Login Failed:', error)
  });

  const logout = useCallback(() => {
    googleLogout();
    clearToken();
    setDriveService(null);
    setCalendarService(null);
    setAppFolderId(null);
  }, []);

  const syncToCloud = async (ds: DriveService, folderId: string) => {
    setIsSyncing(true);
    try {
      const db = {
        clients: store.getClients(),
        tasks: store.getTasks(),
        cycles: store.getCycles(),
        reportsSent: store.getReportsSent(),
        workspaces: store.getWorkspaces(),
        notes: store.getWorkspaces().reduce((acc, ws) => { acc[ws.id] = store.getNotes(ws.id); return acc; }, {} as Record<string, any>)
      };
      await ds.saveDatabase(folderId, db);
    } catch(e) {
      console.error("Erro no sync", e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!driveService || !appFolderId) return;
    let timeout: any;
    
    const listener = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        syncToCloud(driveService, appFolderId);
      }, 3000);
    };

    const unsubscribe = subscribeToFocoData(listener);
    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [driveService, appFolderId]);

  return (
    <DriveContext.Provider value={{ driveService, calendarService, appFolderId, isSyncing, login, logout }}>
      {children}
    </DriveContext.Provider>
  );
}
