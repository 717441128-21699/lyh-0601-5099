import { create } from 'zustand';
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
  ReallocationProposal,
} from '../types';
import {
  generateProvinceMetrics,
  generateWarnings,
  generateApprovalFlows,
  generateDailyTrends,
  generateRejectReasons,
  generateRecentApplications,
  generateStaffForecast,
  generateStaffPlans,
  generateDiagnosticReports,
  generateTechFieldMetrics,
} from '../data/mockData';
import { TECH_FIELDS, getAgencyName, getTechFieldName } from '../data/constants';

interface DataState {
  provinceMetrics: ProvinceMetrics[];
  warnings: Warning[];
  approvalFlows: ApprovalFlow[];
  dailyTrends: DailyTrend[];
  rejectReasons: RejectReasonStat[];
  applications: PatentApplication[];
  staffForecast: StaffForecast[];
  staffPlans: StaffPlan[];
  reports: DiagnosticReport[];
  techFieldMetrics: ReviewMetrics[];
  isLoaded: boolean;

  loadAllData: () => void;
  updateWarningStatus: (id: string, status: Warning['status']) => void;
  approveStep: (flowId: string, step: 1 | 2 | 3, userId: string, userName: string, comment: string, approved: boolean) => void;
  createApprovalFlow: (warningId: string, proposal: ReallocationProposal) => string;
  updateWarningApprovalFlowId: (warningId: string, approvalFlowId: string) => void;
  updateStaffForecast: (targets: Record<string, number>) => void;
  regenerateStaffPlans: () => void;
}

export const useDataStore = create<DataState>((set) => ({
  provinceMetrics: [],
  warnings: [],
  approvalFlows: [],
  dailyTrends: [],
  rejectReasons: [],
  applications: [],
  staffForecast: [],
  staffPlans: [],
  reports: [],
  techFieldMetrics: [],
  isLoaded: false,

  loadAllData: () => {
    set({
      provinceMetrics: generateProvinceMetrics(),
      warnings: generateWarnings(),
      approvalFlows: generateApprovalFlows(),
      dailyTrends: generateDailyTrends(14),
      rejectReasons: generateRejectReasons(),
      applications: generateRecentApplications(),
      staffForecast: generateStaffForecast(),
      staffPlans: generateStaffPlans(),
      reports: generateDiagnosticReports(),
      techFieldMetrics: generateTechFieldMetrics(),
      isLoaded: true,
    });
  },

  updateWarningStatus: (id, status) => {
    set((state) => ({
      warnings: state.warnings.map((w) =>
        w.id === id ? { ...w, status } : w
      ),
    }));
  },

  approveStep: (flowId, step, userId, userName, comment, approved) => {
    set((state) => {
      const updatedFlows = state.approvalFlows.map((flow) => {
        if (flow.id !== flowId) return flow;

        const record = {
          userId,
          userName,
          approved,
          comment,
          approvedAt: new Date().toISOString(),
        };

        let newStatus = flow.status;
        let newCurrentStep = flow.currentStep;

        if (approved) {
          if (step === 1) {
            newStatus = 'step2_pending';
            newCurrentStep = 2;
          } else if (step === 2) {
            newStatus = 'step3_pending';
            newCurrentStep = 3;
          } else if (step === 3) {
            newStatus = 'approved';
            newCurrentStep = 3;
          }
        } else {
          newStatus = 'rejected';
        }

        const updates: Partial<ApprovalFlow> = {
          status: newStatus,
          currentStep: newCurrentStep,
        };

        if (step === 1) updates.step1Approval = record;
        if (step === 2) updates.step2Approval = record;
        if (step === 3) updates.step3Approval = record;

        return { ...flow, ...updates };
      });

      const flow = updatedFlows.find((f) => f.id === flowId);
      let updatedWarnings = state.warnings;
      if (flow && (flow.status === 'approved' || flow.status === 'rejected')) {
        updatedWarnings = state.warnings.map((w) =>
          w.id === flow.warningId ? { ...w, status: 'resolved' as const } : w
        );
      }

      return {
        approvalFlows: updatedFlows,
        warnings: updatedWarnings,
      };
    });
  },

  createApprovalFlow: (warningId, proposal) => {
    const newFlow: ApprovalFlow = {
      id: `appr-${Date.now()}`,
      warningId,
      title: `${getAgencyName(proposal.targetAgencyId)}${getTechFieldName(proposal.techField)}审查员调配方案`,
      type: 'examiner_reallocation',
      status: 'step1_pending',
      currentStep: 1,
      proposal,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      approvalFlows: [newFlow, ...state.approvalFlows],
    }));
    return newFlow.id;
  },

  updateWarningApprovalFlowId: (warningId, approvalFlowId) => {
    set((state) => ({
      warnings: state.warnings.map((w) =>
        w.id === warningId ? { ...w, approvalFlowId } : w
      ),
    }));
  },

  updateStaffForecast: (targets) => {
    set((state) => ({
      staffForecast: state.staffForecast.map((f) => {
        const target = targets[f.month];
        if (!target) return f;
        const predicted = Math.round(target * (0.9 + Math.random() * 0.3));
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
      }),
    }));
  },

  regenerateStaffPlans: () => {
    set((state) => {
      const totalGap = state.staffForecast.reduce((sum, f) => sum + Math.max(0, f.gap), 0);
      if (totalGap <= 0) return {};

      const avgGap = Math.ceil(totalGap / 6 / 150);
      const newPlans: StaffPlan[] = [
        {
          id: `plan-${Date.now()}-1`,
          type: 'hire',
          techField: 'ai',
          count: Math.ceil(avgGap * 1.2),
          startMonth: state.staffForecast[0]?.month || '',
          duration: 36,
          cost: avgGap * 120000,
          effect: `可覆盖${Math.ceil(totalGap * 0.7)}件审查缺口，建立长期人才储备`,
          risk: '招聘周期长（3-6个月），培训期需3个月',
          score: 85,
        },
        {
          id: `plan-${Date.now()}-2`,
          type: 'borrow',
          techField: 'ai',
          count: avgGap,
          startMonth: state.staffForecast[0]?.month || '',
          duration: 6,
          cost: avgGap * 40000,
          effect: '1个月内可到位，快速缓解审查压力',
          risk: '人员稳定性差，期满后需重新调配',
          score: 78,
        },
        {
          id: `plan-${Date.now()}-3`,
          type: 'hire',
          techField: 'biotechnology',
          count: Math.ceil(avgGap * 0.8),
          startMonth: state.staffForecast[0]?.month || '',
          duration: 36,
          cost: avgGap * 100000,
          effect: '满足生物医药领域中长期需求',
          risk: '专业人才稀缺，招聘难度较大',
          score: 72,
        },
        {
          id: `plan-${Date.now()}-4`,
          type: 'borrow',
          techField: 'electronics',
          count: Math.ceil(avgGap * 0.6),
          startMonth: state.staffForecast[0]?.month || '',
          duration: 4,
          cost: avgGap * 25000,
          effect: '短期快速补充，应急效果好',
          risk: '借调人员对本地业务需熟悉期',
          score: 80,
        },
      ];
      return { staffPlans: newPlans };
    });
  },
}));
