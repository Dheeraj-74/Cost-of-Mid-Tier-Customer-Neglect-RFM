import { useState, useEffect, useMemo } from 'react';
import { csvParse } from 'd3-dsv';
import DataWorker from '../workers/dataWorker?worker';

export function useDashboardData() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [advancedData, setAdvancedData] = useState(null);
  const [workerProgress, setWorkerProgress] = useState('');

  useEffect(() => {
    setIsLoading(true);
    fetch('/data.csv')
      .then(res => res.text())
      .then(text => {
        const parsed = csvParse(text, (d) => ({
          ...d,
          Recency: parseFloat(d.Recency) || 0,
          Frequency: parseFloat(d.Frequency) || 0,
          Monetary: parseFloat(d.Monetary) || 0,
          RFM_Score: parseFloat(d.RFM_Score) || 0,
          R_score: parseFloat(d.R_score) || 0,
          F_score: parseFloat(d.F_score) || 0,
          M_score: parseFloat(d.M_score) || 0,
        }));
        setData(parsed);
      })
      .catch(err => setError(err))
      .finally(() => setIsLoading(false));

    // Initialize Advanced Data Web Worker
    const worker = new DataWorker();
    setWorkerProgress('Initializing Worker...');
    worker.onmessage = (e) => {
      if (e.data.type === 'PROGRESS') {
        setWorkerProgress(e.data.payload);
      } else if (e.data.type === 'COMPLETE') {
        setAdvancedData(e.data.payload);
        setWorkerProgress('');
      } else if (e.data.type === 'ERROR') {
        console.error('Worker Error:', e.data.payload);
        setWorkerProgress('Failed to load advanced data.');
      }
    };
    worker.postMessage({ type: 'START_PROCESSING' });

    return () => worker.terminate();
  }, []);

  const metrics = useMemo(() => {
    if (!data.length) return null;

    const totalCustomers = data.length;
    const totalRevenue = data.reduce((sum, row) => sum + row.Monetary, 0);
    const avgScore = data.reduce((sum, row) => sum + row.RFM_Score, 0) / totalCustomers;

    const segmentCounts = data.reduce((acc, row) => {
      const seg = row.Customer_Segment || 'Unknown';
      acc[seg] = (acc[seg] || 0) + 1;
      return acc;
    }, {});

    const midTierCount = segmentCounts['Mid Tier'] || 0;
    const midTierPercent = (midTierCount / totalCustomers) * 100;

    // Averages per segment
    const segmentMetrics = data.reduce((acc, row) => {
      const seg = row.Customer_Segment || 'Unknown';
      if (!acc[seg]) {
        acc[seg] = { 
          count: 0, 
          recency: 0, frequency: 0, monetary: 0,
          rScoreSum: 0, fScoreSum: 0, mScoreSum: 0 
        };
      }
      acc[seg].count += 1;
      acc[seg].recency += row.Recency;
      acc[seg].frequency += row.Frequency;
      acc[seg].monetary += row.Monetary;
      acc[seg].rScoreSum += row.R_score;
      acc[seg].fScoreSum += row.F_score;
      acc[seg].mScoreSum += row.M_score;
      return acc;
    }, {});

    Object.keys(segmentMetrics).forEach(seg => {
      const s = segmentMetrics[seg];
      s.avgRecency = s.recency / s.count;
      s.avgFrequency = s.frequency / s.count;
      s.avgMonetary = s.monetary / s.count;
      s.avgRScore = s.rScoreSum / s.count;
      s.avgFScore = s.fScoreSum / s.count;
      s.avgMScore = s.mScoreSum / s.count;
    });

    // Averages for ALL segments combined
    segmentMetrics['All Segments'] = {
      count: totalCustomers,
      avgRecency: data.reduce((sum, row) => sum + row.Recency, 0) / totalCustomers,
      avgFrequency: data.reduce((sum, row) => sum + row.Frequency, 0) / totalCustomers,
      avgMonetary: totalRevenue / totalCustomers,
      avgRScore: data.reduce((sum, row) => sum + row.R_score, 0) / totalCustomers,
      avgFScore: data.reduce((sum, row) => sum + row.F_score, 0) / totalCustomers,
      avgMScore: data.reduce((sum, row) => sum + row.M_score, 0) / totalCustomers,
    };

    // Calculate max values for tracking (optional now)
    const maxRecency = Math.max(...data.map(d => d.Recency));
    const maxFrequency = Math.max(...data.map(d => d.Frequency));
    const maxMonetary = Math.max(...data.map(d => d.Monetary));

    return {
      totalCustomers,
      totalRevenue,
      avgScore,
      midTierPercent,
      segmentCounts,
      segmentMetrics,
      maxValues: {
        recency: maxRecency,
        frequency: maxFrequency,
        monetary: maxMonetary
      }
    };
  }, [data]);

  return { data, metrics, isLoading, error, advancedData, workerProgress };
}
