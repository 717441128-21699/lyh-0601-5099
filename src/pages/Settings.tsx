import { useState, useEffect } from 'react';
import { Users, Building2, Settings as SettingsIcon, AlertTriangle, Save, Clock, TrendingDown, Shield } from 'lucide-react';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { MOCK_USERS, AGENCIES, PROVINCES, getProvinceName, getAgencyName } from '@/data/constants';
import { canAccessSettings, getRoleName } from '@/utils/permissions';

type TabType = 'users' | 'agencies' | 'thresholds';

export default function Settings() {
  const { loadAllData, isLoaded } = useDataStore();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [cycleThreshold, setCycleThreshold] = useState<number>(180);
  const [grantRateThreshold, setGrantRateThreshold] = useState<number>(20);
  const [saved, setSaved] = useState<boolean>(false);

  useEffect(() => {
    if (!isLoaded) loadAllData();
  }, [isLoaded, loadAllData]);

  if (!canAccessSettings(user)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Shield className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <p className="text-gray-600">您没有权限访问系统设置</p>
        </div>
      </div>
    );
  }

  const tabs: { key: TabType; label: string; icon: React.ElementType }[] = [
    { key: 'users', label: '用户管理', icon: Users },
    { key: 'agencies', label: '代办处管理', icon: Building2 },
    { key: 'thresholds', label: '阈值配置', icon: SettingsIcon },
  ];

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const renderUserTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-gray-600">
            <th className="text-left px-4 py-3 font-medium">用户名</th>
            <th className="text-left px-4 py-3 font-medium">姓名</th>
            <th className="text-left px-4 py-3 font-medium">角色</th>
            <th className="text-left px-4 py-3 font-medium">所属省份</th>
            <th className="text-left px-4 py-3 font-medium">所属代办处</th>
          </tr>
        </thead>
        <tbody>
          {MOCK_USERS.map((u) => (
            <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-800">{u.username}</td>
              <td className="px-4 py-3 text-gray-600">{u.name}</td>
              <td className="px-4 py-3">
                <span className="badge badge-info">{getRoleName(u.role)}</span>
              </td>
              <td className="px-4 py-3 text-gray-600">
                {u.provinceId ? getProvinceName(u.provinceId) : '-'}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {u.agencyId ? getAgencyName(u.agencyId) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderAgencyTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-gray-600">
            <th className="text-left px-4 py-3 font-medium">代办处名称</th>
            <th className="text-left px-4 py-3 font-medium">所属省份</th>
            <th className="text-left px-4 py-3 font-medium">编码</th>
            <th className="text-right px-4 py-3 font-medium">审查员人数</th>
          </tr>
        </thead>
        <tbody>
          {AGENCIES.map((a) => (
            <tr key={a.id} className="border-t border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-800">{a.name}</td>
              <td className="px-4 py-3 text-gray-600">{getProvinceName(a.provinceId)}</td>
              <td className="px-4 py-3 text-gray-600 font-mono text-xs">{a.code}</td>
              <td className="px-4 py-3 text-right text-gray-600">{a.examinerCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderThresholdForm = () => (
    <div className="max-w-xl space-y-6">
      <div>
        <label className="label flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          审查周期阈值（天）
        </label>
        <input
          type="number"
          min={1}
          value={cycleThreshold}
          onChange={(e) => setCycleThreshold(Number(e.target.value))}
          className="input"
        />
        <p className="text-xs text-gray-400 mt-1">
          当平均审查周期超过该天数时触发预警，默认 180 天
        </p>
      </div>
      <div>
        <label className="label flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-gray-400" />
          授权率预警阈值（%）
        </label>
        <input
          type="number"
          min={1}
          max={100}
          value={grantRateThreshold}
          onChange={(e) => setGrantRateThreshold(Number(e.target.value))}
          className="input"
        />
        <p className="text-xs text-gray-400 mt-1">
          当授权率较基准下滑超过该比例时触发预警，默认下滑 20%
        </p>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-medium">阈值修改提示</p>
          <p className="mt-1">修改阈值后将影响所有预警规则的判定标准，请谨慎调整。建议在充分分析历史数据后进行设置。</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={handleSave} className="btn-primary inline-flex items-center gap-2">
          <Save className="w-4 h-4" />
          保存配置
        </button>
        {saved && (
          <span className="text-sm text-green-600 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            保存成功
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">系统设置</h1>
        <p className="text-gray-500 mt-1">管理系统用户、代办处及预警阈值配置</p>
      </div>

      <div className="card overflow-hidden">
        <div className="flex border-b border-gray-100">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all duration-200 border-b-2 ${
                  isActive
                    ? 'text-primary-600 border-primary-600 bg-primary-50/50'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="p-6">
          {activeTab === 'users' && renderUserTable()}
          {activeTab === 'agencies' && renderAgencyTable()}
          {activeTab === 'thresholds' && renderThresholdForm()}
        </div>
      </div>
    </div>
  );
}
