import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import { DriveService } from '@/lib/drive';
import { CalendarService } from '@/lib/calendar';
import { store } from '@/lib/storage';
import { emit, subscribeToFocoData } from '@/lib/events';

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

export function GoogleDriveProvider({ children }: { children: React.ReactNode }) {
  const [driveService, setDriveService] = useState<DriveService | null>(null);
  const [calendarService, setCalendarService] = useState<CalendarService | null>(null);
  const [appFolderId, setAppFolderId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const login = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/calendar.events',
    onSuccess: async (tokenResponse) => {
      const ds = new DriveService(tokenResponse.access_token);
      setDriveService(ds);
      setCalendarService(new CalendarService(tokenResponse.access_token));
      
      setIsSyncing(true);
      try {
        const folderId = await ds.getAppFolderId();
        setAppFolderId(folderId);
        
        const db = await ds.loadDatabase(folderId);
        if (db) {
          store.setClients(db.clients || []);
          store.setTasks(db.tasks || []);
          store.setCycles(db.cycles || []);
          store.setReportsSent(db.reportsSent || {});
          
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
      } finally {
        setIsSyncing(false);
      }
    },
    onError: (error) => console.error('Login Failed:', error)
  });

  const logout = useCallback(() => {
    googleLogout();
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
        notes: {
          saficos: store.getNotes("saficos"),
          mariana: store.getNotes("mariana"),
          publique: store.getNotes("publique"),
        }
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
      }, 3000); // 3 seconds debounce
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
