import React, { useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getHelpModuleById, resolveHelpModuleIdFromPathname } from './helpData';
import { HelpContext } from './useHelp';

const LAST_MODULE_KEY = 'inmotech_help_last_module';
const OPENED_KEY = 'inmotech_help_opened';
const inMemorySessionStore = {};

const safeSession = {
  get(key) {
    if (Object.prototype.hasOwnProperty.call(inMemorySessionStore, key)) {
      return inMemorySessionStore[key];
    }

    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const storedValue = window.sessionStorage.getItem(key);
        if (storedValue !== null) {
          inMemorySessionStore[key] = storedValue;
          return storedValue;
        }
      }
    } catch (error) {
      return inMemorySessionStore[key] ?? null;
    }

    return null;
  },
  set(key, value) {
    const normalizedValue = String(value);
    inMemorySessionStore[key] = normalizedValue;

    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(key, normalizedValue);
      }
    } catch (error) {
      // Ignore storage access errors and keep memory fallback.
    }
  }
};

const resolveInitialModule = (moduleId) =>
  getHelpModuleById(moduleId) ? moduleId : 'dashboard';

export const HelpProvider = ({ children }) => {
  const location = useLocation();
  const currentRouteModuleId = resolveHelpModuleIdFromPathname(location.pathname);
  const triggerRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [lastVisitedModuleId, setLastVisitedModuleId] = useState(() =>
    resolveInitialModule(safeSession.get(LAST_MODULE_KEY) || 'dashboard')
  );
  const [activeModuleId, setActiveModuleId] = useState(() =>
    resolveInitialModule(currentRouteModuleId || safeSession.get(LAST_MODULE_KEY) || 'dashboard')
  );
  const [hasBeenOpenedThisSession, setHasBeenOpenedThisSession] = useState(
    () => safeSession.get(OPENED_KEY) === 'true'
  );

  const setActiveModule = (moduleId) => {
    const nextModuleId = resolveInitialModule(moduleId);
    setActiveModuleId(nextModuleId);
    setLastVisitedModuleId(nextModuleId);
    safeSession.set(LAST_MODULE_KEY, nextModuleId);
  };

  const openHelp = (moduleId) => {
    const nextModuleId =
      moduleId || currentRouteModuleId || lastVisitedModuleId || 'dashboard';

    setActiveModule(nextModuleId);
    setIsOpen(true);

    if (!hasBeenOpenedThisSession) {
      setHasBeenOpenedThisSession(true);
      safeSession.set(OPENED_KEY, 'true');
    }
  };

  const closeHelp = () => {
    setIsOpen(false);

    if (typeof window !== 'undefined' && triggerRef.current) {
      window.setTimeout(() => {
        triggerRef.current?.focus();
      }, 0);
    }
  };

  const goToDashboardHelp = () => {
    setActiveModule('dashboard');
  };

  const value = useMemo(
    () => ({
      isOpen,
      activeModuleId,
      currentRouteModuleId,
      lastVisitedModuleId,
      hasBeenOpenedThisSession,
      openHelp,
      closeHelp,
      setActiveModule,
      goToDashboardHelp,
      triggerRef
    }),
    [
      activeModuleId,
      currentRouteModuleId,
      hasBeenOpenedThisSession,
      isOpen,
      lastVisitedModuleId
    ]
  );

  return <HelpContext.Provider value={value}>{children}</HelpContext.Provider>;
};

export default HelpProvider;
