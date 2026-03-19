import React from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { CalendarDays, ArrowRightLeft } from 'lucide-react';

export default function Retention() {
  const { advancedData, workerProgress, isLoading, error } = useDashboardData();

  if (isLoading || workerProgress) {
    return (
      <div className="loading-container">
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px'}}>
          <div className="spinner"></div>
          <div>{workerProgress || 'Calculating Cohorts...'}</div>
        </div>
      </div>
    );
  }
  if (error || !advancedData) return <div className="loading-container">Error loading advanced data!</div>;

  const { retentionMatrix, migrationRates } = advancedData;

  const getColorOpacity = (percentage) => {
    // 0 to 1 scaling, mapping directly to opacity of a brand color (blue or red)
    if (percentage === 0 || !percentage) return 'transparent';
    return `rgba(59, 130, 246, ${percentage})`; // blue-500
  };

  // Find max months across all cohorts to dynamically create table headers
  let maxMonths = 0;
  retentionMatrix.forEach(row => {
    Object.keys(row).forEach(key => {
      if (key.startsWith('Month ')) {
        const num = parseInt(key.replace('Month ', ''));
        if (num > maxMonths) maxMonths = num;
      }
    });
  });
  
  const monthHeaders = Array.from({length: maxMonths}, (_, i) => i + 1);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Customer Retention</h1>
      </div>

      <div className="card">
        <h3 className="card-title"><CalendarDays size={18} color="var(--red-accent)" /> Cohort Retention Heatmap</h3>
        <p style={{fontSize: '13px', color: '#6b7280', marginBottom: '20px'}}>Percentage of active customers in the months following their first purchase.</p>
        
        <div style={{ overflowX: 'auto', paddingBottom: '10px' }}>
          <table className="data-table" style={{borderCollapse: 'collapse', borderSpacing: 0}}>
            <thead>
              <tr>
                <th style={{position: 'sticky', left: 0, backgroundColor: '#fdfdfd', zIndex: 10}}>Cohort</th>
                <th>Users</th>
                {monthHeaders.map(m => <th key={m} style={{textAlign: 'center'}}>{m}</th>)}
              </tr>
            </thead>
            <tbody>
              {retentionMatrix.map((row, idx) => (
                <tr key={idx}>
                  <td style={{fontWeight: 700, position: 'sticky', left: 0, backgroundColor: '#fff', borderRight: '1px solid rgba(0,0,0,0.05)'}}>
                    {row.Cohort}
                  </td>
                  <td style={{fontWeight: 600, color: '#6b7280'}}>{row.cohortSize}</td>
                  {monthHeaders.map(m => {
                    const val = row[`Month ${m}`];
                    return (
                      <td 
                        key={m} 
                        style={{
                          backgroundColor: getColorOpacity(val), 
                          textAlign: 'center',
                          color: val > 0.4 ? '#fff' : 'inherit',
                          border: '1px solid rgba(255,255,255,0.2)'
                        }}
                      >
                        {val ? `${(val * 100).toFixed(0)}%` : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{marginTop: '35px'}}>
        <h3 className="card-title"><ArrowRightLeft size={18} color="var(--red-accent)" /> Segment Migration Matrix</h3>
        <p style={{fontSize: '13px', color: '#6b7280', marginBottom: '20px'}}>Month-over-month probability of a customer transitioning from one tier to another.</p>
        
        <div style={{ overflowX: 'auto', paddingBottom: '10px' }}>
          <table className="data-table" style={{borderCollapse: 'collapse', borderSpacing: 0}}>
            <thead>
              <tr>
                <th style={{position: 'sticky', left: 0, backgroundColor: '#fdfdfd', zIndex: 10}}>From Segment &darr;</th>
                <th>TO H</th>
                <th>TO M3</th>
                <th>TO M2</th>
                <th>TO M1</th>
                <th>TO L</th>
                <th>TO INACTIVE</th>
              </tr>
            </thead>
            <tbody>
              {migrationRates && migrationRates.map((row, idx) => (
                <tr key={idx}>
                  <td style={{fontWeight: 700, position: 'sticky', left: 0, backgroundColor: '#fff', borderRight: '1px solid rgba(0,0,0,0.05)'}}>
                    {row.From}
                  </td>
                  {['H', 'M3', 'M2', 'M1', 'L', 'Inactive'].map(toSeg => {
                    const val = row[toSeg];
                    return (
                      <td 
                        key={toSeg} 
                        style={{
                          backgroundColor: getColorOpacity(val), 
                          textAlign: 'center',
                          color: val > 0.4 ? '#fff' : 'inherit',
                          border: '1px solid rgba(255,255,255,0.2)'
                        }}
                      >
                        {val ? `${(val * 100).toFixed(1)}%` : '0%'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
