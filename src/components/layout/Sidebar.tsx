import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  LayoutDashboard,
  MapPin,
  AlertTriangle,
  CheckSquare,
  Users,
  FileBarChart,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { canViewForecast, canAccessSettings, getRoleName } from '@/utils/permissions';

interface MenuItem {
  path: string;
  label: string;
  icon: React.ElementType;
  visible?: boolean;
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuthStore();

  const menuItems: MenuItem[] = [
    { path: '/', label: '总览看板', icon: LayoutDashboard },
    { path: '/province', label: '省份详情', icon: MapPin },
    { path: '/warnings', label: '预警中心', icon: AlertTriangle },
    { path: '/approvals', label: '审批中心', icon: CheckSquare },
    {
      path: '/forecast',
      label: '人员预测',
      icon: Users,
      visible: canViewForecast(user),
    },
    { path: '/reports', label: '诊断报告', icon: FileBarChart },
    {
      path: '/settings',
      label: '系统管理',
      icon: Settings,
      visible: canAccessSettings(user),
    },
  ];

  const visibleItems = menuItems.filter((item) => item.visible !== false);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 248 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="h-screen bg-gradient-to-b from-primary-800 to-primary-900 flex flex-col border-r border-primary-700 shadow-xl relative"
    >
      <div className="flex items-center justify-center h-16 border-b border-primary-700/50 px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <div className="text-white font-bold text-base leading-tight">知识产权平台</div>
                <div className="text-primary-200 text-xs">审查效能分析</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                  : 'text-primary-100 hover:bg-primary-700/50 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full"
                  />
                )}
                <item.icon
                  className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110`}
                />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="text-sm font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <AnimatePresence>
        {!collapsed && user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="px-4 py-4 border-t border-primary-700/50"
          >
            <div className="bg-primary-700/50 rounded-xl p-3">
              <div className="text-white text-sm font-medium truncate">{user.name}</div>
              <div className="text-primary-200 text-xs mt-1">{getRoleName(user.role)}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-primary-600 hover:bg-primary-500 text-white rounded-full flex items-center justify-center shadow-lg transition-colors border-2 border-primary-800"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
    </motion.aside>
  );
}
