import React, { useState, useMemo } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';

export default function Risk() {
  const { data, isLoading, error } = useDashboardData();
  const [activeTab, setActiveTab] = useState('All Segments');

  const tabs = ['All Segments', 'Mid Tier', 'Top Tier', 'Bottom Tier'];

  // Filter data based on active tab
  const filteredData = useMemo(() => {
    if (!data) return [];
    if (activeTab === 'All Segments') return data;
    return data.filter(d => d.Customer_Segment === activeTab);
  }, [data, activeTab]);

  // Generate heatmap matrix (5x5) based on F_score (y) and R_score (x)
  const heatmapData = useMemo(() => {
    const matrix = Array(5).fill(0).map(() => Array(5).fill(0));
    filteredData.forEach(d => {
      // Scores are 1-5, but in app.py they were 1-3. Let's check max scores.
      // If scores are 1-3, we map them into the 5x5 by index or just use them if they are 1-5.
      // Assuming data.csv has scores that might be up to 5, as in the screenshot.
      // The screenshot has axis 1 to 5.
      const f = Math.min(Math.max(Math.round(d.F_score) || 1, 1), 5);
      const r = Math.min(Math.max(Math.round(d.R_score) || 1, 1), 5);
      
      // y is Frequency (5 -> top, 1 -> bottom)
      // x is Recency (1 -> left, 5 -> right)
      // So index for y is 5 - f, index for x is r - 1
      matrix[5 - f][r - 1] += 1;
    });
    return matrix;
  }, [filteredData]);

  if (isLoading) return <div className="loading-container">Loading...</div>;
  if (error) return <div className="loading-container">Error!</div>;

  // Max value for color scaling in heatmap
  const maxHeatmapCount = Math.max(...heatmapData.flat());

  const getHeatmapColor = (count) => {
    if (count === 0) return 'var(--white)';
    const intensity = 0.1 + (count / maxHeatmapCount) * 0.9;
    return `rgba(255, 77, 79, ${intensity})`; // red with opacity
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Risk Overview</h1>
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
          <h3 className="card-title">RECENCY VS FREQUENCY HEATMAP</h3>
          <div className="heatmap-container">
            {/* Empty top-left cell */}
            <div></div>
            <div className="x-label">1</div>
            <div className="x-label">2</div>
            <div className="x-label">3</div>
            <div className="x-label">4</div>
            <div className="x-label">5</div>

            {heatmapData.map((row, yIdx) => (
              <React.Fragment key={`row-${yIdx}`}>
                <div className="y-label">{5 - yIdx}</div>
                {row.map((cellCount, xIdx) => (
                  <div
                    key={`cell-${yIdx}-${xIdx}`}
                    className="heatmap-cell"
                    style={{ backgroundColor: getHeatmapColor(cellCount), border: cellCount > 0 ? 'none' : '1px solid var(--border-color)', color: cellCount > 0 && cellCount / maxHeatmapCount > 0.5 ? 'white' : 'inherit' }}
                  >
                    {cellCount > 0 ? cellCount : ''}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <h3 className="card-title" style={{ padding: '25px 25px 15px 25px', marginBottom: 0 }}>CUSTOMER LIST</h3>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '450px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>CUSTOMER ID</th>
                  <th>RECENCY</th>
                  <th>SPEND</th>
                  <th>SEGMENT</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.slice(0, 100).map(customer => (
                  <tr key={customer.CustomerID}>
                    <td style={{fontWeight: 700}}>#{Math.round(customer.CustomerID)}</td>
                    <td>{Math.round(customer.Recency)}d</td>
                    <td>${Math.round(customer.Monetary).toLocaleString()}</td>
                    <td>{customer.Customer_Segment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
