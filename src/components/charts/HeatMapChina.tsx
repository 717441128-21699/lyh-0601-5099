import { useState } from 'react';
import type { ProvinceMetrics } from '@/types';
import { PROVINCES, getProvinceName } from '@/data/constants';
import { formatDays, formatNumber, formatPercent } from '@/utils/formatters';

interface HeatMapChinaProps {
  data: ProvinceMetrics[];
  onProvinceClick?: (provinceId: string) => void;
}

const PROVINCE_POSITIONS: Record<string, { x: number; y: number; w: number; h: number }> = {
  beijing: { x: 420, y: 120, w: 45, h: 40 },
  tianjin: { x: 430, y: 165, w: 40, h: 30 },
  hebei: { x: 395, y: 150, w: 70, h: 80 },
  shanxi: { x: 350, y: 180, w: 55, h: 100 },
  neimenggu: { x: 340, y: 50, w: 200, h: 90 },
  liaoning: { x: 470, y: 70, w: 70, h: 70 },
  jilin: { x: 490, y: 35, w: 70, h: 60 },
  heilongjiang: { x: 500, y: 0, w: 90, h: 60 },
  shanghai: { x: 510, y: 280, w: 35, h: 30 },
  jiangsu: { x: 475, y: 255, w: 60, h: 55 },
  zhejiang: { x: 495, y: 310, w: 55, h: 60 },
  anhui: { x: 440, y: 260, w: 55, h: 70 },
  fujian: { x: 495, y: 370, w: 55, h: 65 },
  jiangxi: { x: 445, y: 330, w: 55, h: 70 },
  shandong: { x: 420, y: 200, w: 80, h: 60 },
  henan: { x: 380, y: 250, w: 65, h: 70 },
  hubei: { x: 390, y: 320, w: 60, h: 65 },
  hunan: { x: 395, y: 385, w: 55, h: 70 },
  guangdong: { x: 420, y: 455, w: 75, h: 65 },
  guangxi: { x: 340, y: 450, w: 75, h: 65 },
  hainan: { x: 400, y: 530, w: 45, h: 40 },
  chongqing: { x: 320, y: 340, w: 55, h: 55 },
  sichuan: { x: 230, y: 290, w: 100, h: 110 },
  guizhou: { x: 310, y: 400, w: 60, h: 55 },
  yunnan: { x: 215, y: 410, w: 90, h: 95 },
  tibet: { x: 60, y: 280, w: 170, h: 130 },
  shaanxi: { x: 325, y: 190, w: 55, h: 105 },
  gansu: { x: 235, y: 170, w: 100, h: 70 },
  qinghai: { x: 150, y: 200, w: 90, h: 80 },
  ningxia: { x: 295, y: 170, w: 40, h: 45 },
  xinjiang: { x: 30, y: 120, w: 140, h: 140 },
  taiwan: { x: 545, y: 410, w: 25, h: 55 },
  hongkong: { x: 468, y: 510, w: 18, h: 18 },
  macau: { x: 448, y: 515, w: 15, h: 15 },
};

const getHeatColor = (avgReviewCycle: number): string => {
  if (avgReviewCycle < 90) return '#10B981';
  if (avgReviewCycle < 120) return '#34D399';
  if (avgReviewCycle < 150) return '#FBBF24';
  if (avgReviewCycle < 180) return '#F97316';
  return '#EF4444';
};

const getHeatOpacity = (avgReviewCycle: number): number => {
  const normalized = Math.min(Math.max((avgReviewCycle - 60) / 120, 0), 1);
  return 0.5 + normalized * 0.4;
};

export default function HeatMapChina({ data, onProvinceClick }: HeatMapChinaProps) {
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const getMetrics = (provinceId: string): ProvinceMetrics | undefined => {
    return data.find((d) => d.provinceId === provinceId);
  };

  const handleMouseMove = (e: React.MouseEvent, provinceId: string) => {
    setHoveredProvince(provinceId);
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
  };

  const hoveredMetrics = hoveredProvince ? getMetrics(hoveredProvince) : null;

  return (
    <div className="relative w-full h-full flex flex-col items-center">
      <svg viewBox="0 0 620 580" className="w-full h-full max-h-[500px]">
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.1" />
          </filter>
        </defs>
        {PROVINCES.map((province) => {
          const pos = PROVINCE_POSITIONS[province.id];
          if (!pos) return null;
          const metrics = getMetrics(province.id);
          const isHovered = hoveredProvince === province.id;
          const color = metrics ? getHeatColor(metrics.avgReviewCycle) : '#E5E7EB';
          const opacity = metrics ? getHeatOpacity(metrics.avgReviewCycle) : 0.3;

          return (
            <g
              key={province.id}
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHoveredProvince(province.id)}
              onMouseMove={(e) => handleMouseMove(e, province.id)}
              onMouseLeave={() => setHoveredProvince(null)}
              onClick={() => onProvinceClick?.(province.id)}
              filter={isHovered ? 'url(#shadow)' : undefined}
            >
              <rect
                x={pos.x}
                y={pos.y}
                width={pos.w}
                height={pos.h}
                rx={6}
                ry={6}
                fill={color}
                fillOpacity={isHovered ? Math.min(opacity + 0.2, 1) : opacity}
                stroke={isHovered ? '#1B4965' : '#D1D5DB'}
                strokeWidth={isHovered ? 2 : 1}
                className="transition-all duration-200"
              />
              <text
                x={pos.x + pos.w / 2}
                y={pos.y + pos.h / 2 + 5}
                textAnchor="middle"
                className="pointer-events-none select-none text-[11px] font-medium"
                fill={isHovered ? '#1B4965' : '#374151'}
              >
                {province.name.length > 3 ? province.name.slice(0, 2) : province.name}
              </text>
            </g>
          );
        })}
      </svg>

      {hoveredProvince && hoveredMetrics && (
        <div
          className="fixed z-50 pointer-events-none bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-[200px]"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y - 10,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-semibold text-gray-900 mb-2 text-base">
            {getProvinceName(hoveredProvince)}
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">申请总量</span>
              <span className="font-medium text-gray-900">{formatNumber(hoveredMetrics.totalApplications)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">平均审查周期</span>
              <span className="font-medium text-gray-900">{formatDays(hoveredMetrics.avgReviewCycle)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">授权率</span>
              <span className="font-medium text-accent-success">{formatPercent(hoveredMetrics.grantRate)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">驳回率</span>
              <span className="font-medium text-accent-danger">{formatPercent(hoveredMetrics.rejectRate)}</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-400">
            点击查看详情
          </div>
        </div>
      )}

      <div className="flex items-center gap-6 mt-4">
        <div className="text-sm text-gray-500">审查周期：</div>
        {[
          { label: '<90天', color: '#10B981' },
          { label: '90-120天', color: '#34D399' },
          { label: '120-150天', color: '#FBBF24' },
          { label: '150-180天', color: '#F97316' },
          { label: '>180天', color: '#EF4444' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-gray-600">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
