import React from 'react';
import { formatWeight, formatDate } from '../services/utils';

export default function TimeScheduleChart({ maxWeek, chart, hoverPoint, setHoverPoint }) {
  if (maxWeek < 1 || chart.points.length === 0) {
    return (
      <div className="tsp-empty-state tsp-chart-empty">
        <p>Belum ada data jadwal untuk ditampilkan pada kurva.</p>
      </div>
    );
  }

  return (
    <div className="tsp-chart-wrap">
      <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="tsp-chart-svg" role="img" aria-label="Grafik Kurva S">
        {[0, 25, 50, 75, 100].map((pct) => (
          <g key={pct}>
            <line x1={chart.padding.left} x2={chart.width - chart.padding.right} y1={chart.yFor(pct)} y2={chart.yFor(pct)} className="tsp-grid-line" />
            <text x={chart.padding.left - 8} y={chart.yFor(pct)} className="tsp-axis-label" textAnchor="end" dominantBaseline="middle">{pct}%</text>
          </g>
        ))}

        {chart.points.filter((_, i) => i % Math.ceil(maxWeek / 12 || 1) === 0).map((p) => (
          <text key={`x-${p.week}`} x={p.x} y={chart.height - chart.padding.bottom + 18} className="tsp-axis-label" textAnchor="middle">
            M{p.week}
          </text>
        ))}

        {chart.areaPath && <path d={chart.areaPath} className="tsp-area-path" />}
        {chart.linePath && <path d={chart.linePath} className="tsp-line-path" />}

        {chart.points.map((p) => (
          <circle
            key={p.week} cx={p.x} cy={p.y} r={hoverPoint?.week === p.week ? 5 : 3}
            className="tsp-point"
            onMouseEnter={() => setHoverPoint(p)}
            onMouseLeave={() => setHoverPoint(null)}
          />
        ))}
      </svg>

      {hoverPoint && (
        <div className="tsp-tooltip" style={{ left: `${(hoverPoint.x / chart.width) * 100}%`, top: `${(hoverPoint.y / chart.height) * 100}%` }}>
          <strong>Minggu {hoverPoint.week}</strong>
          <span>{formatDate(hoverPoint.start)} — {formatDate(hoverPoint.end)}</span>
          <span>Kumulatif: {formatWeight(hoverPoint.pct)}%</span>
        </div>
      )}
    </div>
  );
}