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
  const { 
    staffForecast, 
    staffPlans, 
    loadAllData, 
    isLoaded,
    updateStaffForecast,
    regenerateStaffPlans,
  } = useDataStore();
  const { user } = useAuthStore();
  const [isDragging, setIsDragging] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
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

  const formatMonthKey = (monthStr: string): string => {
    if (!monthStr) return '';
    const trimmed = String(monthStr).trim();
    
    const patterns = [
      /^(\d{4})[-/年\.](\d{1,2})[-/月\.]?/,
      /^(\d{1,2})[-/月\.]?(\d{4})?/,
      /^(\d{4})(\d{2})$/,
    ];
    
    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        let year = match[1];
        let month = match[2];
        if (pattern === patterns[2]) {
          year = match[1];
          month = match[2];
        } else if (pattern === patterns[1] && !match[2]) {
          const currentYear = new Date().getFullYear();
          year = String(currentYear);
          month = match[1];
        }
        const monthNum = String(month).padStart(2, '0');
        if (parseInt(monthNum) >= 1 && parseInt(monthNum) <= 12) {
          return `${year}-${monthNum}`;
        }
      }
    }
    
    return trimmed;
  };

  const parseExcelTargets = (jsonData: Record<string, any>[]): { targets: Record<string, number>; monthKey: string; targetKey: string } | null => {
    if (!jsonData || jsonData.length === 0) return null;
    
    const firstRow = jsonData[0];
    const keys = Object.keys(firstRow);
    
    if (keys.length < 2) return null;
    
    const monthKeywords = ['月份', 'month', 'Month', '日期', 'date', 'Date', '时间', '月', '周期'];
    const targetKeywords = ['目标', 'target', 'Target', '审查量', '计划', 'plan', 'Plan', '数量', '件数', '预期', '预计'];
    
    let monthKey = keys.find(k => monthKeywords.some(kw => k.toLowerCase().includes(kw.toLowerCase())));
    let targetKey = keys.find(k => targetKeywords.some(kw => k.toLowerCase().includes(kw.toLowerCase())));
    
    if (!monthKey) monthKey = keys[0];
    if (!targetKey || targetKey === monthKey) {
      targetKey = keys.find(k => k !== monthKey && 
        (typeof firstRow[k] === 'number' || 
         !isNaN(Number(firstRow[k])) ||
         String(firstRow[k]).match(/^\d+$/))) || keys[1];
    }
    
    const targets: Record<string, number> = {};
    
    for (const row of jsonData) {
      const rawMonth = row[monthKey];
      const rawTarget = row[targetKey];
      
      if (rawMonth === undefined || rawMonth === null || rawTarget === undefined || rawTarget === null) continue;
      
      const monthStr = formatMonthKey(String(rawMonth));
      const targetNum = typeof rawTarget === 'number' ? rawTarget : Number(String(rawTarget).replace(/[^\d.]/g, ''));
      
      if (monthStr && !isNaN(targetNum) && targetNum > 0) {
        targets[monthStr] = Math.round(targetNum);
      }
    }
    
    const sortedMonths = Object.keys(targets).sort();
    if (sortedMonths.length < 2) return null;
    
    return { targets, monthKey, targetKey };
  };

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    setIsParsing(true);
    setParseProgress(0);
    setParseError(null);

    const interval = setInterval(() => {
      setParseProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 150);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const firstSheet = workbook.Sheets[sheetName];
        
        let jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' }) as Record<string, any>[];
        
        if (jsonData.length === 0) {
          jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' }) as any[];
          if (jsonData.length > 1) {
            const headers = jsonData[0] as string[];
            jsonData = jsonData.slice(1).map((row: any[]) => {
              const obj: Record<string, any> = {};
              headers.forEach((h, i) => {
                obj[String(h || `列${i + 1}`)] = row[i];
              });
              return obj;
            });
          }
        }
        
        const result = parseExcelTargets(jsonData);
        
        if (!result || Object.keys(result.targets).length < 2) {
          setParseError(`无法解析目标审查量数据。请确保Excel包含"月份"和"目标审查量"两列，且至少有2个月的数据。\n当前识别：${result?.monthKey || '未识别月份列'} / ${result?.targetKey || '未识别目标列'}`);
          setIsParsing(false);
          clearInterval(interval);
          setParseProgress(100);
          return;
        }
        
        const sortedTargets: Record<string, number> = {};
        Object.keys(result.targets).sort().forEach(key => {
          sortedTargets[key] = result.targets[key];
        });
        
        updateStaffForecast(sortedTargets);
        regenerateStaffPlans();
        
        setTimeout(() => {
          setIsParsing(false);
        }, 500);
        
      } catch (error) {
        setParseError('文件解析失败，请确认是有效的Excel文件（.xlsx/.xls/.csv格式）');
        setIsParsing(false);
      }
    };
    
    reader.onerror = () => {
      setParseError('文件读取失败，请检查文件是否损坏');
      setIsParsing(false);
    };
    
    reader.readAsBinaryString(file);
  }, [updateStaffForecast, regenerateStaffPlans]);

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
    setParseError(null);
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

      {parseError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{parseError}</p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4" />
          Excel格式说明
        </h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 表格需包含「月份」列和「目标审查量」列（支持中英文表头自动识别）</li>
          <li>• 月份格式支持：2024-07、2024年7月、2024/07、202407、7月 等多种格式</li>
          <li>• 目标审查量必须为数字，且至少包含2个月以上的数据</li>
          <li>• 支持 .xlsx / .xls / .csv 格式的表格文件</li>
          <li>• 系统将完全按照表格中的目标审查量计算缺口和招聘方案</li>
        </ul>
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
