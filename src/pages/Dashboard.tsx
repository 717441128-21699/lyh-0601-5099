import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Clock, CheckCircle, XCircle, AlertTriangle, ChevronRight, Map, Filter, Download, Table, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import KPICard from '@/components/common/KPICard';
import HeatMapChina from '@/components/charts/HeatMapChina';
import TrendLineChart from '@/components/charts/TrendLineChart';
import BarRankChart from '@/components/charts/BarRankChart';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { PROVINCES, TECH_FIELDS, getProvinceName, getTechFieldName, getAgenciesByProvince } from '@/data/constants';
import { formatNumber, formatDays, formatPercent, formatDateTime, formatDate } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import type { Warning, Province } from '@/types';

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
    applications,
  } = useDataStore();

  const [selectedProvince, setSelectedProvince] = useState<string>('all');
  const [selectedTechField, setSelectedTechField] = useState<string>('all');

  useEffect(() => {
    if (!isLoaded) {
      loadAllData();
    }
  }, [isLoaded, loadAllData]);

  useEffect(() => {
    if (user?.role === 'provincial' && user.provinceId) {
      setSelectedProvince(user.provinceId);
    } else if (user?.role === 'agency' || user?.role === 'examiner') {
      setSelectedProvince(user.provinceId || 'all');
    }
  }, [user]);

  const availableProvinces = useMemo(() => {
    if (!user) return PROVINCES;
    if (user.role === 'national') {
      return [{ id: 'all', name: '全国', code: 'ALL', region: 'north' } as unknown as Province, ...PROVINCES];
    }
    if (user.provinceId) {
      return PROVINCES.filter((p) => p.id === user.provinceId);
    }
    return PROVINCES;
  }, [user]);

  const availableTechFields = useMemo(() => {
    return [{ key: 'all', name: '全部领域', color: '#6B7280' }, ...TECH_FIELDS];
  }, []);

  const permissionFilteredApps = useMemo(() => {
    if (!user) return applications;
    if (user.role === 'national') return applications;
    if (user.role === 'provincial' && user.provinceId) {
      return applications.filter((a) => a.provinceId === user.provinceId);
    }
    if ((user.role === 'agency' || user.role === 'examiner') && user.agencyId) {
      return applications.filter((a) => a.agencyId === user.agencyId);
    }
    return applications;
  }, [applications, user]);

  const filteredApps = useMemo(() => {
    let result = permissionFilteredApps;
    if (selectedProvince !== 'all') {
      result = result.filter((a) => a.provinceId === selectedProvince);
    }
    if (selectedTechField !== 'all') {
      result = result.filter((a) => a.techField === selectedTechField);
    }
    return result;
  }, [permissionFilteredApps, selectedProvince, selectedTechField]);

  const aggregatedProvinceMetrics = useMemo(() => {
    const provinceMap: Record<string, {
      totalApplications: number;
      totalCycle: number;
      granted: number;
      rejected: number;
      cycleCount: number;
    }> = {};

    filteredApps.forEach((app) => {
      if (!provinceMap[app.provinceId]) {
        provinceMap[app.provinceId] = {
          totalApplications: 0,
          totalCycle: 0,
          granted: 0,
          rejected: 0,
          cycleCount: 0,
        };
      }
      const existing = provinceMap[app.provinceId];
      
      existing.totalApplications += 1;
      
      if (app.status === 'granted') existing.granted += 1;
      if (app.status === 'rejected') existing.rejected += 1;
      
      const endDate = app.grantDate || app.rejectDate;
      if (endDate) {
        const cycle = Math.max(1, Math.floor(
          (new Date(endDate).getTime() - new Date(app.applyDate).getTime()) / (1000 * 60 * 60 * 24)
        ));
        existing.totalCycle += cycle;
        existing.cycleCount += 1;
      }
    });

    const metrics = Object.keys(provinceMap).map((provinceId) => {
      const stats = provinceMap[provinceId];
      const total = stats.totalApplications || 1;
      const avgCycle = stats.cycleCount > 0 ? stats.totalCycle / stats.cycleCount : 90;
      const efficiency = 0.7 + (avgCycle > 100 ? 0.1 : 0.2);
      return {
        provinceId,
        totalApplications: stats.totalApplications,
        avgReviewCycle: avgCycle,
        grantRate: stats.granted / total,
        rejectRate: stats.rejected / total,
        examinerEfficiency: efficiency,
      };
    });

    return metrics.sort((a, b) => b.totalApplications - a.totalApplications);
  }, [filteredApps]);

  const displayProvinceMetrics = useMemo(() => {
    if (selectedProvince !== 'all' && aggregatedProvinceMetrics.length > 0) {
      return aggregatedProvinceMetrics;
    }
    if (aggregatedProvinceMetrics.length > 0) {
      return aggregatedProvinceMetrics;
    }
    return provinceMetrics;
  }, [aggregatedProvinceMetrics, provinceMetrics, selectedProvince]);

  const filteredWarnings = useMemo(() => {
    let result = warnings;
    if (user) {
      if (user.role === 'provincial' && user.provinceId) {
        result = result.filter((w) => w.provinceId === user.provinceId);
      } else if ((user.role === 'agency' || user.role === 'examiner') && user.agencyId) {
        result = result.filter((w) => w.agencyId === user.agencyId);
      }
    }
    if (selectedProvince !== 'all') {
      result = result.filter((w) => w.provinceId === selectedProvince);
    }
    if (selectedTechField !== 'all') {
      result = result.filter((w) => w.techField === selectedTechField);
    }
    return result;
  }, [warnings, user, selectedProvince, selectedTechField]);

  const filteredDailyTrends = useMemo(() => {
    return dailyTrends.slice(-14).map((trend) => {
      const dayApps = filteredApps.filter((a) => a.applyDate.startsWith(trend.date));
      const grants = dayApps.filter((a) => a.status === 'granted').length;
      const rejections = dayApps.filter((a) => a.status === 'rejected').length;
      const avgCycle = dayApps.length > 0
        ? dayApps.reduce((sum, a) => {
            const start = new Date(a.applyDate);
            const end = a.grantDate || a.rejectDate
              ? new Date(a.grantDate || a.rejectDate!)
              : new Date();
            return sum + Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
          }, 0) / dayApps.length
        : 0;
      
      return {
        ...trend,
        applications: dayApps.length,
        grants,
        rejections,
        avgCycle: Math.round(avgCycle),
      };
    });
  }, [dailyTrends, filteredApps]);

  const techFieldDetailData = useMemo(() => {
    const fieldMap: Record<string, {
      totalApplications: number;
      totalCycle: number;
      granted: number;
      rejected: number;
      cycleCount: number;
    }> = {};

    filteredApps.forEach((app) => {
      const key = app.techField;
      if (!fieldMap[key]) {
        fieldMap[key] = {
          totalApplications: 0,
          totalCycle: 0,
          granted: 0,
          rejected: 0,
          cycleCount: 0,
        };
      }
      const existing = fieldMap[key];
      
      existing.totalApplications += 1;
      if (app.status === 'granted') existing.granted += 1;
      if (app.status === 'rejected') existing.rejected += 1;
      
      const endDate = app.grantDate || app.rejectDate;
      if (endDate) {
        const cycle = Math.max(1, Math.floor(
          (new Date(endDate).getTime() - new Date(app.applyDate).getTime()) / (1000 * 60 * 60 * 24)
        ));
        existing.totalCycle += cycle;
        existing.cycleCount += 1;
      }
    });

    const allAppsForBaseline = permissionFilteredApps.filter(app => 
      selectedProvince === 'all' || app.provinceId === selectedProvince
    );
    
    const baselineMap: Record<string, {
      totalApplications: number;
      totalCycle: number;
      granted: number;
      rejected: number;
      cycleCount: number;
    }> = {};
    
    allAppsForBaseline.forEach((app) => {
      const key = app.techField;
      if (!baselineMap[key]) {
        baselineMap[key] = {
          totalApplications: 0,
          totalCycle: 0,
          granted: 0,
          rejected: 0,
          cycleCount: 0,
        };
      }
      const existing = baselineMap[key];
      existing.totalApplications += 1;
      if (app.status === 'granted') existing.granted += 1;
      if (app.status === 'rejected') existing.rejected += 1;
      const endDate = app.grantDate || app.rejectDate;
      if (endDate) {
        const cycle = Math.max(1, Math.floor(
          (new Date(endDate).getTime() - new Date(app.applyDate).getTime()) / (1000 * 60 * 60 * 24)
        ));
        existing.totalCycle += cycle;
        existing.cycleCount += 1;
      }
    });

    const metrics = TECH_FIELDS
      .filter((field) => fieldMap[field.key])
      .map((field) => {
        const stats = fieldMap[field.key]!;
        const baseline = baselineMap[field.key];
        const total = stats.totalApplications;
        const avgCycle = stats.cycleCount > 0 
          ? stats.totalCycle / stats.cycleCount 
          : 0;
        
        const baselineTotal = baseline?.totalApplications || 1;
        const baselineGrantRate = baseline && baseline.cycleCount > 0 
          ? baseline.granted / baselineTotal 
          : 0;
        const baselineCycle = baseline && baseline.cycleCount > 0 
          ? baseline.totalCycle / baseline.cycleCount 
          : 0;
        
        return {
          id: `metric-${field.key}`,
          techField: field.key,
          provinceId: selectedProvince,
          totalApplications: total,
          avgReviewCycle: avgCycle,
          grantRate: total > 0 ? stats.granted / total : 0,
          rejectRate: total > 0 ? stats.rejected / total : 0,
          period: 'day' as const,
          date: new Date().toISOString().split('T')[0],
          baselineGrantRate,
          baselineCycle,
        };
      });

    return metrics.sort((a, b) => b.grantRate - a.grantRate);
  }, [filteredApps, selectedProvince, permissionFilteredApps]);

  const filteredTechFieldMetrics = useMemo(() => {
    if (selectedTechField === 'all') {
      return techFieldDetailData;
    }
    const selected = techFieldDetailData.find(m => m.techField === selectedTechField);
    if (!selected) return techFieldDetailData;
    
    const selectedIndex = techFieldDetailData.findIndex(m => m.techField === selectedTechField);
    const contextMetrics: typeof techFieldDetailData = [];
    
    if (selectedIndex > 1) contextMetrics.push(techFieldDetailData[selectedIndex - 2]);
    if (selectedIndex > 0) contextMetrics.push(techFieldDetailData[selectedIndex - 1]);
    contextMetrics.push(selected);
    if (selectedIndex < techFieldDetailData.length - 1) contextMetrics.push(techFieldDetailData[selectedIndex + 1]);
    if (selectedIndex < techFieldDetailData.length - 2) contextMetrics.push(techFieldDetailData[selectedIndex + 2]);
    
    return contextMetrics;
  }, [techFieldDetailData, selectedTechField]);

  const filteredReports = useMemo(() => {
    if (!user) return reports;
    if (user.role === 'national') return reports;
    if (user.role === 'provincial' && user.provinceId) {
      return reports.filter((r) => r.scope === 'provincial' && r.scopeId === user.provinceId);
    }
    if ((user.role === 'agency' || user.role === 'examiner') && user.agencyId) {
      return reports.filter((r) => r.scope === 'agency' && r.scopeId === user.agencyId);
    }
    return reports;
  }, [reports, user]);

  const kpiMetrics = useMemo(() => {
    const total = filteredApps.length;
    const granted = filteredApps.filter(a => a.status === 'granted').length;
    const rejected = filteredApps.filter(a => a.status === 'rejected').length;
    
    let totalCycle = 0;
    let cycleCount = 0;
    filteredApps.forEach(app => {
      const endDate = app.grantDate || app.rejectDate;
      if (endDate) {
        const cycle = Math.max(1, Math.floor(
          (new Date(endDate).getTime() - new Date(app.applyDate).getTime()) / (1000 * 60 * 60 * 24)
        ));
        totalCycle += cycle;
        cycleCount += 1;
      }
    });
    
    return {
      totalApplications: total,
      avgReviewCycle: cycleCount > 0 ? totalCycle / cycleCount : 0,
      grantRate: total > 0 ? granted / total : 0,
      rejectRate: total > 0 ? rejected / total : 0,
    };
  }, [filteredApps]);

  const {
    totalApplications,
    avgReviewCycle,
    grantRate: avgGrantRate,
    rejectRate: avgRejectRate,
  } = kpiMetrics;

  const latestReport = filteredReports[0];

  const topWarnings = [...filteredWarnings]
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

  const getCurrentScopeLabel = () => {
    const provinceLabel = selectedProvince === 'all' 
      ? (user?.role === 'national' ? '全国' : getProvinceName(user?.provinceId || ''))
      : getProvinceName(selectedProvince);
    const techLabel = selectedTechField === 'all' ? '全部领域' : getTechFieldName(selectedTechField);
    return `${provinceLabel} - ${techLabel}`;
  };

  const exportWeeklyReport = () => {
    const scopeLabel = getCurrentScopeLabel();
    const today = formatDate(new Date().toISOString().split('T')[0]);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekStartStr = formatDate(weekStart.toISOString().split('T')[0]);

    const wsData: any[][] = [
      ['审查效能诊断周报'],
      [],
      ['报告范围', scopeLabel],
      ['报告周期', `${weekStartStr} ~ ${today}`],
      ['生成时间', formatDateTime(new Date().toISOString())],
      [],
      ['一、关键指标'],
      ['指标', '数值', '环比'],
      ['申请总量', formatNumber(totalApplications), `${avgGrantRate > 0.65 ? '+' : ''}${((avgGrantRate - 0.65) * 100).toFixed(1)}%`],
      ['平均审查周期', formatDays(avgReviewCycle), `${avgReviewCycle > 90 ? '+' : ''}${(avgReviewCycle - 90).toFixed(1)}天`],
      ['授权率', formatPercent(avgGrantRate), `${avgGrantRate > 0.65 ? '+' : ''}${((avgGrantRate - 0.65) * 100).toFixed(1)}%`],
      ['驳回率', formatPercent(avgRejectRate), `${avgRejectRate > 0.15 ? '+' : ''}${((avgRejectRate - 0.15) * 100).toFixed(1)}%`],
      [],
      ['二、各技术领域明细'],
      ['技术领域', '申请量', '授权率', '驳回率', '平均周期', '授权率同比'],
      ...techFieldDetailData.map(m => [
        getTechFieldName(m.techField),
        formatNumber(m.totalApplications),
        formatPercent(m.grantRate),
        formatPercent(m.rejectRate),
        formatDays(m.avgReviewCycle),
        `${((m.grantRate - m.baselineGrantRate) * 100) > 0 ? '+' : ''}${((m.grantRate - m.baselineGrantRate) * 100).toFixed(1)}%`,
      ]),
      [],
      ['三、实时预警'],
      ['级别', '状态', '描述', '触发时间'],
      ...topWarnings.map(w => [
        w.level === 1 ? '高危' : w.level === 2 ? '中危' : '低危',
        w.status === 'pending' ? '待处理' : w.status === 'processing' ? '处理中' : '已解决',
        w.message,
        formatDateTime(w.triggeredAt),
      ]),
      [],
      ['四、优化建议'],
      techFieldDetailData[0]?.grantRate > 0.75 
        ? [`1. ${getTechFieldName(techFieldDetailData[0]?.techField || '')}领域表现优秀，保持当前审查节奏`]
        : [`1. 建议加强${getTechFieldName(techFieldDetailData[techFieldDetailData.length - 1]?.techField || '')}领域的审查力量配置`],
      [`2. 关注平均周期超过100天的领域，优化审查流程`],
      [`3. 定期组织跨领域经验交流，提升整体授权率`],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '周报数据');
    XLSX.writeFile(wb, `审查效能周报_${scopeLabel}_${today.replace(/\//g, '-')}.xlsx`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据看板</h1>
          <p className="text-sm text-gray-500 mt-1">
            欢迎回来，{user?.name} | 今日 {new Date().toLocaleDateString('zh-CN')}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">筛选：</span>
          </div>
          <select
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            className="input text-sm py-2 px-3"
            disabled={availableProvinces.length <= 1}
          >
            {availableProvinces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={selectedTechField}
            onChange={(e) => setSelectedTechField(e.target.value)}
            className="input text-sm py-2 px-3"
          >
            {availableTechFields.map((f) => (
              <option key={f.key} value={f.key}>
                {f.name}
              </option>
            ))}
          </select>
          {(selectedProvince !== 'all' || selectedTechField !== 'all') && (
            <button
              onClick={() => {
                setSelectedProvince(user?.role === 'national' ? 'all' : (user?.provinceId || 'all'));
                setSelectedTechField('all');
              }}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              重置筛选
            </button>
          )}
          <button
            onClick={exportWeeklyReport}
            className="btn btn-primary text-sm py-2 px-4 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出周报
          </button>
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
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedProvince === 'all' 
                  ? (user?.role === 'national' ? '全国' : getProvinceName(user?.provinceId || ''))
                  : getProvinceName(selectedProvince)
                }审查效率热力图
                {selectedTechField !== 'all' && ` - ${getTechFieldName(selectedTechField)}`}
              </h2>
            </div>
          </div>
          <div className="h-[500px]">
            <HeatMapChina
              data={displayProvinceMetrics}
              onProvinceClick={(provinceId) =>
                navigate(`/province/${provinceId}`)
              }
            />
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                技术领域授权率排名
                {selectedTechField !== 'all' && ` - ${getTechFieldName(selectedTechField)}`}
              </h2>
            </div>
            <div className="h-[240px]">
              <BarRankChart data={filteredTechFieldMetrics} />
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
          <h2 className="text-lg font-semibold text-gray-900">
            {selectedProvince === 'all' 
              ? (user?.role === 'national' ? '全国' : getProvinceName(user?.provinceId || ''))
              : getProvinceName(selectedProvince)
            }近14天申请/授权趋势
            {selectedTechField !== 'all' && ` - ${getTechFieldName(selectedTechField)}`}
          </h2>
        </div>
        <div className="h-[300px]">
          <TrendLineChart data={filteredDailyTrends} />
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Table className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              技术领域明细
              <span className="text-sm text-gray-500 ml-2">
                ({getCurrentScopeLabel()})
              </span>
            </h2>
          </div>
          {selectedTechField !== 'all' && (
            <span className="badge badge-primary">
              仅显示：{getTechFieldName(selectedTechField)}
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">技术领域</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">申请量</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">授权率</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">同比</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">驳回率</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">平均周期</th>
              </tr>
            </thead>
            <tbody>
              {(selectedTechField !== 'all' 
                ? techFieldDetailData.filter(m => m.techField === selectedTechField)
                : techFieldDetailData
              ).map((metric, index) => {
                const isSelected = selectedTechField === metric.techField;
                const grantDiff = (metric.grantRate - metric.baselineGrantRate) * 100;
                return (
                  <tr 
                    key={metric.id}
                    className={cn(
                      'border-b border-gray-50 hover:bg-gray-50 transition-colors',
                      isSelected && 'bg-primary-50'
                    )}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-sm w-6">#{index + 1}</span>
                        <span className={cn(
                          'font-medium',
                          isSelected ? 'text-primary-700' : 'text-gray-900'
                        )}>
                          {getTechFieldName(metric.techField)}
                        </span>
                        {isSelected && (
                          <span className="badge badge-primary text-xs">当前选中</span>
                        )}
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 font-medium text-gray-900">
                      {formatNumber(metric.totalApplications)}
                    </td>
                    <td className="text-right py-3 px-4 font-medium">
                      <span className={cn(
                        metric.grantRate >= 0.7 ? 'text-green-600' : 
                        metric.grantRate >= 0.5 ? 'text-amber-600' : 'text-red-600'
                      )}>
                        {formatPercent(metric.grantRate)}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        {grantDiff >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        <span className={grantDiff >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {grantDiff >= 0 ? '+' : ''}{grantDiff.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 text-gray-600">
                      {formatPercent(metric.rejectRate)}
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className={cn(
                        metric.avgReviewCycle <= 80 ? 'text-green-600' : 
                        metric.avgReviewCycle <= 100 ? 'text-amber-600' : 'text-red-600'
                      )}>
                        {formatDays(metric.avgReviewCycle)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {selectedTechField !== 'all' && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                当前仅查看「{getTechFieldName(selectedTechField)}」领域。若需要查看所有领域的同口径对比，请将技术领域筛选器切换为「全部领域」。
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
