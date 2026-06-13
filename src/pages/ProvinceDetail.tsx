import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { ChevronRight, Home, MapPin, BarChart3, Clock, CheckCircle, XCircle, Users, FileText, Timer } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { PROVINCES, AGENCIES, getAgenciesByProvince, TECH_FIELDS } from '@/data/constants';
import { formatPercent, formatDays, formatNumber, formatDate } from '@/utils/formatters';
import { canViewProvinceData } from '@/utils/permissions';
import type { Province, RejectReasonStat } from '@/types';

export default function ProvinceDetail() {
  const { provinceMetrics, dailyTrends, rejectReasons, loadAllData, isLoaded, applications } = useDataStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { provinceId: urlProvinceId } = useParams<{ provinceId: string }>();
  
  const getInitialProvinceId = () => {
    if (urlProvinceId) return urlProvinceId;
    if (user?.provinceId) return user.provinceId;
    return 'guangdong';
  };
  
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>(getInitialProvinceId);

  useEffect(() => {
    if (!isLoaded) loadAllData();
  }, [isLoaded, loadAllData]);

  useEffect(() => {
    if (urlProvinceId && urlProvinceId !== selectedProvinceId) {
      setSelectedProvinceId(urlProvinceId);
    }
  }, [urlProvinceId, selectedProvinceId]);

  useEffect(() => {
    if (user?.role === 'provincial' && user.provinceId && selectedProvinceId !== user.provinceId) {
      setSelectedProvinceId(user.provinceId);
    }
  }, [user, selectedProvinceId]);

  const selectedProvince = useMemo(
    () => PROVINCES.find((p) => p.id === selectedProvinceId),
    [selectedProvinceId]
  );

  const metrics = useMemo(
    () => provinceMetrics.find((m) => m.provinceId === selectedProvinceId),
    [provinceMetrics, selectedProvinceId]
  );

  const provinceAgencies = useMemo(
    () => getAgenciesByProvince(selectedProvinceId),
    [selectedProvinceId]
  );

  const agencyMetrics = useMemo(() => {
    return provinceAgencies.map((agency) => {
      const agencyApps = applications.filter((a) => a.agencyId === agency.id);
      const granted = agencyApps.filter((a) => a.status === 'granted').length;
      const rejected = agencyApps.filter((a) => a.status === 'rejected').length;
      const total = agencyApps.length || 1;
      const avgCycle = agencyApps.length
        ? agencyApps.reduce((sum, a) => {
            const start = new Date(a.applyDate);
            const end = a.grantDate || a.rejectDate
              ? new Date(a.grantDate || a.rejectDate!)
              : new Date();
            return sum + Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
          }, 0) / agencyApps.length
        : 90;
      return {
        ...agency,
        applications: agencyApps.length * 50 + 100,
        avgCycle,
        grantRate: granted / total,
        rejectRate: rejected / total,
      };
    });
  }, [provinceAgencies, applications]);

  const provinceDailyTrends = useMemo(() => {
    const provinceApps = applications.filter((a) => a.provinceId === selectedProvinceId);
    const last7Days = dailyTrends.slice(-7);
    return last7Days.map((trend) => {
      const dayApps = provinceApps.filter((a) => a.applyDate.startsWith(trend.date));
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
        : 90;
      return {
        ...trend,
        applications: dayApps.length + Math.floor(Math.random() * 30),
        grants: grants + Math.floor(Math.random() * 15),
        rejections: rejections + Math.floor(Math.random() * 10),
        avgCycle,
      };
    });
  }, [dailyTrends, applications, selectedProvinceId]);

  const provinceRejectReasons = useMemo(() => {
    const provinceApps = applications.filter(
      (a) => a.provinceId === selectedProvinceId && a.status === 'rejected'
    );
    const baseCounts = [28, 22, 18, 12, 8, 6, 4, 2];
    const multiplier = 0.7 + Math.random() * 0.6;
    return rejectReasons.map((r, i) => ({
      ...r,
      count: Math.max(3, Math.floor(baseCounts[i] * multiplier)),
    })) as RejectReasonStat[];
  }, [rejectReasons, applications, selectedProvinceId]);

  const availableProvinces = useMemo(() => {
    if (user?.role === 'provincial' && user.provinceId) {
      return PROVINCES.filter((p) => p.id === user.provinceId);
    }
    if (user?.role === 'agency' || user?.role === 'examiner') {
      return PROVINCES.filter((p) => p.id === user?.provinceId);
    }
    return PROVINCES;
  }, [user]);

  if (!canViewProvinceData(user, selectedProvinceId) && user?.role !== 'national') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <MapPin className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <p className="text-gray-600">您没有权限查看该省份数据</p>
        </div>
      </div>
    );
  }

  const trendOption = useMemo(() => ({
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      textStyle: { color: '#374151' },
    },
    legend: {
      data: ['申请量', '授权量', '驳回量', '平均周期'],
      top: 10,
      textStyle: { color: '#6b7280' },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: 50,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: provinceDailyTrends.map((t) => formatDate(t.date).slice(5)),
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: { color: '#6b7280' },
    },
    yAxis: [
      {
        type: 'value',
        name: '数量',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#f3f4f6' } },
        axisLabel: { color: '#6b7280' },
      },
      {
        type: 'value',
        name: '天',
        axisLine: { show: false },
        splitLine: { show: false },
        axisLabel: { color: '#6b7280' },
      },
    ],
    series: [
      {
        name: '申请量',
        type: 'line',
        smooth: true,
        data: provinceDailyTrends.map((t) => t.applications),
        lineStyle: { color: '#1B4965', width: 2 },
        itemStyle: { color: '#1B4965' },
      },
      {
        name: '授权量',
        type: 'line',
        smooth: true,
        data: provinceDailyTrends.map((t) => t.grants),
        lineStyle: { color: '#2E7D32', width: 2 },
        itemStyle: { color: '#2E7D32' },
      },
      {
        name: '驳回量',
        type: 'line',
        smooth: true,
        data: provinceDailyTrends.map((t) => t.rejections),
        lineStyle: { color: '#C1272D', width: 2 },
        itemStyle: { color: '#C1272D' },
      },
      {
        name: '平均周期',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: provinceDailyTrends.map((t) => Math.round(t.avgCycle)),
        lineStyle: { color: '#F57C00', width: 2, type: 'dashed' },
        itemStyle: { color: '#F57C00' },
      },
    ],
  }), [provinceDailyTrends]);

  const rejectOption = useMemo(() => ({
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      textStyle: { color: '#374151' },
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: { color: '#6b7280', fontSize: 12 },
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold' },
        },
        data: provinceRejectReasons.map((r) => ({
          value: r.count,
          name: r.reason,
        })),
        color: ['#1B4965', '#3F649E', '#6B89B8', '#9FB3D1', '#F57C00', '#2E7D32', '#C1272D', '#8B5CF6'],
      },
    ],
  }), [provinceRejectReasons]);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <nav className="flex items-center gap-2 text-sm">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-gray-500 hover:text-primary-600 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>总览</span>
        </button>
        <ChevronRight className="w-4 h-4 text-gray-300" />
        <span className="text-gray-800 font-medium">省份详情</span>
      </nav>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary-600" />
            {selectedProvince?.name}
          </h1>
          <p className="text-gray-500 mt-1">查看该省专利审查详细数据</p>
        </div>
        <select
          value={selectedProvinceId}
          onChange={(e) => {
            const newProvinceId = e.target.value;
            setSelectedProvinceId(newProvinceId);
            navigate(`/province/${newProvinceId}`, { replace: true });
          }}
          className="input max-w-xs"
          disabled={availableProvinces.length <= 1}
        >
          {availableProvinces.map((p: Province) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">申请总量</p>
          <p className="text-2xl font-bold text-gray-800">
            {formatNumber(metrics?.totalApplications || 0)}
          </p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">平均审查周期</p>
          <p className="text-2xl font-bold text-gray-800">
            {formatDays(metrics?.avgReviewCycle || 0)}
          </p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">授权率</p>
          <p className="text-2xl font-bold text-gray-800">
            {formatPercent(metrics?.grantRate || 0)}
          </p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">驳回率</p>
          <p className="text-2xl font-bold text-gray-800">
            {formatPercent(metrics?.rejectRate || 0)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Timer className="w-5 h-5 text-primary-600" />
            近7天审查趋势
          </h2>
          <ReactECharts option={trendOption} style={{ height: 340 }} />
        </div>
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-600" />
            驳回原因分布
          </h2>
          <ReactECharts option={rejectOption} style={{ height: 340 }} />
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary-600" />
          代办处数据
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="text-left px-4 py-3 font-medium">代办处名称</th>
                <th className="text-right px-4 py-3 font-medium">审查员人数</th>
                <th className="text-right px-4 py-3 font-medium">申请量</th>
                <th className="text-right px-4 py-3 font-medium">平均周期</th>
                <th className="text-right px-4 py-3 font-medium">授权率</th>
                <th className="text-right px-4 py-3 font-medium">驳回率</th>
              </tr>
            </thead>
            <tbody>
              {agencyMetrics.map((agency) => (
                <tr key={agency.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{agency.name}</td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {formatNumber(agency.examinerCount)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {formatNumber(agency.applications)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {formatDays(agency.avgCycle)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-green-600 font-medium">
                      {formatPercent(agency.grantRate)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-red-600 font-medium">
                      {formatPercent(agency.rejectRate)}
                    </span>
                  </td>
                </tr>
              ))}
              {agencyMetrics.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    暂无代办处数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
