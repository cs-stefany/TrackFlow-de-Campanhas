import { useCallback, useEffect } from 'react';

const DISCARD_MESSAGE = 'Descartar as alterações não salvas?';

export function useUnsavedChanges(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  return useCallback(() => !isDirty || window.confirm(DISCARD_MESSAGE), [isDirty]);
}
