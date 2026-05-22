import { createContext, useState, useCallback, type ReactNode } from 'react';

interface LoadingState {
  [key: string]: boolean;
}

interface LoadingContextType {
  loading: LoadingState;
  isLoading: (key: string) => boolean;
  setLoading: (key: string, value: boolean) => void;
  clearLoading: (key: string) => void;
  setAllLoading: (value: boolean) => void;
}

export const LoadingContext = createContext<LoadingContextType>({} as LoadingContextType);

export const LoadingProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoadingState] = useState<LoadingState>({});

  const setLoading = useCallback((key: string, value: boolean) => {
    setLoadingState((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const isLoading = useCallback((key: string): boolean => {
    return loading[key] ?? false;
  }, [loading]);

  const clearLoading = useCallback((key: string) => {
    setLoadingState((prev) => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
  }, []);

  const setAllLoading = useCallback((value: boolean) => {
    if (value) {
      setLoadingState({ '*': true });
    } else {
      setLoadingState({});
    }
  }, []);

  return (
    <LoadingContext.Provider
      value={{
        loading,
        isLoading,
        setLoading,
        clearLoading,
        setAllLoading,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
};
