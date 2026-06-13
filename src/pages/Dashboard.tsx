import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Clock, CheckCircle, XCircle, AlertTriangle, ChevronRight, Map } from 'lucide-react';
import KPICard from '@/components/common/KPICard';
import HeatMapChina from '@/components/charts/HeatMapChina';
import TrendLineChart from '@/components/charts/TrendLineChart';
import BarRankChart from '@/components/charts/BarRankChart';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { getProvinceName, getTechFieldName } from '@/data/constants';
import { formatNumber, formatDays, formatPercent, formatDateTime } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import type { Warning } from '@/types';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    provinceMetrics,
    warnings,
    dailyTrends,
    techFieldMetrics,
    reports,
    isLoaded,
    loadAllData,
  } = useDataStore();

  useEffect(() => {
    if (!isLoaded) {
      loadAllData();
    }
  }, [isLoaded, loadAllData]);

  const totalApplications = provinceMetrics.reduce((sum, p) => sum + p.totalApplications, 0);
  const avgReviewCycle =
    provinceMetrics.length > 0
      ? provinceMetrics.reduce((sum, p) => sum + p.avgReviewCycle, 0) / provinceMetrics.length
      : 0;
  const avgGrantRate =
    provinceMetrics.length > 0
      ? provinceMetrics.reduce((sum, p) => sum + p.grantRate, 0) / provinceMetrics.length
      : 0;
  const avgRejectRate =
    provinceMetrics.length > 0
      ? provinceMetrics.reduce((sum, p) => sum + p.rejectRate, 0) / provinceMetrics.length
      : 0;

  const latestReport = reports[0];

  const topWarnings = [...warnings]
    .sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime();
    })
    .slice(0, 5);

  const getWarningBadge = (level: Warning['level']) => {
    const badgeMap: Record<number, string> = {
      1: 'badge-danger',
      2: 'badge-warning',
      3: 'badge-info',
    };
    const levelMap: Record<number, string> = {
      1: '高危',
      2: '中危',
      3: '低危',
    };
    return <span className={badgeMap[level]}>{levelMap[level]}</span>;
  };

  const getStatusBadge = (status: Warning['status']) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: '待处理', className: 'badge-danger' },
      processing: { label: '处理中', className: 'badge-warning' },
      resolved: { label: '已解决', className: 'badge-success' },
    };
    const s = statusMap[status];
    return <span className={s.className}>{s.label}</span>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据看板</h1>
          <p className="text-sm text-gray-500 mt-1">
            欢迎回来，{user?.name} | 今日 {new Date().toLocaleDateString('zh-CN')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <KPICard
          title="申请总量"
          value={formatNumber(totalApplications)}
          icon={<FileText className="w-6 h-6" />}
          trend={latestReport?.content.cycleYoY}
          trendLabel="同比"
          color="primary"
        />
        <KPICard
          title="平均审查周期"
          value={formatDays(avgReviewCycle)}
          icon={<Clock className="w-6 h-6" />}
          trend={latestReport?.content.cycleMoM}
          trendLabel="环比"
          color="warning"
          isPositiveGood={false}
        />
        <KPICard
          title="授权率"
          value={formatPercent(avgGrantRate)}
          icon={<CheckCircle className="w-6 h-6" />}
          trend={latestReport?.content.grantRateChange}
          trendLabel="环比"
          color="success"
        />
        <KPICard
          title="驳回率"
          value={formatPercent(avgRejectRate)}
          icon={<XCircle className="w-6 h-6" />}
          trend={-2.1}
          trendLabel="环比"
          color="danger"
          isPositiveGood={false}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Map className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">全国审查效率热力图</h2>
            </div>
          </div>
          <div className="h-[500px]">
            <HeatMapChina
              data={provinceMetrics}
              onProvinceClick={(provinceId) =>
                navigate(`/provinces/${provinceId}`)
              }
            />
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">技术领域授权率排名</h2>
              <button
                onClick={() => navigate('/tech-fields')}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                查看全部 <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="h-[240px]">
              <BarRankChart data={techFieldMetrics} />
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-accent-warning" />
                <h2 className="text-lg font-semibold text-gray-900">实时预警</h2>
              </div>
              <button
                onClick={() => navigate('/warnings')}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                预警中心 <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 max-h-[240px] overflow-y-auto">
              {topWarnings.map((warning) => (
                <div
                  key={warning.id}
                  className={cn(
                    'p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors'
                  )}
                  onClick={() => navigate(`/warnings/${warning.id}`)}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      {getWarningBadge(warning.level)}
                      <span className="text-sm text-gray-500">
                        {getProvinceName(warning.provinceId || '')}
                      </span>
                    </div>
                    {getStatusBadge(warning.status)}
                  </div>
                  <p className="text-sm text-gray-800 line-clamp-2 mb-1.5">
                    {warning.message}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{getTechFieldName(warning.techField)}</span>
                    <span>{formatDateTime(warning.triggeredAt)}</span>
                  </div>
                </div>
              ))}
              {topWarnings.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  暂无预警信息
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">近14天申请/授权趋势</h2>
        </div>
        <div className="h-[300px]">
          <TrendLineChart data={dailyTrends} />
        </div>
      </div>
    </div>
  );
}
