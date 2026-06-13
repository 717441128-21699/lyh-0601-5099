import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import ProvinceDetail from '@/pages/ProvinceDetail';
import WarningCenter from '@/pages/WarningCenter';
import ApprovalCenter from '@/pages/ApprovalCenter';
import StaffForecast from '@/pages/StaffForecast';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';
import PrivateRoute from './PrivateRoute';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <PrivateRoute>
        <MainLayout />
      </PrivateRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'province/:provinceId?',
        element: (
          <PrivateRoute requiredRole="provincial">
            <ProvinceDetail />
          </PrivateRoute>
        ),
      },
      {
        path: 'warnings',
        element: (
          <PrivateRoute requiredRole="agency">
            <WarningCenter />
          </PrivateRoute>
        ),
      },
      {
        path: 'approvals',
        element: <ApprovalCenter />,
      },
      {
        path: 'forecast',
        element: (
          <PrivateRoute requiredRole="provincial">
            <StaffForecast />
          </PrivateRoute>
        ),
      },
      {
        path: 'reports',
        element: <Reports />,
      },
      {
        path: 'settings',
        element: (
          <PrivateRoute requiredRole="national">
            <Settings />
          </PrivateRoute>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);
