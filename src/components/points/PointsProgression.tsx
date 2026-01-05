"use client";

import { useMemo, useState, useEffect } from "react";
import { getDailyTotals, getDaysInMonth, toDateKey } from "@/lib/points-utils";

type PointEntry = {
  id: string;
  points: number;
  date: string;
};

type PointsProgressionProps = {
  entries: PointEntry[];
  month: number;
  year: number;
};

export default function PointsProgression({
  entries,
  month,
  year,
}: PointsProgressionProps) {
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    setToday(new Date());
  }, []);

  const chartData = useMemo(() => {
    const dailyTotals = getDailyTotals(entries);
    const daysInMonth = getDaysInMonth(year, month);
    const now = today || new Date();

    return daysInMonth.map((date) => {
      const dateKey = toDateKey(date);
      const points = dailyTotals.get(dateKey) || 0;
      const isFuture = date > now;
      return {
        day: date.getDate(),
        points: isFuture ? null : points,
        dateKey,
      };
    });
  }, [entries, month, year, today]);

  // Find max points for scaling (minimum 10 for nice scale)
  const maxPoints = useMemo(() => {
    const max = Math.max(...chartData.map((d) => d.points || 0));
    return Math.max(max, 10);
  }, [chartData]);

  // SVG dimensions
  const width = 100;
  const height = 50;
  const padding = { top: 5, right: 2, bottom: 5, left: 2 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Generate path for the line
  const linePath = useMemo(() => {
    const validPoints = chartData.filter((d) => d.points !== null);
    if (validPoints.length === 0) return "";

    const xScale = chartWidth / (chartData.length - 1 || 1);
    const yScale = chartHeight / maxPoints;

    let path = "";
    let started = false;

    chartData.forEach((d, i) => {
      if (d.points === null) return;

      const x = padding.left + i * xScale;
      const y = padding.top + chartHeight - d.points * yScale;

      if (!started) {
        path += `M ${x} ${y}`;
        started = true;
      } else {
        path += ` L ${x} ${y}`;
      }
    });

    return path;
  }, [chartData, maxPoints, chartWidth, chartHeight]);

  // Generate area path (for gradient fill)
  const areaPath = useMemo(() => {
    const validPoints = chartData.filter((d) => d.points !== null);
    if (validPoints.length === 0) return "";

    const xScale = chartWidth / (chartData.length - 1 || 1);
    const yScale = chartHeight / maxPoints;

    let path = "";
    let firstX = 0;
    let lastX = 0;
    let started = false;

    chartData.forEach((d, i) => {
      if (d.points === null) return;

      const x = padding.left + i * xScale;
      const y = padding.top + chartHeight - d.points * yScale;

      if (!started) {
        firstX = x;
        path += `M ${x} ${padding.top + chartHeight}`;
        path += ` L ${x} ${y}`;
        started = true;
      } else {
        path += ` L ${x} ${y}`;
      }
      lastX = x;
    });

    // Close the path
    path += ` L ${lastX} ${padding.top + chartHeight}`;
    path += ` L ${firstX} ${padding.top + chartHeight}`;
    path += " Z";

    return path;
  }, [chartData, maxPoints, chartWidth, chartHeight]);

  // Calculate total points this month
  const totalThisMonth = useMemo(() => {
    return chartData.reduce((sum, d) => sum + (d.points || 0), 0);
  }, [chartData]);

  if (!today) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="aspect-[2/1] bg-gray-100 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">Daily Progress</h3>
        <div className="text-right">
          <span className="text-2xl font-bold text-blue-600">
            {totalThisMonth}
          </span>
          <span className="text-sm text-gray-500 ml-1">pts this month</span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="w-full aspect-[2/1] relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Gradient definition */}
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <line
              key={ratio}
              x1={padding.left}
              y1={padding.top + chartHeight * ratio}
              x2={padding.left + chartWidth}
              y2={padding.top + chartHeight * ratio}
              stroke="#E5E7EB"
              strokeWidth="0.5"
            />
          ))}

          {/* Area fill */}
          {areaPath && (
            <path d={areaPath} fill="url(#chartGradient)" />
          )}

          {/* Line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data points */}
          {chartData.map((d, i) => {
            if (d.points === null || d.points === 0) return null;
            const xScale = chartWidth / (chartData.length - 1 || 1);
            const yScale = chartHeight / maxPoints;
            const x = padding.left + i * xScale;
            const y = padding.top + chartHeight - d.points * yScale;

            return (
              <circle
                key={d.dateKey}
                cx={x}
                cy={y}
                r="1.5"
                fill="#3B82F6"
              />
            );
          })}
        </svg>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
        <span>1</span>
        <span>{Math.floor(chartData.length / 2)}</span>
        <span>{chartData.length}</span>
      </div>
    </div>
  );
}
