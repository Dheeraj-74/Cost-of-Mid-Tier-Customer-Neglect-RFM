import React, { useState } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, DollarSign, Activity, PieChart } from 'lucide-react';

const COLORS = {
  'Mid Tier': '#3b82f6', // blue
  'Top Tier': '#10b981', // green
  'Bottom Tier': '#ef4444' // red
};

export default function Home() {
  const { data, metrics, isLoading, error } = useDashboardData();
  if (isLoading) return <div className="loading-container">Loading dashboard data...</div>;
  if (error) return <div className="loading-container">Error loading data!</div>;

  // Prepare chart data based on segmentCounts
  const chartData = [
    { name: 'Mid Tier', count: metrics.segmentCounts['Mid Tier'] || 0 },
    { name: 'Top Tier', count: metrics.segmentCounts['Top Tier'] || 0 },
    { name: 'Bottom Tier', count: metrics.segmentCounts['Bottom Tier'] || 0 },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Home</h1>
      </div>

      <div className="kpi-grid">
        <div className="card kpi-card">
          <div className="kpi-card-title">Total Customers</div>
          <div className="kpi-card-value">{metrics.totalCustomers.toLocaleString()}</div>
          <Users className="kpi-icon" size={48} />
        </div>
        <div className="card kpi-card">
          <div className="kpi-card-title">Total Revenue</div>
          <div className="kpi-card-value">${metrics.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <DollarSign className="kpi-icon" size={48} />
        </div>
        <div className="card kpi-card">
          <div className="kpi-card-title">Average Score</div>
          <div className="kpi-card-value">{metrics.avgScore.toFixed(1)}</div>
          <Activity className="kpi-icon" size={48} />
        </div>
        <div className="card kpi-card">
          <div className="kpi-card-title">Mid Tier %</div>
          <div className="kpi-card-value">{metrics.midTierPercent.toFixed(1)}%</div>
          <PieChart className="kpi-icon" size={48} />
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Customers by Segment</h3>
        <div className="chart-card">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontWeight: 500}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontWeight: 500}} dx={-10} />
              <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={90}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
