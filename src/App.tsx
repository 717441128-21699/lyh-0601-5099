import { RouterProvider } from 'react-router-dom';
import { router } from '@/router';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const user = useAuthStore((s) => s.user);
  const loadAllData = useDataStore((s) => s.loadAllData);
  const isLoaded = useDataStore((s) => s.isLoaded);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user && !isLoaded) {
      loadAllData();
    }
  }, [user, isLoaded, loadAllData]);

  return <RouterProvider router={router} />;
}
