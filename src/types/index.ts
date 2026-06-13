export type UserRole = 'national' | 'provincial' | 'agency' | 'examiner';

export type TechField =
  | 'ai'
  | 'biotechnology'
  | 'electronics'
  | 'machinery'
  | 'materials'
  | 'software'
  | 'telecom'
  | 'other';

export type ApplicantType =
  | 'enterprise'
  | 'university'
  | 'research'
  | 'individual'
  | 'government';

export type ApplicationStatus = 'pending' | 'examining' | 'granted' | 'rejected';

export type WarningLevel = 1 | 2 | 3;
export type WarningType = 'cycle_exceed' | 'grant_rate_drop';
export type WarningStatus = 'pending' | 'processing' | 'resolved';

export type ApprovalStatus =
  | 'step1_pending'
  | 'step2_pending'
  | 'step3_pending'
  | 'approved'
  | 'rejected';

export type ReportScope = 'national' | 'provincial' | 'agency';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  provinceId?: string;
  agencyId?: string;
  avatar?: string;
}

export interface Province {
  id: string;
  name: string;
  code: string;
  region: 'north' | 'south' | 'east' | 'west' | 'central';
  mapPath?: string;
}

export interface Agency {
  id: string;
  name: string;
  provinceId: string;
  code: string;
  examinerCount: number;
}

export interface PatentApplication {
  id: string;
  applicationNo: string;
  title: string;
  techField: TechField;
  applicantType: ApplicantType;
  applicantName: string;
  provinceId: string;
  agencyId: string;
  applyDate: string;
  firstOfficeActionDate?: string;
  grantDate?: string;
  rejectDate?: string;
  rejectReason?: string;
  status: ApplicationStatus;
  annualFeePaid: boolean;
  examiner?: string;
}

export interface ReviewMetrics {
  id: string;
  techField: TechField;
  provinceId: string;
  totalApplications: number;
  avgReviewCycle: number;
  grantRate: number;
  rejectRate: number;
  period: 'day' | 'week' | 'month';
  date: string;
}

export interface ProvinceMetrics {
  provinceId: string;
  totalApplications: number;
  avgReviewCycle: number;
  grantRate: number;
  rejectRate: number;
  examinerEfficiency: number;
}

export interface Warning {
  id: string;
  level: WarningLevel;
  type: WarningType;
  techField: TechField;
  provinceId?: string;
  agencyId?: string;
  metricValue: number;
  thresholdValue: number;
  triggeredAt: string;
  status: WarningStatus;
  message: string;
  approvalFlowId?: string;
  handledBy?: string;
  handledAt?: string;
}

export interface ReallocationProposal {
  sourceAgencyId?: string;
  targetAgencyId: string;
  techField: TechField;
  examinerCount: number;
  estimatedDuration: number;
  reason: string;
  expectedEffect: string;
}

export interface ApprovalRecord {
  userId: string;
  userName: string;
  approved: boolean;
  comment: string;
  approvedAt: string;
}

export interface ApprovalFlow {
  id: string;
  warningId: string;
  title: string;
  type: 'examiner_reallocation';
  status: ApprovalStatus;
  currentStep: 1 | 2 | 3;
  step1Approval?: ApprovalRecord;
  step2Approval?: ApprovalRecord;
  step3Approval?: ApprovalRecord;
  proposal: ReallocationProposal;
  createdAt: string;
}

export interface DailyTrend {
  date: string;
  applications: number;
  grants: number;
  rejections: number;
  avgCycle: number;
}

export interface RejectReasonStat {
  reason: string;
  count: number;
  percentage: number;
}

export interface StaffForecast {
  month: string;
  targetApplications: number;
  predictedApplications: number;
  currentCapacity: number;
  gap: number;
  recommendedHire?: number;
  recommendedBorrow?: number;
}

export interface StaffPlan {
  id: string;
  type: 'hire' | 'borrow';
  techField: TechField;
  count: number;
  startMonth: string;
  duration: number;
  cost: number;
  effect: string;
  risk: string;
  score: number;
}

export interface ReportContent {
  cycleYoY: number;
  cycleMoM: number;
  grantRateChange: number;
  rejectRateDistribution: RejectReasonStat[];
  optimizationSuggestions: string[];
  keyMetrics: {
    totalApplications: number;
    avgReviewCycle: number;
    grantRate: number;
    rejectRate: number;
  };
}

export interface DiagnosticReport {
  id: string;
  title: string;
  type: 'weekly';
  period: { start: string; end: string };
  scope: ReportScope;
  scopeId?: string;
  content: ReportContent;
  generatedAt: string;
}

export interface TechFieldInfo {
  key: TechField;
  name: string;
  color: string;
}

export interface ApplicantTypeInfo {
  key: ApplicantType;
  name: string;
}
