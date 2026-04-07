import { createContext, useContext } from 'react';

export const HelpContext = createContext(null);

export const useHelp = () => {
  const context = useContext(HelpContext);

  if (!context) {
    throw new Error('useHelp debe usarse dentro de un HelpProvider');
  }

  return context;
};
