import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ServerContextType {
  serverIP: string | null;
  setServerIP: (ip: string | null) => void;
}

const ServerContext = createContext<ServerContextType | undefined>(undefined);

export function ServerProvider({ children }: { children: ReactNode }) {
  const [serverIP, setServerIP] = useState<string | null>(null);

  return (
    <ServerContext.Provider value={{ serverIP, setServerIP }}>
      {children}
    </ServerContext.Provider>
  );
}

export function useServer() {
  const context = useContext(ServerContext);
  if (context === undefined) {
    throw new Error('useServer must be used within a ServerProvider');
  }
  return context;
}
