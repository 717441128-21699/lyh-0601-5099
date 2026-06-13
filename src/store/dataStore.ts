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
    set((state) => ({
      approvalFlows: state.approvalFlows.map((flow) => {
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
      }),
    }));
  },
}));
