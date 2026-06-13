import ReactECharts from 'echarts-for-react';
import type { ReviewMetrics } from '@/types';
import { getTechFieldName } from '@/data/constants';

interface BarRankChartProps {
  data: ReviewMetrics[];
}

export default function BarRankChart({ data }: BarRankChartProps) {
  const sortedData = [...data].sort((a, b) => a.grantRate - b.grantRate);

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#E5E7EB',
      borderWidth: 1,
      textStyle: {
        color: '#374151',
      },
      formatter: (params: any) => {
        const param = params[0];
        const item = sortedData.find((d) => getTechFieldName(d.techField) === param.name);
        if (!item) return '';
        return `
          <div style="font-weight: 600; margin-bottom: 4px;">${param.name}</div>
          <div style="display: flex; justify-content: space-between; gap: 16px;">
            <span style="color: #6B7280;">授权率：</span>
            <span style="font-weight: 500;">${(item.grantRate * 100).toFixed(1)}%</span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 16px;">
            <span style="color: #6B7280;">申请量：</span>
            <span style="font-weight: 500;">${item.totalApplications.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 16px;">
            <span style="color: #6B7280;">平均周期：</span>
            <span style="font-weight: 500;">${item.avgReviewCycle.toFixed(1)} 天</span>
          </div>
        `;
      },
    },
    grid: {
      left: '3%',
      right: '8%',
      bottom: '3%',
      top: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      max: 100,
      axisLabel: {
        color: '#6B7280',
        fontSize: 11,
        formatter: '{value}%',
      },
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      splitLine: {
        lineStyle: {
          color: '#F3F4F6',
          type: 'dashed',
        },
      },
    },
    yAxis: {
      type: 'category',
      data: sortedData.map((d) => getTechFieldName(d.techField)),
      axisLine: {
        lineStyle: {
          color: '#E5E7EB',
        },
      },
      axisLabel: {
        color: '#374151',
        fontSize: 12,
        fontWeight: 500,
      },
      axisTick: {
        show: false,
      },
    },
    series: [
      {
        type: 'bar',
        data: sortedData.map((d) => ({
          value: Number((d.grantRate * 100).toFixed(1)),
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: '#93C5FD' },
                { offset: 1, color: '#3B82F6' },
              ],
            },
            borderRadius: [0, 4, 4, 0],
          },
        })),
        barWidth: 16,
        label: {
          show: true,
          position: 'right',
          color: '#374151',
          fontSize: 12,
          fontWeight: 600,
          formatter: '{c}%',
        },
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: '100%', width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );
}
