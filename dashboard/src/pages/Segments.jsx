import React, { useState } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

export default function Segments() {
  const { metrics, isLoading, error } = useDashboardData();
  const [activeTab, setActiveTab] = useState('All Segments');

  if (isLoading) return <div className="loading-container">Loading...</div>;
  if (error) return <div className="loading-container">Error!</div>;

  const tabs = ['All Segments', 'Mid Tier', 'Top Tier', 'Bottom Tier'];

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
    </div>
  );
}
