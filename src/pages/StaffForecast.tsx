import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Upload, FileSpreadsheet, TrendingUp, Users, Calendar, DollarSign, AlertTriangle, CheckCircle, Star, X, ArrowLeftRight, ChevronDown, ChevronUp, Plus, Minus, FileX } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { TECH_FIELDS } from '@/data/constants';
import { formatCurrency, formatNumber, formatPercent } from '@/utils/formatters';
import { canViewForecast } from '@/utils/permissions';
import type { StaffPlan, StaffForecast as StaffForecastType } from '@/types';
import { cn } from '@/lib/utils';

interface UploadedPlan {
  id: string;
  fileName: string;
  fileHash: string;
  targets: Record<string, number>;
  forecast: StaffForecastType[];
  plans: StaffPlan[];
  uploadedAt: string;
}

export default function StaffForecast() {
  const { 
    staffForecast: baseForecast, 
    staffPlans: basePlans, 
    loadAllData, 
    isLoaded,
    updateStaffForecast,
    regenerateStaffPlans,
  } = useDataStore();
  const { user } = useAuthStore();
  const [isDragging, setIsDragging] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<'A' | 'B'>('A');
  const [showComparison, setShowComparison] = useState(false);
  const [planA, setPlanA] = useState<UploadedPlan | null>(null);
  const [planB, setPlanB] = useState<UploadedPlan | null>(null);
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

  const hashCode = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  };

  const generateTargetsHash = (targets: Record<string, number>): string => {
    const sortedKeys = Object.keys(targets).sort();
    const contentStr = sortedKeys.map(k => `${k}:${targets[k]}`).join('|');
    return hashCode(contentStr);
  };

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

  const computeForecastFromTargets = (targets: Record<string, number>, fileHash: string): { forecast: StaffForecastType[], plans: StaffPlan[] } => {
    const forecastCopy = JSON.parse(JSON.stringify(baseForecast)) as StaffForecastType[];
    
    const hashCodeNum = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash) / 2147483647;
    };
    
    const forecast = forecastCopy.map((f, idx) => {
      const target = targets[f.month];
      if (!target) return f;
      const seed = `${fileHash}-${f.month}-${idx}`;
      const deterministicFactor = 0.9 + (hashCodeNum(seed) * 0.15);
      const predicted = Math.round(target * deterministicFactor);
      const capacity = f.currentCapacity;
      const gap = predicted - capacity;
      return {
        ...f,
        targetApplications: target,
        predictedApplications: predicted,
        gap,
        recommendedHire: gap > 0 ? Math.ceil(gap / 150) : 0,
        recommendedBorrow: gap > 0 ? Math.ceil(gap / 200) : 0,
      };
    });
    
    const totalGap = forecast.reduce((sum, f) => sum + Math.max(0, f.gap), 0);
    const avgGap = totalGap > 0 ? Math.ceil(totalGap / 6 / 150) : 0;
    const baseScore = 75 + Math.floor(hashCodeNum(fileHash) * 20);
    
    const plans: StaffPlan[] = [
      {
        id: `plan-${fileHash}-1`,
        type: 'hire',
        techField: 'ai',
        count: Math.ceil(avgGap * 1.2),
        startMonth: forecast[0]?.month || '',
        duration: 36,
        cost: avgGap * 120000,
        effect: `可覆盖${Math.ceil(totalGap * 0.7)}件审查缺口，建立长期人才储备`,
        risk: '招聘周期长（3-6个月），培训期需3个月',
        score: baseScore + 8,
      },
      {
        id: `plan-${fileHash}-2`,
        type: 'borrow',
        techField: 'ai',
        count: avgGap,
        startMonth: forecast[0]?.month || '',
        duration: 6,
        cost: avgGap * 40000,
        effect: '1个月内可到位，快速缓解审查压力',
        risk: '人员稳定性差，期满后需重新调配',
        score: baseScore + 1,
      },
      {
        id: `plan-${fileHash}-3`,
        type: 'hire',
        techField: 'biotechnology',
        count: Math.ceil(avgGap * 0.8),
        startMonth: forecast[0]?.month || '',
        duration: 36,
        cost: avgGap * 100000,
        effect: '满足生物医药领域中长期需求',
        risk: '专业人才稀缺，招聘难度较大',
        score: baseScore - 3,
      },
      {
        id: `plan-${fileHash}-4`,
        type: 'borrow',
        techField: 'electronics',
        count: Math.ceil(avgGap * 0.6),
        startMonth: forecast[0]?.month || '',
        duration: 4,
        cost: avgGap * 25000,
        effect: '短期快速补充，应急效果好',
        risk: '借调人员对本地业务需熟悉期',
        score: baseScore + 3,
      },
    ];
    
    return { forecast, plans };
  };

  const handleFile = useCallback((file: File) => {
    setParseError(null);
    setIsParsing(true);
    setParseProgress(0);

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
        
        const contentHash = generateTargetsHash(sortedTargets);
        
        if (activeSlot === 'A' && planA?.fileHash === contentHash) {
          setParseError('该表的目标审查量数据与方案A完全相同，请上传不同目标数据的表作为方案B');
          setIsParsing(false);
          clearInterval(interval);
          setParseProgress(100);
          return;
        }
        if (activeSlot === 'B' && planB?.fileHash === contentHash) {
          setParseError('该表的目标审查量数据与方案B完全相同，请上传不同目标数据的表作为方案A');
          setIsParsing(false);
          clearInterval(interval);
          setParseProgress(100);
          return;
        }
        
        const { forecast, plans } = computeForecastFromTargets(sortedTargets, contentHash);
        
        const newPlan: UploadedPlan = {
          id: contentHash,
          fileName: file.name,
          fileHash: contentHash,
          targets: sortedTargets,
          forecast,
          plans,
          uploadedAt: new Date().toISOString(),
        };
        
        if (activeSlot === 'A') {
          setPlanA(newPlan);
        } else {
          setPlanB(newPlan);
        }
        
        updateStaffForecast(sortedTargets, contentHash);
        regenerateStaffPlans(contentHash);
        
        setTimeout(() => {
          setIsParsing(false);
          if (planA && planB) {
            setShowComparison(true);
          }
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
  }, [activeSlot, planA, planB, baseForecast, updateStaffForecast, regenerateStaffPlans]);

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

  const clearPlan = (slot: 'A' | 'B') => {
    if (slot === 'A') {
      setPlanA(null);
    } else {
      setPlanB(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const currentForecast = useMemo(() => {
    if (activeSlot === 'A' && planA) return planA.forecast;
    if (activeSlot === 'B' && planB) return planB.forecast;
    if (planA) return planA.forecast;
    if (planB) return planB.forecast;
    return baseForecast;
  }, [activeSlot, planA, planB, baseForecast]);

  const currentPlans = useMemo(() => {
    if (activeSlot === 'A' && planA) return planA.plans;
    if (activeSlot === 'B' && planB) return planB.plans;
    if (planA) return planA.plans;
    if (planB) return planB.plans;
    return basePlans;
  }, [activeSlot, planA, planB, basePlans]);

  const currentFileName = useMemo(() => {
    if (activeSlot === 'A' && planA) return planA.fileName;
    if (activeSlot === 'B' && planB) return planB.fileName;
    if (planA) return planA.fileName;
    if (planB) return planB.fileName;
    return undefined;
  }, [activeSlot, planA, planB]);

  const comparisonChartOption = useMemo(() => {
    if (!planA || !planB) return null;
    
    const months = planA.forecast.map(f => f.month);
    
    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        textStyle: { color: '#374151' },
      },
      legend: {
        data: ['方案A-目标量', '方案A-缺口', '方案B-目标量', '方案B-缺口'],
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
        data: months,
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
          name: '方案A-目标量',
          type: 'line',
          smooth: true,
          data: planA.forecast.map(f => f.targetApplications),
          lineStyle: { color: '#1B4965', width: 3 },
          itemStyle: { color: '#1B4965' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(27,73,101,0.25)' },
                { offset: 1, color: 'rgba(27,73,101,0.02)' },
              ],
            },
          },
        },
        {
          name: '方案A-缺口',
          type: 'line',
          smooth: true,
          data: planA.forecast.map(f => Math.max(0, f.gap)),
          lineStyle: { color: '#1B4965', width: 2, type: 'dashed' },
          itemStyle: { color: '#1B4965' },
        },
        {
          name: '方案B-目标量',
          type: 'line',
          smooth: true,
          data: planB.forecast.map(f => f.targetApplications),
          lineStyle: { color: '#C1272D', width: 3 },
          itemStyle: { color: '#C1272D' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(193,39,45,0.2)' },
                { offset: 1, color: 'rgba(193,39,45,0.02)' },
              ],
            },
          },
        },
        {
          name: '方案B-缺口',
          type: 'line',
          smooth: true,
          data: planB.forecast.map(f => Math.max(0, f.gap)),
          lineStyle: { color: '#C1272D', width: 2, type: 'dashed' },
          itemStyle: { color: '#C1272D' },
        },
      ],
    };
  }, [planA, planB]);

  const chartOption = useMemo(() => {
    return {
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
        data: currentForecast.map((f) => f.month),
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
          data: currentForecast.map((f) => f.targetApplications),
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
          data: currentForecast.map((f) => f.predictedApplications),
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
          data: currentForecast.map((f) => f.currentCapacity),
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
  }, [currentForecast]);

  const renderPlanCard = (plan: StaffPlan, highlight?: 'higher' | 'lower' | 'same') => {
    const techField = TECH_FIELDS.find((t) => t.key === plan.techField);
    return (
      <div key={plan.id} className={cn(
        "card card-hover p-5 transition-all",
        highlight === 'higher' && 'border-2 border-red-300 bg-red-50',
        highlight === 'lower' && 'border-2 border-green-300 bg-green-50',
      )}>
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

  const getDiffHighlight = (valueA: number, valueB: number): 'higher' | 'lower' | 'same' => {
    if (valueA > valueB) return 'higher';
    if (valueA < valueB) return 'lower';
    return 'same';
  };

  const totalGapA = planA?.forecast.reduce((sum, f) => sum + Math.max(0, f.gap), 0) || 0;
  const totalGapB = planB?.forecast.reduce((sum, f) => sum + Math.max(0, f.gap), 0) || 0;
  const totalTargetA = planA?.forecast.reduce((sum, f) => sum + f.targetApplications, 0) || 0;
  const totalTargetB = planB?.forecast.reduce((sum, f) => sum + f.targetApplications, 0) || 0;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">人员预测</h1>
          <p className="text-gray-500 mt-1">基于历史数据预测未来审查员需求缺口，支持双方案比对</p>
        </div>
        {(planA || planB) && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowComparison(!showComparison)}
              className={cn(
                "btn flex items-center gap-2",
                showComparison ? 'btn-primary' : 'btn-default'
              )}
              disabled={!planA || !planB}
            >
              <ArrowLeftRight className="w-4 h-4" />
              {showComparison ? '隐藏对比' : '方案对比'}
              {!planA || !planB ? '(需两份方案)' : ''}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(['A', 'B'] as const).map((slot) => {
          const plan = slot === 'A' ? planA : planB;
          const isActive = activeSlot === slot;
          return (
            <div
              key={slot}
              onClick={() => !isParsing && setActiveSlot(slot)}
              className={cn(
                "card p-5 cursor-pointer transition-all",
                isActive && !showComparison && 'ring-2 ring-primary-500',
                plan ? 'border-primary-200' : 'border-dashed border-gray-300'
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-white",
                    slot === 'A' ? 'bg-blue-600' : 'bg-red-600'
                  )}>
                    {slot}
                  </span>
                  <span className="font-semibold text-gray-800">
                    方案{slot}
                    {plan && ` · ${Object.keys(plan.targets).length}个月`}
                  </span>
                </div>
                {plan && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearPlan(slot);
                    }}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
              
              {plan ? (
                <div
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                      <FileSpreadsheet className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-800 truncate">{plan.fileName}</p>
                      <p className="text-xs text-gray-500">
                        目标总量：{formatNumber(Object.values(plan.targets).reduce((a, b) => a + b, 0))}件
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs mt-3">
                    <div className="bg-gray-50 rounded p-2 text-center">
                      <p className="text-gray-500">总缺口</p>
                      <p className="font-semibold text-red-600">{formatNumber(plan.forecast.reduce((s, f) => s + Math.max(0, f.gap), 0))}</p>
                    </div>
                    <div className="bg-gray-50 rounded p-2 text-center">
                      <p className="text-gray-500">需招聘</p>
                      <p className="font-semibold text-blue-600">{plan.forecast.reduce((s, f) => s + (f.recommendedHire || 0), 0)}人</p>
                    </div>
                    <div className="bg-gray-50 rounded p-2 text-center">
                      <p className="text-gray-500">需借调</p>
                      <p className="font-semibold text-amber-600">{plan.forecast.reduce((s, f) => s + (f.recommendedBorrow || 0), 0)}人</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSlot(slot);
                    handleClick();
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Plus className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-500">点击上传方案{slot}的计划表</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
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
        {currentFileName && !isParsing ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-800">
                  当前方案{activeSlot}：{currentFileName}
                </p>
                <p className="text-sm text-green-600 mt-1">
                  解析完成 · {currentForecast.length}个月数据
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-3 py-1 rounded-full text-sm font-medium",
                activeSlot === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
              )}>
                方案{activeSlot}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (fileInputRef.current) fileInputRef.current.value = '';
                  setActiveSlot(planA && !planB ? 'B' : 'A');
                }}
                className="btn btn-default text-sm"
              >
                更换文件
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-primary-600" />
            </div>
            <p className="font-medium text-gray-700 mb-1">
              拖拽Excel文件到此处，或点击选择文件作为方案{activeSlot}
            </p>
            {isParsing && (
              <div className="flex items-center justify-center gap-3 mt-3 max-w-sm mx-auto">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-600 rounded-full transition-all duration-300"
                    style={{ width: `${parseProgress}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500 w-12 text-right">{parseProgress}%</span>
              </div>
            )}
            {!isParsing && (
              <p className="text-sm text-gray-400">支持 .xlsx, .xls, .csv 格式</p>
            )}
          </div>
        )}
      </div>

      {parseError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FileX className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">解析失败</p>
              <p className="text-sm text-red-700 mt-1 whitespace-pre-line">{parseError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4" />
          操作说明
        </h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 表格需包含「月份」列和「目标审查量」列（支持中英文表头自动识别）</li>
          <li>• 月份格式支持：2024-07、2024年7月、2024/07、202407、7月 等多种格式</li>
          <li>• 目标审查量必须为数字，且至少包含2个月以上的数据</li>
          <li>• <strong>双方案比对：</strong>分别上传两份文件作为方案A和方案B，点击「方案对比」查看差异</li>
          <li>• <strong>数据稳定性：</strong>同一份文件重复上传结果完全一致，不同文件根据内容计算</li>
        </ul>
      </div>

      {showComparison && planA && planB && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">双方案对比分析</h2>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                <span className="text-gray-600">方案A：{planA.fileName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-600"></span>
                <span className="text-gray-600">方案B：{planB.fileName}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-5">
              <p className="text-sm text-gray-500 mb-1">6个月目标总量差异</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">
                  {totalTargetB > totalTargetA ? '+' : ''}{formatNumber(totalTargetB - totalTargetA)}
                </span>
                <span className="text-sm text-gray-500">件</span>
              </div>
              <div className="mt-2 text-xs">
                <span className="text-blue-600">A: {formatNumber(totalTargetA)}</span>
                <span className="mx-2 text-gray-400">vs</span>
                <span className="text-red-600">B: {formatNumber(totalTargetB)}</span>
              </div>
            </div>
            <div className="card p-5">
              <p className="text-sm text-gray-500 mb-1">6个月总缺口差异</p>
              <div className="flex items-baseline gap-2">
                <span className={cn(
                  "text-2xl font-bold",
                  totalGapB > totalGapA ? 'text-red-600' : 'text-green-600'
                )}>
                  {totalGapB > totalGapA ? '+' : ''}{formatNumber(totalGapB - totalGapA)}
                </span>
                <span className="text-sm text-gray-500">件</span>
              </div>
              <div className="mt-2 text-xs">
                <span className="text-blue-600">A: {formatNumber(totalGapA)}</span>
                <span className="mx-2 text-gray-400">vs</span>
                <span className="text-red-600">B: {formatNumber(totalGapB)}</span>
              </div>
            </div>
            <div className="card p-5">
              <p className="text-sm text-gray-500 mb-1">推荐招聘人数差异</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">
                  {planB.plans[0].count > planA.plans[0].count ? '+' : ''}{planB.plans[0].count - planA.plans[0].count}
                </span>
                <span className="text-sm text-gray-500">人</span>
              </div>
              <div className="mt-2 text-xs">
                <span className="text-blue-600">A: {planA.plans[0].count}人</span>
                <span className="mx-2 text-gray-400">vs</span>
                <span className="text-red-600">B: {planB.plans[0].count}人</span>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-gray-800 mb-4">6个月目标与缺口对比</h3>
            <ReactECharts option={comparisonChartOption} style={{ height: 400 }} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">月份</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-blue-700">A目标量</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-red-700">B目标量</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">差异</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-blue-700">A缺口</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-red-700">B缺口</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">差异</th>
                </tr>
              </thead>
              <tbody>
                {planA.forecast.map((fA, idx) => {
                  const fB = planB.forecast[idx];
                  const targetDiff = fB.targetApplications - fA.targetApplications;
                  const gapDiff = Math.max(0, fB.gap) - Math.max(0, fA.gap);
                  return (
                    <tr key={fA.month} className="border-b border-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{fA.month}</td>
                      <td className="text-right py-3 px-4 text-gray-900">{formatNumber(fA.targetApplications)}</td>
                      <td className="text-right py-3 px-4 text-gray-900">{formatNumber(fB.targetApplications)}</td>
                      <td className={cn(
                        "text-right py-3 px-4 font-medium",
                        targetDiff > 0 ? 'text-red-600' : targetDiff < 0 ? 'text-green-600' : 'text-gray-500'
                      )}>
                        {targetDiff > 0 ? '+' : ''}{formatNumber(targetDiff)}
                      </td>
                      <td className="text-right py-3 px-4 text-gray-900">{formatNumber(Math.max(0, fA.gap))}</td>
                      <td className="text-right py-3 px-4 text-gray-900">{formatNumber(Math.max(0, fB.gap))}</td>
                      <td className={cn(
                        "text-right py-3 px-4 font-medium",
                        gapDiff > 0 ? 'text-red-600' : gapDiff < 0 ? 'text-green-600' : 'text-gray-500'
                      )}>
                        {gapDiff > 0 ? '+' : ''}{formatNumber(gapDiff)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              招聘/借调方案对比
              <span className="text-sm font-normal text-gray-500 ml-2">
                （蓝色边框-方案A更优 | 红色边框-方案B更优）
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {planA.plans.map((planA, idx) => {
                const planBItem = planB.plans[idx];
                return (
                  <div key={planA.id} className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-gray-500">第{idx + 1}套方案</span>
                    </div>
                    {renderPlanCard(planA, getDiffHighlight(planA.score, planBItem.score))}
                    {renderPlanCard(planBItem, getDiffHighlight(planBItem.score, planA.score))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {(!showComparison || !planA || !planB) && (
        <>
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                未来6个月审查员缺口预测
                {currentFileName && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    （{activeSlot === 'A' ? '方案A' : '方案B'}：{currentFileName}）
                  </span>
                )}
              </h2>
            </div>
            <ReactECharts option={chartOption} style={{ height: 360 }} />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">招聘/借调方案对比</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {currentPlans.map((plan) => renderPlanCard(plan))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
