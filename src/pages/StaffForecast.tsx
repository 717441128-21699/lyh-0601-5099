import { useState, useRef, useCallback, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { Upload, FileSpreadsheet, TrendingUp, Users, Calendar, DollarSign, AlertTriangle, CheckCircle, Star, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { TECH_FIELDS } from '@/data/constants';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { canViewForecast } from '@/utils/permissions';
import type { StaffPlan } from '@/types';

export default function StaffForecast() {
  const { staffForecast, staffPlans, loadAllData, isLoaded } = useDataStore();
  const { user } = useAuthStore();
  const [isDragging, setIsDragging] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoaded) loadAllData();
  }, [isLoaded, loadAllData]);

  if (!canViewForecast(user)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <p className="text-gray-600">您没有权限访问此页面</p>
        </div>
      </div>
    );
  }

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    setIsParsing(true);
    setParseProgress(0);

    const interval = setInterval(() => {
      setParseProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsParsing(false);
          try {
            const reader = new FileReader();
            reader.onload = (e) => {
              const data = e.target?.result;
              XLSX.read(data, { type: 'binary' });
            };
            reader.readAsBinaryString(file);
          } catch {
            // ignore parse errors for demo
          }
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.match(/\.(xlsx|xls|csv)$/i)) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const clearFile = () => {
    setFileName(null);
    setParseProgress(0);
    setIsParsing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const chartOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      textStyle: { color: '#374151' },
    },
    legend: {
      data: ['目标量', '预测量', '现有产能'],
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
      data: staffForecast.map((f) => f.month),
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: { color: '#6b7280' },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#f3f4f6' } },
      axisLabel: { color: '#6b7280', formatter: (v: number) => formatNumber(v) },
    },
    series: [
      {
        name: '目标量',
        type: 'line',
        smooth: true,
        data: staffForecast.map((f) => f.targetApplications),
        lineStyle: { color: '#1B4965', width: 2 },
        itemStyle: { color: '#1B4965' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(27,73,101,0.3)' },
              { offset: 1, color: 'rgba(27,73,101,0.02)' },
            ],
          },
        },
      },
      {
        name: '预测量',
        type: 'line',
        smooth: true,
        data: staffForecast.map((f) => f.predictedApplications),
        lineStyle: { color: '#F57C00', width: 2 },
        itemStyle: { color: '#F57C00' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(245,124,0,0.25)' },
              { offset: 1, color: 'rgba(245,124,0,0.02)' },
            ],
          },
        },
      },
      {
        name: '现有产能',
        type: 'line',
        smooth: true,
        data: staffForecast.map((f) => f.currentCapacity),
        lineStyle: { color: '#2E7D32', width: 2 },
        itemStyle: { color: '#2E7D32' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(46,125,50,0.2)' },
              { offset: 1, color: 'rgba(46,125,50,0.02)' },
            ],
          },
        },
      },
    ],
  };

  const renderPlanCard = (plan: StaffPlan) => {
    const techField = TECH_FIELDS.find((t) => t.key === plan.techField);
    return (
      <div key={plan.id} className="card card-hover p-5">
        <div className="flex items-start justify-between mb-3">
          <span className={`badge ${plan.type === 'hire' ? 'badge-info' : 'badge-warning'}`}>
            {plan.type === 'hire' ? '招聘' : '借调'}
          </span>
          <div className="flex items-center gap-1 text-amber-600">
            <Star className="w-4 h-4 fill-current" />
            <span className="font-semibold">{plan.score}</span>
          </div>
        </div>
        <h3 className="font-semibold text-gray-800 mb-3">{techField?.name}</h3>
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Users className="w-4 h-4 text-gray-400" />
            <span>{plan.count}人</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>{plan.startMonth}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            <span>{plan.duration}个月</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <span>{formatCurrency(plan.cost)}</span>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
            <span className="text-gray-600">{plan.effect}</span>
          </div>
          <div className="flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <span className="text-gray-600">{plan.risk}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">人员预测</h1>
        <p className="text-gray-500 mt-1">基于历史数据预测未来审查员需求缺口</p>
      </div>

      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`card p-8 cursor-pointer transition-all duration-300 ${
          isDragging
            ? 'border-primary-500 bg-primary-50 border-2 border-dashed'
            : 'border-2 border-dashed border-gray-200 hover:border-primary-300 hover:bg-gray-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleInputChange}
          className="hidden"
        />
        {fileName ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-800">{fileName}</p>
                {isParsing ? (
                  <div className="flex items-center gap-3 mt-1">
                    <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-600 rounded-full transition-all duration-300"
                        style={{ width: `${parseProgress}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500">{parseProgress}%</span>
                  </div>
                ) : (
                  <p className="text-sm text-green-600 mt-1">解析完成</p>
                )}
              </div>
            </div>
            {!isParsing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            )}
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-primary-600" />
            </div>
            <p className="font-medium text-gray-700 mb-1">拖拽Excel文件到此处，或点击选择文件</p>
            <p className="text-sm text-gray-400">支持 .xlsx, .xls, .csv 格式</p>
          </div>
        )}
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">未来6个月审查员缺口预测</h2>
        <ReactECharts option={chartOption} style={{ height: 360 }} />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">招聘/借调方案对比</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {staffPlans.map(renderPlanCard)}
        </div>
      </div>
    </div>
  );
}
