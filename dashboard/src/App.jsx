import React, { useState, useEffect } from 'react';
import { csvParse } from 'd3-dsv';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './App.css';

function App() {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({ totalCustomers: 0, totalMonetary: 0 });

  useEffect(() => {
    fetch('/data.csv')
      .then(response => response.text())
      .then(csvText => {
        const parsedData = csvParse(csvText);
        
        // Basic aggregations
        const totalCustomers = parsedData.length;
        const totalMonetary = parsedData.reduce((sum, row) => sum + parseFloat(row.Monetary || 0), 0);
        const totalFrequency = parsedData.reduce((sum, row) => sum + parseFloat(row.Frequency || 0), 0);
        const avgFrequency = totalFrequency / totalCustomers;
        
        // Aggregate segments for the chart
        const segmentCounts = parsedData.reduce((acc, row) => {
          const seg = row.Customer_Segment || 'Unknown';
          acc[seg] = (acc[seg] || 0) + 1;
          return acc;
        }, {});

        const chartData = Object.keys(segmentCounts).map(name => ({
          name,
          count: segmentCounts[name]
        }));

        setData(chartData);
        setStats({ totalCustomers, totalMonetary, avgFrequency });
      })
      .catch(err => console.error("Error loading CSV:", err));
  }, []);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>RFM Analytics Dashboard (Basic)</h1>
      </header>
      
      <div className="kpi-grid">
        <div className="kpi-card">
          <h3>Total Customers</h3>
          <p className="kpi-value">{stats.totalCustomers.toLocaleString()}</p>
        </div>
        <div className="kpi-card">
          <h3>Total Revenue</h3>
          <p className="kpi-value">${Math.round(stats.totalMonetary).toLocaleString()}</p>
        </div>
        <div className="kpi-card">
          <h3>Avg Frequency</h3>
          <p className="kpi-value">{stats.avgFrequency?.toFixed(2)}</p>
        </div>
      </div>

      <div className="chart-section">
        <h2>Customer Segments Distribution</h2>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default App;
