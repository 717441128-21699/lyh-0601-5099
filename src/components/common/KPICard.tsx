import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  color?: string;
  isPositiveGood?: boolean;
}

export default function KPICard({
  title,
  value,
  icon,
  trend,
  trendLabel,
  color = 'primary',
  isPositiveGood = true,
}: KPICardProps) {
  const getTrendIcon = () => {
    if (!trend || trend === 0) return <Minus className="w-4 h-4" />;
    return trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  };

  const getTrendColor = () => {
    if (!trend || trend === 0) return 'text-gray-500';
    const positive = isPositiveGood ? trend > 0 : trend < 0;
    return positive ? 'text-accent-success' : 'text-accent-danger';
  };

  const getTrendText = () => {
    if (!trend || trend === 0) return '持平';
    const sign = trend > 0 ? '+' : '';
    return `${sign}${trend.toFixed(1)}%`;
  };

  const colorMap: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-600',
    success: 'bg-green-50 text-accent-success',
    warning: 'bg-amber-50 text-accent-warning',
    danger: 'bg-red-50 text-accent-danger',
    info: 'bg-blue-50 text-accent-info',
  };

  return (
    <div className="card card-hover p-6 flex items-start justify-between">
      <div className="flex-1">
        <p className="text-sm text-gray-500 mb-2">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
        {trend !== undefined && (
          <div className={cn('flex items-center gap-1 text-sm', getTrendColor())}>
            {getTrendIcon()}
            <span>{getTrendText()}</span>
            {trendLabel && <span className="text-gray-400 ml-1">{trendLabel}</span>}
          </div>
        )}
      </div>
      <div className={cn('p-3 rounded-xl', colorMap[color] || colorMap.primary)}>
        {icon}
      </div>
    </div>
  );
}
