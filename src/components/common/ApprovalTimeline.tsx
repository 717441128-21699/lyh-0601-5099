import type { ApprovalFlow, ApprovalRecord } from '@/types';
import { Check, Clock, X, User } from 'lucide-react';
import { formatDateTime } from '@/utils/formatters';

interface ApprovalTimelineProps {
  flow: ApprovalFlow;
}

type StepStatus = 'completed' | 'current' | 'pending' | 'rejected';

const steps = [
  { step: 1, title: '审查员确认', description: '代办处/审查员确认' },
  { step: 2, title: '中心复核', description: '省级中心复核' },
  { step: 3, title: '国家局批准', description: '国家局最终批准' },
];

function getStepStatus(flow: ApprovalFlow, step: 1 | 2 | 3): StepStatus {
  if (flow.status === 'rejected') {
    if (step === 1 && flow.step1Approval && !flow.step1Approval.approved) return 'rejected';
    if (step === 2 && flow.step2Approval && !flow.step2Approval.approved) return 'rejected';
    if (step === 3 && flow.step3Approval && !flow.step3Approval.approved) return 'rejected';
    return 'pending';
  }
  if (flow.status === 'approved') return 'completed';
  if (step < flow.currentStep) return 'completed';
  if (step === flow.currentStep) return 'current';
  return 'pending';
}

function getApprovalRecord(flow: ApprovalFlow, step: 1 | 2 | 3): ApprovalRecord | undefined {
  if (step === 1) return flow.step1Approval;
  if (step === 2) return flow.step2Approval;
  if (step === 3) return flow.step3Approval;
}

const statusConfig: Record<StepStatus, { dotColor: string; lineColor: string; bgColor: string; textColor: string }> = {
  completed: { dotColor: 'bg-green-500', lineColor: 'bg-green-300', bgColor: 'bg-green-50', textColor: 'text-green-700' },
  current: { dotColor: 'bg-blue-500', lineColor: 'bg-gray-200', bgColor: 'bg-blue-50', textColor: 'text-blue-700' },
  pending: { dotColor: 'bg-gray-300', lineColor: 'bg-gray-200', bgColor: 'bg-gray-50', textColor: 'text-gray-500' },
  rejected: { dotColor: 'bg-red-500', lineColor: 'bg-red-200', bgColor: 'bg-red-50', textColor: 'text-red-700' },
};

export default function ApprovalTimeline({ flow }: ApprovalTimelineProps) {
  return (
    <div className="py-2">
      <div className="relative">
        {steps.map((s, index) => {
          const status = getStepStatus(flow, s.step as 1 | 2 | 3);
          const record = getApprovalRecord(flow, s.step as 1 | 2 | 3);
          const config = statusConfig[status];
          const isLast = index === steps.length - 1;

          return (
            <div key={s.step} className="relative flex gap-4 pb-6 last:pb-0">
              {!isLast && (
                <div className={`absolute left-[15px] top-8 w-0.5 h-[calc(100%-24px)] ${config.lineColor}`} />
              )}
              <div className="relative flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.dotColor} text-white shadow-md z-10 relative`}>
                  {status === 'completed' && <Check size={16} />}
                  {status === 'current' && <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />}
                  {status === 'pending' && <Clock size={14} />}
                  {status === 'rejected' && <X size={16} />}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`font-semibold ${status === 'pending' ? 'text-gray-500' : 'text-gray-900'}`}>
                    Step{s.step} {s.title}
                  </h4>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.textColor}`}>
                    {status === 'completed' && '已完成'}
                    {status === 'current' && '进行中'}
                    {status === 'pending' && '待处理'}
                    {status === 'rejected' && '已拒绝'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-2">{s.description}</p>
                {record && (
                  <div className={`rounded-lg p-3 ${config.bgColor}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <User size={14} className={config.textColor} />
                      <span className={`text-sm font-medium ${config.textColor}`}>{record.userName}</span>
                      <span className="text-xs text-gray-400">{formatDateTime(record.approvedAt)}</span>
                    </div>
                    <p className={`text-sm ${status === 'pending' ? 'text-gray-500' : 'text-gray-700'}`}>
                      {record.comment || (record.approved ? '同意' : '拒绝')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
