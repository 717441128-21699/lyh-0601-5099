import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  Bell,
  User,
  LogOut,
  ChevronDown,
  Home,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getRoleName } from '@/utils/permissions';

interface HeaderProps {
  onToggleSidebar: () => void;
}

const routeTitles: Record<string, string> = {
  '/': '总览看板',
  '/provinces': '省份详情',
  '/warnings': '预警中心',
  '/approvals': '审批中心',
  '/forecast': '人员预测',
  '/reports': '诊断报告',
  '/settings': '系统管理',
};

export default function Header({ onToggleSidebar }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const currentPath = location.pathname;
  const pageTitle = routeTitles[currentPath] || '未知页面';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 sm:px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-primary-600"
        >
          <Menu className="w-5 h-5" />
        </button>

        <nav className="hidden sm:flex items-center gap-1 text-sm">
          <Home className="w-4 h-4 text-gray-400" />
          <ChevronRight className="w-4 h-4 text-gray-300" />
          <span className="text-primary-600 font-medium">{pageTitle}</span>
        </nav>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-primary-600">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-accent-danger text-white text-xs font-medium rounded-full flex items-center justify-center px-1">
            5
          </span>
        </button>

        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center shadow-md">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-medium text-gray-800">{user?.name}</div>
              <div className="flex items-center gap-1">
                <span className="text-xs px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full font-medium">
                  {user ? getRoleName(user.role) : ''}
                </span>
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform hidden sm:block ${
                showUserMenu ? 'rotate-180' : ''
              }`}
            />
          </button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50"
              >
                <div className="p-4 border-b border-gray-50 bg-gradient-to-r from-primary-50 to-white">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center">
                      {user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">{user?.name}</div>
                      <div className="text-sm text-gray-500">@{user?.username}</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="text-xs px-2.5 py-1 bg-primary-100 text-primary-700 rounded-full font-medium">
                      {user ? getRoleName(user.role) : ''}
                    </span>
                  </div>
                </div>

                <div className="py-2">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-gray-700 hover:bg-red-50 hover:text-accent-danger transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-medium">退出登录</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
