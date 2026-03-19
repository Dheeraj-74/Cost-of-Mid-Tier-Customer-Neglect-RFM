import React from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, CreditCard, AlertOctagon } from 'lucide-react';

const COLORS = {
  'H':  '#7B5EA7',
  'M3': '#D46A6A',
  'M2': '#E8A838',
  'M1': '#6BAA75',
  'L':  '#4E6B8C',
};

export default function Trends() {
  const { advancedData, workerProgress, isLoading, error } = useDashboardData();

  if (isLoading || workerProgress) {
    return (
      <div className="loading-container">
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px'}}>
          <div className="spinner"></div>
          <div>{workerProgress || 'Loading...'}</div>
        </div>
      </div>
    );
  }
  if (error || !advancedData) return <div className="loading-container">Error loading advanced data!</div>;

  const { monthlyRevenue, aovTrend, churnTrend } = advancedData;

  const formatCurrency = (value) => `$${value > 1000 ? (value/1000).toFixed(1) + 'k' : value}`;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Revenue Trends</h1>
      </div>

      <div className="card" style={{ marginBottom: '35px' }}>
        <h3 className="card-title"><TrendingUp size={18} color="var(--red-accent)" /> Monthly Revenue by Segment</h3>
        <div className="chart-card">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyRevenue} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="Month" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12, fontWeight: 500}} dy={10} />
              <YAxis tickFormatter={formatCurrency} axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12, fontWeight: 500}} dx={-10} />
              <Tooltip formatter={(value) => `$${value.toLocaleString(undefined, {maximumFractionDigits: 0})}`} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{fontSize: '13px', fontWeight: 600}} />
              <Area type="monotone" dataKey="H" stackId="1" stroke={COLORS['H']} fill={COLORS['H']} name="High Value" />
              <Area type="monotone" dataKey="M3" stackId="1" stroke={COLORS['M3']} fill={COLORS['M3']} name="Mid Tier 3" />
              <Area type="monotone" dataKey="M2" stackId="1" stroke={COLORS['M2']} fill={COLORS['M2']} name="Mid Tier 2" />
              <Area type="monotone" dataKey="M1" stackId="1" stroke={COLORS['M1']} fill={COLORS['M1']} name="Mid Tier 1" />
              <Area type="monotone" dataKey="L" stackId="1" stroke={COLORS['L']} fill={COLORS['L']} name="Low Value" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title"><CreditCard size={18} color="var(--red-accent)" /> Average Order Value (AOV) Trend</h3>
        <div className="chart-card">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={aovTrend} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="Month" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12, fontWeight: 500}} dy={10} />
              <YAxis tickFormatter={(val) => `$${val}`} axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12, fontWeight: 500}} dx={-10} />
              <Tooltip formatter={(value) => `$${value.toFixed(2)}`} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
              <Line type="monotone" dataKey="AOV" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ marginTop: '35px' }}>
        <h3 className="card-title"><AlertOctagon size={18} color="var(--red-accent)" /> Mid-Tier Churn & Losses</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
          <div>
            <p style={{fontSize: '13px', color: '#6b7280', marginBottom: '15px'}}>Mid-Tier Churn Rate (%)</p>
            <div className="chart-card" style={{height: '300px'}}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={churnTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="Month" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 11}} dy={10} />
                  <YAxis tickFormatter={(val) => `${(val*100).toFixed(0)}%`} axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 11}} />
                  <Tooltip formatter={(value) => `${(value*100).toFixed(1)}%`} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                  <Line type="monotone" dataKey="ChurnRate" stroke="var(--red-accent)" strokeWidth={3} dot={{r: 2, fill: 'var(--red-accent)'}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div>
            <p style={{fontSize: '13px', color: '#6b7280', marginBottom: '15px'}}>Est. Revenue Lost to Downgrades</p>
            <div className="chart-card" style={{height: '300px'}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={churnTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="Month" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 11}} dy={10} />
                  <YAxis tickFormatter={formatCurrency} axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 11}} />
                  <Tooltip formatter={(value) => `$${value.toLocaleString(undefined, {maximumFractionDigits: 0})}`} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} cursor={{fill: 'rgba(0,0,0,0.02)'}} />
                  <Bar dataKey="LostRevenue" fill="#fca5a5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
