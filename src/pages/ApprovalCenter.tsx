import { useState, useEffect } from 'react';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import type { ApprovalFlow } from '@/types';
import { FileText, Clock, CheckCircle, XCircle, Users, Target, Calendar, Lightbulb, TrendingUp, AlertCircle, Send, X, ChevronRight } from 'lucide-react';
import ApprovalTimeline from '@/components/common/ApprovalTimeline';
import { getTechFieldName, getAgencyName } from '@/data/constants';
import { formatDateTime, formatDays } from '@/utils/formatters';
import { canApproveStep, getRoleName } from '@/utils/permissions';

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  step1_pending: { label: '待审查员确认', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  step2_pending: { label: '待中心复核', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  step3_pending: { label: '待国家局批准', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  approved: { label: '已批准', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  rejected: { label: '已拒绝', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
};

export default function ApprovalCenter() {
  const { approvalFlows, warnings, approveStep, loadAllData, isLoaded } = useDataStore();
  const { user } = useAuthStore();
  const [selectedFlow, setSelectedFlow] = useState<ApprovalFlow | null>(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!isLoaded) loadAllData();
  }, [isLoaded, loadAllData]);

  useEffect(() => {
    if (approvalFlows.length > 0 && !selectedFlow) {
      setSelectedFlow(approvalFlows[0]);
    }
  }, [approvalFlows, selectedFlow]);

  const pendingFlows = approvalFlows.filter((f) => f.status !== 'approved' && f.status !== 'rejected');
  const canApprove = selectedFlow && user && canApproveStep(user, selectedFlow.currentStep) && 
    selectedFlow.status !== 'approved' && selectedFlow.status !== 'rejected';

  const relatedWarning = selectedFlow?.warningId ? warnings.find((w) => w.id === selectedFlow.warningId) : undefined;

  const handleApprove = (approved: boolean) => {
    if (!selectedFlow || !user) return;
    approveStep(
      selectedFlow.id,
      selectedFlow.currentStep,
      user.id,
      user.name,
      comment || (approved ? '同意' : '拒绝'),
      approved
    );
    setComment('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">审批中心</h1>
          <p className="text-gray-500">审批审查员调配方案，确保资源合理配置</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">待审批列表</h2>
                <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">
                  {pendingFlows.length} 项
                </span>
              </div>
              <div className="divide-y divide-gray-100 max-h-[calc(100vh-240px)] overflow-y-auto">
                {approvalFlows.length === 0 ? (
                  <div className="p-8 text-center">
                    <FileText size={36} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">暂无审批流程</p>
                  </div>
                ) : (
                  approvalFlows.map((flow) => {
                    const status = statusLabels[flow.status];
                    const isSelected = selectedFlow?.id === flow.id;
                    return (
                      <button
                        key={flow.id}
                        onClick={() => setSelectedFlow(flow)}
                        className={`w-full p-4 text-left transition-colors ${
                          isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className={`font-medium text-sm leading-snug ${
                            isSelected ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {flow.title}
                          </h3>
                          <ChevronRight size={16} className={`flex-shrink-0 mt-0.5 ${
                            isSelected ? 'text-blue-500' : 'text-gray-400'
                          }`} />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${status.bg} ${status.color}`}>
                            {status.label}
                          </span>
                          <span className="text-xs text-gray-500">{formatDateTime(flow.createdAt)}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            {selectedFlow ? (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-xl font-bold text-gray-900">{selectedFlow.title}</h2>
                        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusLabels[selectedFlow.status].bg} ${statusLabels[selectedFlow.status].color}`}>
                          {statusLabels[selectedFlow.status].label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        创建时间：{formatDateTime(selectedFlow.createdAt)}
                        {relatedWarning && (
                          <span className="ml-4">关联预警：{relatedWarning.message}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText size={18} className="text-blue-500" />
                    调配方案详情
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Target size={14} className="text-gray-400" />
                        <span className="text-xs text-gray-500">目标代办处</span>
                      </div>
                      <p className="font-medium text-gray-900">{getAgencyName(selectedFlow.proposal.targetAgencyId)}</p>
                    </div>
                    {selectedFlow.proposal.sourceAgencyId && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Users size={14} className="text-gray-400" />
                          <span className="text-xs text-gray-500">来源代办处</span>
                        </div>
                        <p className="font-medium text-gray-900">{getAgencyName(selectedFlow.proposal.sourceAgencyId)}</p>
                      </div>
                    )}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Lightbulb size={14} className="text-gray-400" />
                        <span className="text-xs text-gray-500">技术领域</span>
                      </div>
                      <p className="font-medium text-gray-900">{getTechFieldName(selectedFlow.proposal.techField)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Users size={14} className="text-gray-400" />
                        <span className="text-xs text-gray-500">调配人数</span>
                      </div>
                      <p className="font-medium text-gray-900">{selectedFlow.proposal.examinerCount} 人</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar size={14} className="text-gray-400" />
                        <span className="text-xs text-gray-500">预计周期</span>
                      </div>
                      <p className="font-medium text-gray-900">{formatDays(selectedFlow.proposal.estimatedDuration)}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle size={14} className="text-amber-500" />
                        <span className="text-sm font-medium text-gray-900">调配原因</span>
                      </div>
                      <p className="text-sm text-gray-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
                        {selectedFlow.proposal.reason}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={14} className="text-green-500" />
                        <span className="text-sm font-medium text-gray-900">预期效果</span>
                      </div>
                      <p className="text-sm text-gray-700 bg-green-50 border border-green-100 rounded-lg p-3">
                        {selectedFlow.proposal.expectedEffect}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock size={18} className="text-blue-500" />
                    审批流程
                  </h3>
                  <ApprovalTimeline flow={selectedFlow} />
                </div>

                {canApprove && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Send size={18} className="text-blue-500" />
                      审批操作
                      <span className="text-xs font-normal text-gray-500 ml-2">
                        当前角色：{user && getRoleName(user.role)}
                      </span>
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">审批意见</label>
                        <textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="请输入审批意见..."
                          rows={3}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => handleApprove(false)}
                          className="px-6 py-2.5 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 transition-colors flex items-center gap-2 font-medium"
                        >
                          <XCircle size={18} />
                          拒绝
                        </button>
                        <button
                          onClick={() => handleApprove(true)}
                          className="px-6 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
                        >
                          <CheckCircle size={18} />
                          通过
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center min-h-[400px] flex items-center justify-center">
                <div>
                  <FileText size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">请从左侧选择一个审批流程查看详情</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
