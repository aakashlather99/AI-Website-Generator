import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

/**
 * Hook for optimistic updates
 * Immediately shows updated value while request is pending
 * Automatically reverts on error
 */
export const useOptimisticUpdate = <T,>(initialValue: T) => {
  const [value, setValue] = useState<T>(initialValue);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = useCallback(
    async (newValue: T, apiCall: () => Promise<any>, successMessage = 'Updated') => {
      const oldValue = value;
      
      try {
        setError(null);
        setIsPending(true);
        
        // Optimistically update
        setValue(newValue);
        
        // Make API call
        const response = await apiCall();
        
        if (response.success) {
          toast.success(successMessage);
          return true;
        } else {
          // Revert on API error
          setValue(oldValue);
          const errMsg = response.message || 'Update failed';
          setError(errMsg);
          toast.error(errMsg);
          return false;
        }
      } catch (err: any) {
        // Revert on exception
        setValue(oldValue);
        const errMsg = err.message || 'Update failed';
        setError(errMsg);
        toast.error(errMsg);
        return false;
      } finally {
        setIsPending(false);
      }
    },
    [value]
  );

  return {
    value,
    setValue,
    isPending,
    error,
    update,
  };
};

/**
 * Hook for batch optimistic updates
 * Useful for lists where you update one item optimistically
 */
export const useOptimisticList = <T extends { id: string | number },>(initialList: T[]) => {
  const [list, setList] = useState<T[]>(initialList);
  const [isPending, setPending] = useState(false);

  const updateItem = useCallback(
    async (
      itemId: string | number,
      updates: Partial<T>,
      apiCall: () => Promise<any>,
      successMessage = 'Updated'
    ) => {
      const oldList = list;

      try {
        setPending(true);

        // Optimistically update list
        setList((prevList) =>
          prevList.map((item) =>
            item.id === itemId ? { ...item, ...updates } : item
          )
        );

        // Make API call
        const response = await apiCall();

        if (response.success) {
          toast.success(successMessage);
          return true;
        } else {
          // Revert on error
          setList(oldList);
          toast.error(response.message || 'Update failed');
          return false;
        }
      } catch (err: any) {
        // Revert on exception
        setList(oldList);
        toast.error(err.message || 'Update failed');
        return false;
      } finally {
        setPending(false);
      }
    },
    [list]
  );

  const removeItem = useCallback(
    async (itemId: string | number, apiCall: () => Promise<any>, successMessage = 'Deleted') => {
      const oldList = list;

      try {
        setPending(true);

        // Optimistically remove
        setList((prevList) => prevList.filter((item) => item.id !== itemId));

        // Make API call
        const response = await apiCall();

        if (response.success) {
          toast.success(successMessage);
          return true;
        } else {
          // Revert on error
          setList(oldList);
          toast.error(response.message || 'Delete failed');
          return false;
        }
      } catch (err: any) {
        // Revert on exception
        setList(oldList);
        toast.error(err.message || 'Delete failed');
        return false;
      } finally {
        setPending(false);
      }
    },
    [list]
  );

  return {
    list,
    setList,
    isPending,
    updateItem,
    removeItem,
  };
};
