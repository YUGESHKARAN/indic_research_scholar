
import { useState, useEffect, useCallback } from "react"
import api from "../instances/axiosInstance";

const useShorts = () => {

  const [shorts, setShorts] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryError, setLibraryError] = useState('');

    const loadShorts = useCallback(async () => {
    const { data } = await api.get('/api/shorts/list');
    return data.shorts || [];
  }, []);

  const refreshShorts = useCallback(async () => {
    setLibraryLoading(true);
    setLibraryError('');
    try {
      setShorts(await loadShorts());
    } catch (error) {
      setLibraryError(getErrorMessage(error, 'Could not load your Shorts.'));
    } finally {
      setLibraryLoading(false);
    }
  }, [loadShorts]);

  useEffect(() => {
      let active = true;
      loadShorts()
        .then((items) => {
          if (active) setShorts(items);
        })
        .catch((error) => {
          if (active) setLibraryError(getErrorMessage(error, 'Could not load your Shorts.'));
        })
        .finally(() => {
          if (active) setLibraryLoading(false);
        });
      return () => {
        active = false;
      };
    }, [loadShorts]);

  return {shorts, setShorts, libraryLoading, setLibraryLoading, libraryError, setLibraryError, loadShorts, refreshShorts}

}

export default useShorts;