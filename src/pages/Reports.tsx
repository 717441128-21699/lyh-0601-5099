import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { FileText, Download, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Lightbulb, Clock, CheckCircle, XCircle, BarChart3 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { getProvinceName, getAgencyName } from '@/data/constants';
import { formatPercent, formatDays, formatNumber, formatDate, formatDateTime, getTrendColor } from '@/utils/formatters';
import type { DiagnosticReport } from '@/types';

export default function Reports() {
  const { reports, loadAllData, isLoaded } = useDataStore();
  const { user } = useAuthStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) loadAllData();
  }, [isLoaded, loadAllData]);

  const filteredReports = useMemo(() => {
    if (!user) return reports;
    if (user.role === 'national') return reports;
    if (user.role === 'provincial' && user.provinceId) {
      return reports.filter((r) => 
        r.scope === 'provincial' && r.scopeId === user.provinceId
      );
    }
    if ((user.role === 'agency' || user.role === 'examiner') && user.agencyId) {
      return reports.filter((r) => 
        r.scope === 'agency' && r.scopeId === user.agencyId
      );
    }
    return reports;
  }, [reports, user]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getScopeLabel = (report: DiagnosticReport) => {
    if (report.scope === 'national') return '全国';
    if (report.scope === 'provincial') return report.scopeId ? getProvinceName(report.scopeId) : '省级';
    if (report.scope === 'agency') return report.scopeId ? getAgencyName(report.scopeId) : '代办处';
    return '';
  };

  const getTrendIcon = (value: number, isPositiveGood = true) => {
    if (value === 0) return <Minus className="w-4 h-4 text-gray-500" />;
    const positive = isPositiveGood ? value > 0 : value < 0;
    const Icon = value > 0 ? TrendingUp : TrendingDown;
    return <Icon className={`w-4 h-4 ${positive ? 'text-accent-success' : 'text-accent-danger'}`} />;
  };

  const exportReport = (report: DiagnosticReport) => {
    const wsData = [
      ['报告标题', report.title],
      ['生成时间', formatDateTime(report.generatedAt)],
      ['报告周期', `${formatDate(report.period.start)} ~ ${formatDate(report.period.end)}`],
      ['报告范围', getScopeLabel(report)],
      [],
      ['关键指标'],
      ['总申请量', formatNumber(report.content.keyMetrics.totalApplications)],
      ['平均审查周期', formatDays(report.content.keyMetrics.avgReviewCycle)],
      ['授权率', formatPercent(report.content.keyMetrics.grantRate)],
      ['驳回率', formatPercent(report.content.keyMetrics.rejectRate)],
      [],
      ['趋势分析'],
      ['审查周期同比', `${report.content.cycleYoY > 0 ? '+' : ''}${report.content.cycleYoY.toFixed(1)}%`],
      ['审查周期环比', `${report.content.cycleMoM > 0 ? '+' : ''}${report.content.cycleMoM.toFixed(1)}%`],
      ['授权率变化', `${report.content.grantRateChange > 0 ? '+' : ''}${report.content.grantRateChange.toFixed(1)}%`],
      [],
      ['优化建议'],
      ...report.content.optimizationSuggestions.map((s, i) => [`建议${i + 1}`, s]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '报告数据');
    XLSX.writeFile(wb, `${report.title}.xlsx`);
  };

  const renderReportDetail = (report: DiagnosticReport) => {
    const pieOption = {
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
          radius: ['40%', '70%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 4,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: 14, fontWeight: 'bold' },
          },
          data: report.content.rejectRateDistribution.map((r) => ({
            value: r.count,
            name: r.reason,
          })),
          color: ['#1B4965', '#3F649E', '#6B89B8', '#9FB3D1', '#F57C00', '#2E7D32', '#C1272D', '#8B5CF6'],
        },
      ],
    };

    return (
      <div className="mt-4 p-5 bg-gray-50 rounded-lg space-y-5 animate-fade-in">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <BarChart3 className="w-4 h-4" />
              <span>总申请量</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">
              {formatNumber(report.content.keyMetrics.totalApplications)}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Clock className="w-4 h-4" />
              <span>平均审查周期</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">
              {formatDays(report.content.keyMetrics.avgReviewCycle)}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <CheckCircle className="w-4 h-4" />
              <span>授权率</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">
              {formatPercent(report.content.keyMetrics.grantRate)}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <XCircle className="w-4 h-4" />
              <span>驳回率</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">
              {formatPercent(report.content.keyMetrics.rejectRate)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <p className="text-sm text-gray-500 mb-2">审查周期同比</p>
            <div className="flex items-center gap-2">
              {getTrendIcon(report.content.cycleYoY, false)}
              <span className={`text-xl font-bold ${getTrendColor(report.content.cycleYoY, false)}`}>
                {report.content.cycleYoY > 0 ? '+' : ''}{report.content.cycleYoY.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <p className="text-sm text-gray-500 mb-2">审查周期环比</p>
            <div className="flex items-center gap-2">
              {getTrendIcon(report.content.cycleMoM, false)}
              <span className={`text-xl font-bold ${getTrendColor(report.content.cycleMoM, false)}`}>
                {report.content.cycleMoM > 0 ? '+' : ''}{report.content.cycleMoM.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <p className="text-sm text-gray-500 mb-2">授权率变化</p>
            <div className="flex items-center gap-2">
              {getTrendIcon(report.content.grantRateChange, true)}
              <span className={`text-xl font-bold ${getTrendColor(report.content.grantRateChange, true)}`}>
                {report.content.grantRateChange > 0 ? '+' : ''}{report.content.grantRateChange.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <h4 className="font-semibold text-gray-800 mb-3">驳回原因分布</h4>
            <ReactECharts option={pieOption} style={{ height: 280 }} />
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <h4 className="font-semibold text-gray-800 mb-3">优化建议</h4>
            <ul className="space-y-3">
              {report.content.optimizationSuggestions.map((suggestion, idx) => (
                <li key={idx} className="flex gap-3 text-sm">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <span className="text-gray-600 leading-relaxed">{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => exportReport(report)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出报告
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">诊断报告</h1>
        <p className="text-gray-500 mt-1">审查效能诊断报告列表与详情</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredReports.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl border border-gray-200 p-12 text-center">
            <FileText size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">暂无权限范围内的报告</p>
          </div>
        ) : (
          filteredReports.map((report) => (
            <div key={report.id} className="card card-hover overflow-hidden">
              <div
                className="p-5 cursor-pointer"
                onClick={() => toggleExpand(report.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 text-lg">{report.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatDate(report.period.start)} ~ {formatDate(report.period.end)}
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <span className="badge badge-info">周报</span>
                        <span className="badge badge-success">{getScopeLabel(report)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">
                      {formatDateTime(report.generatedAt)}
                    </span>
                    {expandedId === report.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
              {expandedId === report.id && renderReportDetail(report)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
