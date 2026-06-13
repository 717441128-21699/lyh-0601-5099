import type {
  ProvinceMetrics,
  Warning,
  ApprovalFlow,
  DailyTrend,
  RejectReasonStat,
  PatentApplication,
  StaffForecast,
  StaffPlan,
  DiagnosticReport,
  ReviewMetrics,
} from '../types';
import { PROVINCES, TECH_FIELDS, AGENCIES, REJECT_REASONS } from './constants';

const randomBetween = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

const randomInt = (min: number, max: number): number => {
  return Math.floor(randomBetween(min, max + 1));
};

const daysAgo = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

const monthsAhead = (months: number): string => {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const generateProvinceMetrics = (): ProvinceMetrics[] => {
  return PROVINCES.map((p) => ({
    provinceId: p.id,
    totalApplications: randomInt(5000, 50000),
    avgReviewCycle: randomBetween(60, 180),
    grantRate: randomBetween(0.55, 0.85),
    rejectRate: randomBetween(0.08, 0.25),
    examinerEfficiency: randomBetween(0.7, 1.3),
  }));
};

export const generateWarnings = (): Warning[] => {
  return [
    {
      id: 'warn-001',
      level: 1,
      type: 'cycle_exceed',
      techField: 'ai',
      provinceId: 'guangdong',
      metricValue: 240,
      thresholdValue: 180,
      triggeredAt: daysAgo(2),
      status: 'pending',
      message: '广东省人工智能领域连续3个月审查周期超目标33%，需启动审查员调整',
    },
    {
      id: 'warn-002',
      level: 1,
      type: 'grant_rate_drop',
      techField: 'biotechnology',
      provinceId: 'beijing',
      metricValue: 0.48,
      thresholdValue: 0.60,
      triggeredAt: daysAgo(1),
      status: 'processing',
      message: '北京生物医药领域授权率连续下滑20%，需关注审查标准一致性',
      approvalFlowId: 'appr-001',
    },
    {
      id: 'warn-003',
      level: 2,
      type: 'cycle_exceed',
      techField: 'electronics',
      provinceId: 'jiangsu',
      metricValue: 200,
      thresholdValue: 180,
      triggeredAt: daysAgo(5),
      status: 'resolved',
      message: '江苏电子信息领域审查周期超标11%，已完成审查员调配',
      handledBy: 'user-3',
      handledAt: daysAgo(3),
    },
    {
      id: 'warn-004',
      level: 2,
      type: 'grant_rate_drop',
      techField: 'software',
      provinceId: 'shanghai',
      metricValue: 0.55,
      thresholdValue: 0.65,
      triggeredAt: daysAgo(7),
      status: 'pending',
      message: '上海软件算法领域授权率下滑15%，建议加强质量监控',
    },
    {
      id: 'warn-005',
      level: 3,
      type: 'cycle_exceed',
      techField: 'machinery',
      provinceId: 'shandong',
      metricValue: 175,
      thresholdValue: 180,
      triggeredAt: daysAgo(10),
      status: 'resolved',
      message: '山东机械制造领域审查周期接近阈值，需持续关注',
      handledBy: 'user-2',
      handledAt: daysAgo(8),
    },
    {
      id: 'warn-006',
      level: 1,
      type: 'grant_rate_drop',
      techField: 'telecom',
      provinceId: 'zhejiang',
      metricValue: 0.50,
      thresholdValue: 0.62,
      triggeredAt: daysAgo(3),
      status: 'processing',
      message: '浙江通信技术领域授权率下滑19%，审批流程进行中',
      approvalFlowId: 'appr-002',
    },
  ];
};

export const generateApprovalFlows = (): ApprovalFlow[] => {
  return [
    {
      id: 'appr-001',
      warningId: 'warn-002',
      title: '北京生物医药领域审查员调配方案',
      type: 'examiner_reallocation',
      status: 'step2_pending',
      currentStep: 2,
      step1Approval: {
        userId: 'user-4',
        userName: '深圳代办处主任',
        approved: true,
        comment: '情况属实，同意调配方案',
        approvedAt: daysAgo(1),
      },
      proposal: {
        targetAgencyId: 'bj-1',
        techField: 'biotechnology',
        examinerCount: 8,
        estimatedDuration: 90,
        reason: '北京生物医药领域申请量激增，现有审查员缺口明显',
        expectedEffect: '预计审查周期可缩短至150天内，授权率恢复至65%以上',
      },
      createdAt: daysAgo(2),
    },
    {
      id: 'appr-002',
      warningId: 'warn-006',
      title: '浙江通信技术领域人员补充方案',
      type: 'examiner_reallocation',
      status: 'step1_pending',
      currentStep: 1,
      proposal: {
        sourceAgencyId: 'sh-1',
        targetAgencyId: 'zj-1',
        techField: 'telecom',
        examinerCount: 5,
        estimatedDuration: 60,
        reason: '浙江通信技术领域授权率持续下滑，需加强审查力量',
        expectedEffect: '通过借调资深审查员提升审查质量和一致性',
      },
      createdAt: daysAgo(1),
    },
    {
      id: 'appr-003',
      warningId: 'warn-001',
      title: '广东人工智能领域紧急调配方案',
      type: 'examiner_reallocation',
      status: 'step3_pending',
      currentStep: 3,
      step1Approval: {
        userId: 'user-4',
        userName: '深圳代办处主任',
        approved: true,
        comment: 'AI领域积压严重，急需增援',
        approvedAt: daysAgo(4),
      },
      step2Approval: {
        userId: 'user-2',
        userName: '广东省中心主任',
        approved: true,
        comment: '同意调配12人，建议同时启动招聘计划',
        approvedAt: daysAgo(3),
      },
      proposal: {
        targetAgencyId: 'gd-2',
        techField: 'ai',
        examinerCount: 12,
        estimatedDuration: 120,
        reason: '广东AI专利申请量月增30%，审查周期持续超标',
        expectedEffect: '预计3个月内审查周期回归正常水平',
      },
      createdAt: daysAgo(5),
    },
  ];
};

export const generateDailyTrends = (days = 7): DailyTrend[] => {
  const trends: DailyTrend[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    trends.push({
      date: d.toISOString().split('T')[0],
      applications: randomInt(200, 500),
      grants: randomInt(100, 280),
      rejections: randomInt(20, 80),
      avgCycle: randomBetween(90, 150),
    });
  }
  return trends;
};

export const generateRejectReasons = (): RejectReasonStat[] => {
  const total = randomInt(500, 1000);
  const percentages = [0.25, 0.22, 0.15, 0.12, 0.1, 0.08, 0.05, 0.03];
  return REJECT_REASONS.map((reason, i) => ({
    reason,
    count: Math.round(total * percentages[i]),
    percentage: percentages[i],
  }));
};

export const generateRecentApplications = (): PatentApplication[] => {
  const statuses: PatentApplication['status'][] = ['pending', 'examining', 'granted', 'rejected'];
  const titles = [
    '基于深度学习的图像识别方法及装置',
    '新型生物催化剂的制备方法',
    '5G通信基站智能调度系统',
    '高效能动力电池管理系统',
    '工业机器人轨迹规划算法',
    '半导体芯片封装结构',
    '区块链存证系统及方法',
    '新能源汽车电机控制装置',
    '智能医疗影像诊断系统',
    '物联网传感器网络协议',
  ];
  const applicantNames = [
    '华为技术有限公司',
    '清华大学',
    '比亚迪股份有限公司',
    '中国科学院',
    '腾讯科技有限公司',
    '浙江大学',
    '小米科技有限公司',
    '个人申请人',
    '国家电网公司',
  ];

  return Array.from({ length: 20 }, (_, i) => {
    const status = statuses[randomInt(0, 3)];
    const applyDate = daysAgo(randomInt(30, 180));
    let grantDate: string | undefined;
    let rejectDate: string | undefined;
    let firstOfficeActionDate: string | undefined;
    let rejectReason: string | undefined;

    if (status === 'granted') {
      firstOfficeActionDate = daysAgo(randomInt(15, 60));
      grantDate = daysAgo(randomInt(1, 14));
    } else if (status === 'rejected') {
      firstOfficeActionDate = daysAgo(randomInt(15, 60));
      rejectDate = daysAgo(randomInt(1, 14));
      rejectReason = REJECT_REASONS[randomInt(0, REJECT_REASONS.length - 1)];
    } else if (status === 'examining') {
      firstOfficeActionDate = daysAgo(randomInt(5, 30));
    }

    return {
      id: `app-${String(i + 1).padStart(4, '0')}`,
      applicationNo: `CN2025${String(randomInt(1000000, 9999999))}`,
      title: titles[i % titles.length],
      techField: TECH_FIELDS[randomInt(0, TECH_FIELDS.length - 1)].key,
      applicantType: ['enterprise', 'university', 'research', 'individual', 'government'][
        randomInt(0, 4)
      ] as PatentApplication['applicantType'],
      applicantName: applicantNames[randomInt(0, applicantNames.length - 1)],
      provinceId: PROVINCES[randomInt(0, PROVINCES.length - 1)].id,
      agencyId: AGENCIES[randomInt(0, AGENCIES.length - 1)].id,
      applyDate,
      firstOfficeActionDate,
      grantDate,
      rejectDate,
      rejectReason,
      status,
      annualFeePaid: status === 'granted' ? Math.random() > 0.2 : false,
      examiner: `审查员${String.fromCharCode(65 + randomInt(0, 25))}`,
    };
  });
};

export const generateStaffForecast = (): StaffForecast[] => {
  const forecast: StaffForecast[] = [];
  for (let i = 0; i < 6; i++) {
    const target = randomInt(8000, 12000);
    const predicted = Math.round(target * randomBetween(0.9, 1.2));
    const capacity = randomInt(7000, 10000);
    const gap = predicted - capacity;
    forecast.push({
      month: monthsAhead(i),
      targetApplications: target,
      predictedApplications: predicted,
      currentCapacity: capacity,
      gap,
      recommendedHire: gap > 0 ? Math.ceil(gap / 150) : 0,
      recommendedBorrow: gap > 0 ? Math.ceil(gap / 200) : 0,
    });
  }
  return forecast;
};

export const generateStaffPlans = (): StaffPlan[] => {
  return [
    {
      id: 'plan-001',
      type: 'hire',
      techField: 'ai',
      count: 15,
      startMonth: monthsAhead(1),
      duration: 36,
      cost: 1800000,
      effect: '可完全覆盖AI领域审查缺口，建立长期人才储备',
      risk: '招聘周期长（3-6个月），培训期需3个月',
      score: 85,
    },
    {
      id: 'plan-002',
      type: 'borrow',
      techField: 'ai',
      count: 10,
      startMonth: monthsAhead(0),
      duration: 6,
      cost: 600000,
      effect: '1个月内可到位，快速缓解审查压力',
      risk: '人员稳定性差，期满后需重新调配',
      score: 78,
    },
    {
      id: 'plan-003',
      type: 'hire',
      techField: 'biotechnology',
      count: 8,
      startMonth: monthsAhead(1),
      duration: 36,
      cost: 960000,
      effect: '满足生物医药领域中长期需求',
      risk: '专业人才稀缺，招聘难度较大',
      score: 72,
    },
    {
      id: 'plan-004',
      type: 'borrow',
      techField: 'biotechnology',
      count: 5,
      startMonth: monthsAhead(0),
      duration: 4,
      cost: 300000,
      effect: '短期快速补充，应急效果好',
      risk: '借调人员对本地业务需熟悉期',
      score: 80,
    },
  ];
};

export const generateDiagnosticReports = (): DiagnosticReport[] => {
  const now = new Date();
  const scopes: DiagnosticReport['scope'][] = ['national', 'provincial', 'agency'];
  return Array.from({ length: 4 }, (_, i) => {
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() - i * 7);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6);
    return {
      id: `report-${String(202524 - i)}`,
      title: `第${24 - i}周审查效能诊断报告`,
      type: 'weekly' as const,
      period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      },
      scope: i === 0 ? 'national' : scopes[i % 3],
      scopeId: i === 1 ? 'guangdong' : i === 2 ? 'gd-2' : undefined,
      content: {
        cycleYoY: randomBetween(-15, 5),
        cycleMoM: randomBetween(-8, 3),
        grantRateChange: randomBetween(-5, 3),
        rejectRateDistribution: generateRejectReasons(),
        keyMetrics: {
          totalApplications: randomInt(20000, 35000),
          avgReviewCycle: randomBetween(100, 140),
          grantRate: randomBetween(0.62, 0.78),
          rejectRate: randomBetween(0.1, 0.2),
        },
        optimizationSuggestions: [
          '建议增加人工智能领域审查员配置，当前积压案件较多',
          '优化生物医药领域审查流程，引入专业化分组机制',
          '加强对代办处审查质量的抽检频次，提升授权一致性',
          '推进智能化辅助审查工具应用，提高人均审查效率',
        ],
      },
      generatedAt: endDate.toISOString(),
    };
  });
};

export const generateTechFieldMetrics = (): ReviewMetrics[] => {
  return TECH_FIELDS.map((f) => ({
    id: `metric-${f.key}`,
    techField: f.key,
    provinceId: 'all',
    totalApplications: randomInt(2000, 15000),
    avgReviewCycle: randomBetween(80, 200),
    grantRate: randomBetween(0.5, 0.85),
    rejectRate: randomBetween(0.08, 0.28),
    period: 'month',
    date: new Date().toISOString(),
  }));
};
