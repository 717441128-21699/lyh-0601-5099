import type { Warning } from '@/types';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { formatDateTime } from '@/utils/formatters';
import { getTechFieldName, getProvinceName } from '@/data/constants';

interface WarningCardProps {
  warning: Warning;
  onClick?: () => void;
  selected?: boolean;
}

const levelConfig = {
  1: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500', label: '1级' },
  2: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500', label: '2级' },
  3: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500', label: '3级' },
};

const statusConfig = {
  pending: { icon: Clock, color: 'text-amber-500', label: '待处理' },
  processing: { icon: AlertTriangle, color: 'text-blue-500', label: '处理中' },
  resolved: { icon: CheckCircle, color: 'text-green-500', label: '已处理' },
};

const typeLabels: Record<string, string> = {
  cycle_exceed: '审查周期超标',
  grant_rate_drop: '授权率下滑',
};

export default function WarningCard({ warning, onClick, selected }: WarningCardProps) {
  const level = levelConfig[warning.level];
  const StatusIcon = statusConfig[warning.status].icon;

  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md ${
        selected ? 'border-blue-400 ring-2 ring-blue-100 shadow-md' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${level.bg} ${level.text} ${level.border} border`}>
            <span className={`w-1.5 h-1.5 rounded-full ${level.dot}`}></span>
            {level.label}
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {typeLabels[warning.type]}
          </span>
        </div>
        <div className={`flex items-center gap-1 text-xs ${statusConfig[warning.status].color}`}>
          <StatusIcon size={14} />
          <span>{statusConfig[warning.status].label}</span>
        </div>
      </div>

      <p className="text-gray-900 font-medium leading-relaxed mb-3 line-clamp-2">
        {warning.message}
      </p>

      <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
          {getTechFieldName(warning.techField)}
        </span>
        {warning.provinceId && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            {getProvinceName(warning.provinceId)}
          </span>
        )}
        <span className="ml-auto">{formatDateTime(warning.triggeredAt)}</span>
      </div>
    </div>
  );
}
