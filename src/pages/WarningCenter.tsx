import { useState, useEffect, useMemo } from 'react';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import type { Warning, WarningStatus } from '@/types';
import { AlertTriangle, Clock, CheckCircle, ChevronRight, Play, CheckSquare, FileCheck } from 'lucide-react';
import WarningCard from '@/components/common/WarningCard';
import ApprovalTimeline from '@/components/common/ApprovalTimeline';
import Modal from '@/components/ui/Modal';
import { getTechFieldName, getProvinceName } from '@/data/constants';
import { formatDateTime, formatDays, formatPercent } from '@/utils/formatters';
import { canHandleWarning } from '@/utils/permissions';

type TabType = 'pending' | 'processing' | 'resolved';

const tabs: { key: TabType; label: string; icon: typeof Clock }[] = [
  { key: 'pending', label: '待处理', icon: Clock },
  { key: 'processing', label: '处理中', icon: AlertTriangle },
  { key: 'resolved', label: '已处理', icon: CheckCircle },
];

const typeLabels: Record<string, string> = {
  cycle_exceed: '审查周期超标',
  grant_rate_drop: '授权率下滑',
};

const levelColors = {
  1: 'text-red-600 bg-red-50 border-red-200',
  2: 'text-orange-600 bg-orange-50 border-orange-200',
  3: 'text-yellow-600 bg-yellow-50 border-yellow-200',
};

export default function WarningCenter() {
  const { 
    warnings, 
    approvalFlows, 
    loadAllData, 
    updateWarningStatus, 
    isLoaded,
    createApprovalFlow,
    updateWarningApprovalFlowId,
  } = useDataStore();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [selectedWarning, setSelectedWarning] = useState<Warning | null>(null);
  const [startApprovalOpen, setStartApprovalOpen] = useState(false);

  useEffect(() => {
    if (!isLoaded) loadAllData();
  }, [isLoaded, loadAllData]);

  const permissionFilteredWarnings = useMemo(() => {
    if (!user) return warnings;
    if (user.role === 'national') return warnings;
    if (user.role === 'provincial' && user.provinceId) {
      return warnings.filter((w) => w.provinceId === user.provinceId);
    }
    if ((user.role === 'agency' || user.role === 'examiner') && user.agencyId) {
      return warnings.filter((w) => w.agencyId === user.agencyId);
    }
    return warnings;
  }, [warnings, user]);

  const filteredWarnings = permissionFilteredWarnings.filter((w) => w.status === activeTab);
  const counts = {
    pending: permissionFilteredWarnings.filter((w) => w.status === 'pending').length,
    processing: permissionFilteredWarnings.filter((w) => w.status === 'processing').length,
    resolved: permissionFilteredWarnings.filter((w) => w.status === 'resolved').length,
  };

  const canHandle = canHandleWarning(user);
  const relatedFlow = selectedWarning?.approvalFlowId ? approvalFlows.find((f) => f.id === selectedWarning.approvalFlowId) : undefined;

  const formatMetric = (warning: Warning) => {
    if (warning.type === 'cycle_exceed') {
      return { value: formatDays(warning.metricValue), threshold: formatDays(warning.thresholdValue) };
    }
    return { value: formatPercent(warning.metricValue), threshold: formatPercent(warning.thresholdValue) };
  };

  const handleMarkResolved = () => {
    if (!selectedWarning || !user) return;
    updateWarningStatus(selectedWarning.id, 'resolved');
    setSelectedWarning({ ...selectedWarning, status: 'resolved' });
  };

  const handleStartApproval = () => {
    if (!selectedWarning || !user) return;
    
    const targetAgencyId = selectedWarning.agencyId || 'gd-2';
    
    const proposal = {
      targetAgencyId,
      sourceAgencyId: 'gd-1',
      techField: selectedWarning.techField,
      examinerCount: Math.min(3, Math.max(1, Math.floor(selectedWarning.metricValue / 30))),
      reason: selectedWarning.message,
      expectedEffect: `预计30天内将${selectedWarning.type === 'cycle_exceed' ? '审查周期' : '授权率'}恢复至正常水平`,
      estimatedDuration: 30,
    };
    
    const flowId = createApprovalFlow(selectedWarning.id, proposal);
    
    updateWarningApprovalFlowId(selectedWarning.id, flowId);
    
    updateWarningStatus(selectedWarning.id, 'processing');
    
    setSelectedWarning({ 
      ...selectedWarning, 
      status: 'processing',
      approvalFlowId: flowId,
    });
    
    setStartApprovalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">预警中心</h1>
          <p className="text-gray-500">监控审查效能异常，及时处理预警信息</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            const count = counts[tab.key];
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`p-5 rounded-xl border text-left transition-all duration-200 ${
                  isActive
                    ? 'bg-white border-blue-400 shadow-md ring-2 ring-blue-100'
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      tab.key === 'pending' ? 'bg-amber-100 text-amber-600' :
                      tab.key === 'processing' ? 'bg-blue-100 text-blue-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      <Icon size={20} />
                    </div>
                    <span className={`font-medium ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
                      {tab.label}
                    </span>
                  </div>
                  <span className={`text-2xl font-bold ${
                    tab.key === 'pending' ? 'text-amber-600' :
                    tab.key === 'processing' ? 'text-blue-600' :
                    'text-green-600'
                  }`}>
                    {count}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {filteredWarnings.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <CheckCircle size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">暂无{tabs.find(t => t.key === activeTab)?.label}预警</p>
              </div>
            ) : (
              filteredWarnings.map((warning) => (
                <WarningCard
                  key={warning.id}
                  warning={warning}
                  onClick={() => setSelectedWarning(warning)}
                  selected={selectedWarning?.id === warning.id}
                />
              ))
            )}
          </div>

          <div className="lg:col-span-3">
            {selectedWarning ? (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${levelColors[selectedWarning.level]}`}>
                          {selectedWarning.level}级预警
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {typeLabels[selectedWarning.type]}
                        </span>
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">{selectedWarning.message}</h2>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <span>技术领域：{getTechFieldName(selectedWarning.techField)}</span>
                    {selectedWarning.provinceId && <span>所属省份：{getProvinceName(selectedWarning.provinceId)}</span>}
                    <span>触发时间：{formatDateTime(selectedWarning.triggeredAt)}</span>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">指标详情</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs text-gray-500 mb-1">当前指标值</p>
                        <p className="text-xl font-bold text-red-600">{formatMetric(selectedWarning).value}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs text-gray-500 mb-1">预警阈值</p>
                        <p className="text-xl font-bold text-gray-700">{formatMetric(selectedWarning).threshold}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">处理建议</h3>
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-start gap-2">
                          <ChevronRight size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                          <span>建议立即启动审查员调配审批流程，补充该领域审查力量</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <ChevronRight size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                          <span>评估当前审查员工作负荷，优化案件分配机制</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <ChevronRight size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                          <span>加强质量监控，确保审查标准一致性</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {relatedFlow && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">关联审批流程</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-gray-900">{relatedFlow.title}</span>
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                            审批中 - Step{relatedFlow.currentStep}
                          </span>
                        </div>
                        <ApprovalTimeline flow={relatedFlow} />
                      </div>
                    </div>
                  )}
                </div>

                {canHandle && selectedWarning.status !== 'resolved' && (
                  <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
                    {selectedWarning.status === 'pending' && (
                      <>
                        <button
                          onClick={handleMarkResolved}
                          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                        >
                          <CheckSquare size={16} />
                          标记已处理
                        </button>
                        <button
                          onClick={() => setStartApprovalOpen(true)}
                          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <Play size={16} />
                          启动审批流程
                        </button>
                      </>
                    )}
                    {selectedWarning.status === 'processing' && (
                      <button
                        onClick={handleMarkResolved}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <CheckSquare size={16} />
                        标记已处理
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center min-h-[400px] flex items-center justify-center">
                <div>
                  <FileCheck size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">请从左侧选择一个预警查看详情</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal open={startApprovalOpen} onClose={() => setStartApprovalOpen(false)} title="启动审批流程">
        <div className="space-y-4">
          <p className="text-gray-600">
            确认要为该预警启动审查员调配审批流程吗？流程将依次经过代办处确认、省级中心复核、国家局批准三个阶段。
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setStartApprovalOpen(false)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleStartApproval}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              确认启动
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
