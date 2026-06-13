import type { User, UserRole } from '../types';
import { AGENCIES } from '../data/constants';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  national: 4,
  provincial: 3,
  agency: 2,
  examiner: 1,
};

export const hasRoleLevel = (user: User | null, minRole: UserRole): boolean => {
  if (!user) return false;
  return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[minRole];
};

export const canViewProvinceData = (user: User | null, provinceId: string): boolean => {
  if (!user) return false;
  if (user.role === 'national') return true;
  if (user.role === 'provincial') return user.provinceId === provinceId;
  if (user.role === 'agency' || user.role === 'examiner') {
    return user.provinceId === provinceId;
  }
  return false;
};

export const canViewAgencyData = (user: User | null, agencyId: string): boolean => {
  if (!user) return false;
  if (user.role === 'national') return true;
  if (user.role === 'provincial') {
    const agency = AGENCIES.find((a) => a.id === agencyId);
    return agency && agency.provinceId === user.provinceId;
  }
  if (user.role === 'agency' || user.role === 'examiner') {
    return user.agencyId === agencyId;
  }
  return false;
};

export const canHandleWarning = (user: User | null): boolean => {
  return hasRoleLevel(user, 'agency');
};

export const canApproveStep = (user: User | null, step: 1 | 2 | 3): boolean => {
  if (!user) return false;
  if (step === 1) return user.role === 'agency' || user.role === 'examiner';
  if (step === 2) return user.role === 'provincial';
  if (step === 3) return user.role === 'national';
  return false;
};

export const canViewForecast = (user: User | null): boolean => {
  return hasRoleLevel(user, 'provincial');
};

export const canAccessSettings = (user: User | null): boolean => {
  return user?.role === 'national';
};

export const getRoleName = (role: UserRole): string => {
  const names: Record<UserRole, string> = {
    national: '国家局',
    provincial: '省级中心',
    agency: '代办处',
    examiner: '审查员',
  };
  return names[role];
};
