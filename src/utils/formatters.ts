export const formatPercent = (value: number, decimals = 1): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('zh-CN').format(value);
};

export const formatDays = (days: number): string => {
  return `${days.toFixed(1)} 天`;
};

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0,
  }).format(value);
};

export const getTrendColor = (value: number, isPositiveGood = true): string => {
  if (value === 0) return 'text-gray-500';
  const positive = isPositiveGood ? value > 0 : value < 0;
  return positive ? 'text-accent-success' : 'text-accent-danger';
};

export const formatTrend = (value: number, isPositiveGood = true): { text: string; color: string; icon: string } => {
  const absValue = Math.abs(value);
  const color = getTrendColor(value, isPositiveGood);
  if (value === 0) {
    return { text: '持平', color: 'text-gray-500', icon: 'minus' };
  }
  const icon = value > 0 ? 'trending-up' : 'trending-down';
  return { text: `${value > 0 ? '+' : '-'}${absValue.toFixed(1)}%`, color, icon };
};
