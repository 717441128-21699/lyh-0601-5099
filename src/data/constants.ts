import type { TechFieldInfo, ApplicantTypeInfo, Province, Agency, User } from '../types';

export const TECH_FIELDS: TechFieldInfo[] = [
  { key: 'ai', name: '人工智能', color: '#6366F1' },
  { key: 'biotechnology', name: '生物医药', color: '#10B981' },
  { key: 'electronics', name: '电子信息', color: '#3B82F6' },
  { key: 'machinery', name: '机械制造', color: '#F59E0B' },
  { key: 'materials', name: '新材料', color: '#8B5CF6' },
  { key: 'software', name: '软件算法', color: '#06B6D4' },
  { key: 'telecom', name: '通信技术', color: '#EC4899' },
  { key: 'other', name: '其他领域', color: '#6B7280' },
];

export const APPLICANT_TYPES: ApplicantTypeInfo[] = [
  { key: 'enterprise', name: '企业' },
  { key: 'university', name: '高校' },
  { key: 'research', name: '科研院所' },
  { key: 'individual', name: '个人' },
  { key: 'government', name: '政府机构' },
];

export const PROVINCES: Province[] = [
  { id: 'beijing', name: '北京', code: 'BJ', region: 'north' },
  { id: 'shanghai', name: '上海', code: 'SH', region: 'east' },
  { id: 'guangdong', name: '广东', code: 'GD', region: 'south' },
  { id: 'jiangsu', name: '江苏', code: 'JS', region: 'east' },
  { id: 'zhejiang', name: '浙江', code: 'ZJ', region: 'east' },
  { id: 'shandong', name: '山东', code: 'SD', region: 'east' },
  { id: 'hubei', name: '湖北', code: 'HB', region: 'central' },
  { id: 'sichuan', name: '四川', code: 'SC', region: 'west' },
  { id: 'shaanxi', name: '陕西', code: 'SN', region: 'west' },
  { id: 'liaoning', name: '辽宁', code: 'LN', region: 'north' },
  { id: 'hunan', name: '湖南', code: 'HN', region: 'central' },
  { id: 'fujian', name: '福建', code: 'FJ', region: 'south' },
  { id: 'tianjin', name: '天津', code: 'TJ', region: 'north' },
  { id: 'chongqing', name: '重庆', code: 'CQ', region: 'west' },
  { id: 'henan', name: '河南', code: 'HA', region: 'central' },
];

export const AGENCIES: Agency[] = [
  { id: 'bj-1', name: '北京专利代办处', provinceId: 'beijing', code: 'BJ001', examinerCount: 120 },
  { id: 'bj-2', name: '北京中关村代办处', provinceId: 'beijing', code: 'BJ002', examinerCount: 85 },
  { id: 'sh-1', name: '上海专利代办处', provinceId: 'shanghai', code: 'SH001', examinerCount: 150 },
  { id: 'sh-2', name: '上海浦东代办处', provinceId: 'shanghai', code: 'SH002', examinerCount: 95 },
  { id: 'gd-1', name: '广州专利代办处', provinceId: 'guangdong', code: 'GD001', examinerCount: 135 },
  { id: 'gd-2', name: '深圳代办处', provinceId: 'guangdong', code: 'GD002', examinerCount: 180 },
  { id: 'js-1', name: '南京专利代办处', provinceId: 'jiangsu', code: 'JS001', examinerCount: 110 },
  { id: 'js-2', name: '苏州代办处', provinceId: 'jiangsu', code: 'JS002', examinerCount: 90 },
  { id: 'zj-1', name: '杭州专利代办处', provinceId: 'zhejiang', code: 'ZJ001', examinerCount: 105 },
  { id: 'zj-2', name: '宁波代办处', provinceId: 'zhejiang', code: 'ZJ002', examinerCount: 65 },
  { id: 'sd-1', name: '济南专利代办处', provinceId: 'shandong', code: 'SD001', examinerCount: 80 },
  { id: 'hb-1', name: '武汉专利代办处', provinceId: 'hubei', code: 'HB001', examinerCount: 75 },
  { id: 'sc-1', name: '成都专利代办处', provinceId: 'sichuan', code: 'SC001', examinerCount: 70 },
  { id: 'sn-1', name: '西安专利代办处', provinceId: 'shaanxi', code: 'SN001', examinerCount: 55 },
  { id: 'ln-1', name: '沈阳专利代办处', provinceId: 'liaoning', code: 'LN001', examinerCount: 60 },
];

export const MOCK_USERS: User[] = [
  {
    id: 'user-1',
    username: 'admin',
    name: '国家局管理员',
    role: 'national',
  },
  {
    id: 'user-2',
    username: 'province_gd',
    name: '广东省中心主任',
    role: 'provincial',
    provinceId: 'guangdong',
  },
  {
    id: 'user-3',
    username: 'province_bj',
    name: '北京市中心主任',
    role: 'provincial',
    provinceId: 'beijing',
  },
  {
    id: 'user-4',
    username: 'agency_sz',
    name: '深圳代办处主任',
    role: 'agency',
    provinceId: 'guangdong',
    agencyId: 'gd-2',
  },
  {
    id: 'user-5',
    username: 'examiner_01',
    name: '张审查员',
    role: 'examiner',
    provinceId: 'guangdong',
    agencyId: 'gd-2',
  },
];

export const REJECT_REASONS = [
  '新颖性不足',
  '创造性不足',
  '实用性问题',
  '说明书公开不充分',
  '权利要求不清楚',
  '修改超范围',
  '单一性缺陷',
  '其他问题',
];

export const getTechFieldName = (key: string): string => {
  return TECH_FIELDS.find((f) => f.key === key)?.name || key;
};

export const getApplicantTypeName = (key: string): string => {
  return APPLICANT_TYPES.find((t) => t.key === key)?.name || key;
};

export const getProvinceName = (id: string): string => {
  return PROVINCES.find((p) => p.id === id)?.name || id;
};

export const getAgencyName = (id: string): string => {
  return AGENCIES.find((a) => a.id === id)?.name || id;
};

export const getAgenciesByProvince = (provinceId: string): Agency[] => {
  return AGENCIES.filter((a) => a.provinceId === provinceId);
};
