import React, { useState } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Package } from 'lucide-react';

export default function Segments() {
  const { metrics, isLoading, error, advancedData } = useDashboardData();
  const [activeTab, setActiveTab] = useState('All Segments');

  if (isLoading) return <div className="loading-container">Loading...</div>;
  if (error) return <div className="loading-container">Error!</div>;

  const tabs = ['All Segments', 'Mid Tier', 'Top Tier', 'Bottom Tier'];

  const { topProducts } = advancedData || {};

  const currentMetrics = metrics.segmentMetrics[activeTab] || {
    avgRecency: 0,
    avgFrequency: 0,
    avgMonetary: 0
  };

  // Use average RFM Scores (which are normalized integers) instead of raw values 
  // to prevent extreme outliers from collapsing the radar chart shape
  const radarData = [
    {
      subject: 'Recency (Days)',
      value: currentMetrics.avgRScore || 0,
    },
    {
      subject: 'Frequency (Rate)',
      value: currentMetrics.avgFScore || 0,
    },
    {
      subject: 'Monetary (Volume)',
      value: currentMetrics.avgMScore || 0,
    }
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Segment Details</h1>
      </div>

      <div className="segment-tabs">
        {tabs.map(tab => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="segments-grid">
        <div className="card">
          <h3 className="card-title">CUSTOMER SCORES (RFM)</h3>
          <div className="chart-card" style={{height: '350px'}}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid gridType="polygon" />
                <PolarAngleAxis dataKey="subject" tick={{fill: '#888', fontSize: 12}} />
                <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                <Radar name={activeTab} dataKey="value" stroke="#ff8f8f" fill="#ff4d4f" fillOpacity={0.6} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">SEGMENT SUMMARY</h3>
          <div className="segment-summary-item">
            <span className="summary-label">Average Recency</span>
            <span className="summary-value">{Math.round(currentMetrics.avgRecency)} Days</span>
          </div>
          <div className="segment-summary-item">
            <span className="summary-label">Average Frequency</span>
            <span className="summary-value">{currentMetrics.avgFrequency.toFixed(2)} Orders</span>
          </div>
          <div className="segment-summary-item">
            <span className="summary-label">Average Spend</span>
            <span className="summary-value">${Math.round(currentMetrics.avgMonetary).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {activeTab === 'Mid Tier' && topProducts && (
        <div className="card" style={{marginTop: '35px'}}>
          <h3 className="card-title"><Package size={18} color="var(--red-accent)" /> Top 10 Products by Revenue (Mid-Tier)</h3>
          <div className="chart-card" style={{height: '350px'}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis type="number" tickFormatter={(val) => `$${val/1000}k`} axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                <YAxis type="category" dataKey="Product" axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 11, fontWeight: 600}} width={100} />
                <Tooltip formatter={(val) => `$${val.toLocaleString()}`} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} cursor={{fill: 'rgba(0,0,0,0.02)'}} />
                <Bar dataKey="Revenue" fill="var(--red-accent)" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
