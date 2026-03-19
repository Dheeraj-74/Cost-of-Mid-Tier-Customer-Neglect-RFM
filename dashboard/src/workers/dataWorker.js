import Papa from 'papaparse';

self.onmessage = async function(e) {
  if (e.data.type === 'START_PROCESSING') {
    try {
      // Parse the large CSV directly via URL to save main thread memory
      Papa.parse('/transactions.csv', {
        download: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function(results) {
          const data = results.data;
          
          self.postMessage({ type: 'PROGRESS', payload: 'Aggregating Data...' });
          
          // Data Structures for Results
          const revenueBySegmentMonth = {};
          const uniqueCustomersBySegmentMonth = {};
          
          // AOV Data
          const invoiceTotals = {}; // { YYYY-MM: { invoiceNo: total } }
          
          // Cohort Data
          const customerFirstMonth = {}; // { customerId: 'YYYY-MM' }
          
          // Migration & Churn Data
          const customerMonthlySegments = {}; // { customerId: { 'YYYY-MM': segment, ... } }
          
          // Product Data
          const productRevenueMidTier = {}; // { Description: revenue }
          
          data.forEach(row => {
            const dateStr = row.InvoiceDate;
            if (!dateStr || !row.CustomerID) return;
            
            // Assuming format is parseable, e.g., YYYY-MM-DD
            const dateObj = new Date(dateStr);
            const yyyy = dateObj.getFullYear();
            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
            const monthStr = `${yyyy}-${mm}`;
            
            const segment = row.Extended_Segment || 'Unknown';
            const price = parseFloat(row.TotalPrice) || 0;
            const customerId = row.CustomerID;
            const invoiceNo = row.InvoiceNo;
            
            // 1. Revenue & Customers by Segment & Month
            if (!revenueBySegmentMonth[monthStr]) revenueBySegmentMonth[monthStr] = {};
            if (!revenueBySegmentMonth[monthStr][segment]) revenueBySegmentMonth[monthStr][segment] = 0;
            revenueBySegmentMonth[monthStr][segment] += price;
            
            if (!uniqueCustomersBySegmentMonth[monthStr]) uniqueCustomersBySegmentMonth[monthStr] = {};
            if (!uniqueCustomersBySegmentMonth[monthStr][segment]) uniqueCustomersBySegmentMonth[monthStr][segment] = new Set();
            uniqueCustomersBySegmentMonth[monthStr][segment].add(customerId);
            
            // 2. AOV
            if (!invoiceTotals[monthStr]) invoiceTotals[monthStr] = {};
            if (!invoiceTotals[monthStr][invoiceNo]) invoiceTotals[monthStr][invoiceNo] = 0;
            invoiceTotals[monthStr][invoiceNo] += price;
            
            // 3. Cohort First Month recording
            if (!customerFirstMonth[customerId]) {
              customerFirstMonth[customerId] = monthStr;
            } else {
              if (monthStr < customerFirstMonth[customerId]) {
                customerFirstMonth[customerId] = monthStr;
              }
            }
            
            // 4. Migration & Churn tracking
            if (!customerMonthlySegments[customerId]) customerMonthlySegments[customerId] = {};
            customerMonthlySegments[customerId][monthStr] = segment;
            
            // 5. Top Products (Mid-Tier only: M1, M2, M3)
            if (['M1', 'M2', 'M3'].includes(segment) && row.Description) {
                const desc = String(row.Description).trim();
                if (desc) {
                    productRevenueMidTier[desc] = (productRevenueMidTier[desc] || 0) + price;
                }
            }
          });
          
          self.postMessage({ type: 'PROGRESS', payload: 'Finalizing Metrics...' });

          // Finalize AOV
          const aovTrend = [];
          Object.keys(invoiceTotals).sort().forEach(month => {
            const invoices = Object.values(invoiceTotals[month]);
            const totalRevenue = invoices.reduce((sum, val) => sum + val, 0);
            const aov = totalRevenue / invoices.length;
            aovTrend.push({ Month: month, AOV: aov });
          });
          
          // Formatting Revenue & Customer Trends for Recharts
          const monthlyRevenue = [];
          const monthlyCustomers = [];
          const allMonths = Object.keys(revenueBySegmentMonth).sort();
          
          allMonths.forEach(month => {
            const revRow = { Month: month };
            const custRow = { Month: month };
            ['L', 'M1', 'M2', 'M3', 'H'].forEach(seg => {
              revRow[seg] = revenueBySegmentMonth[month][seg] || 0;
              custRow[seg] = uniqueCustomersBySegmentMonth[month][seg] ? uniqueCustomersBySegmentMonth[month][seg].size : 0;
            });
            monthlyRevenue.push(revRow);
            monthlyCustomers.push(custRow);
          });
          
          // 4. Cohort Retention Matrix
          const cohortCounts = {}; // { 'CohortMonth': { 1: count, 2: count } }
          data.forEach(row => {
            const dateStr = row.InvoiceDate;
            if (!dateStr || !row.CustomerID) return;
            const dateObj = new Date(dateStr);
            const invoiceMonthStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
            const customerId = row.CustomerID;
            const cohortMonth = customerFirstMonth[customerId];
            
            if (!cohortMonth) return;
            
            const cYear = parseInt(cohortMonth.split('-')[0]);
            const cMonth = parseInt(cohortMonth.split('-')[1]);
            const iYear = parseInt(invoiceMonthStr.split('-')[0]);
            const iMonth = parseInt(invoiceMonthStr.split('-')[1]);
            
            const monthDiff = (iYear - cYear) * 12 + (iMonth - cMonth) + 1;
            
            if (!cohortCounts[cohortMonth]) cohortCounts[cohortMonth] = {};
            if (!cohortCounts[cohortMonth][monthDiff]) cohortCounts[cohortMonth][monthDiff] = new Set();
            cohortCounts[cohortMonth][monthDiff].add(customerId);
          });
          
          const retentionMatrix = [];
          Object.keys(cohortCounts).sort().forEach(cMonth => {
             const row = { Cohort: cMonth };
             const initialCount = cohortCounts[cMonth][1] ? cohortCounts[cMonth][1].size : 0;
             row.cohortSize = initialCount;
             
             Object.keys(cohortCounts[cMonth]).forEach(monthIndex => {
                 const size = cohortCounts[cMonth][monthIndex].size;
                 row[`Month ${monthIndex}`] = initialCount > 0 ? (size / initialCount) : 0;
             });
             retentionMatrix.push(row);
          });
          
          // 5. Segment Migration & Churn Processing
          const migrationMatrix = {
              'H': { 'H': 0, 'M3': 0, 'M2': 0, 'M1': 0, 'L': 0, 'Inactive': 0 },
              'M3': { 'H': 0, 'M3': 0, 'M2': 0, 'M1': 0, 'L': 0, 'Inactive': 0 },
              'M2': { 'H': 0, 'M3': 0, 'M2': 0, 'M1': 0, 'L': 0, 'Inactive': 0 },
              'M1': { 'H': 0, 'M3': 0, 'M2': 0, 'M1': 0, 'L': 0, 'Inactive': 0 },
              'L': { 'H': 0, 'M3': 0, 'M2': 0, 'M1': 0, 'L': 0, 'Inactive': 0 }
          };
          
          const churnDataMap = {}; // { 'YYYY-MM': { totalMidTier: 0, churnedToLowOrInactive: 0 } }
          
          Object.values(customerMonthlySegments).forEach(history => {
              const months = Object.keys(history).sort();
              // Calculate overall migration (ignoring exact month timing for total matrix)
              for (let i = 0; i < months.length - 1; i++) {
                  const currentMonth = months[i];
                  const nextMonth = months[i+1];
                  const currentSeg = history[currentMonth];
                  const nextSeg = history[nextMonth];
                  
                  // Simple hack to detect if next month is strictly chronological
                  const currDate = new Date(`${currentMonth}-01`);
                  const nextDate = new Date(`${nextMonth}-01`);
                  const diffMonths = (nextDate.getFullYear() - currDate.getFullYear()) * 12 + (nextDate.getMonth() - currDate.getMonth());
                  
                  if (diffMonths === 1) {
                      if (migrationMatrix[currentSeg] && migrationMatrix[currentSeg][nextSeg] !== undefined) {
                          migrationMatrix[currentSeg][nextSeg]++;
                      }
                  } else {
                       // They were inactive for the immediate next month
                       if (migrationMatrix[currentSeg]) {
                           migrationMatrix[currentSeg]['Inactive']++;
                       }
                  }
                  
                  // Churn Rate tracking for Mid-Tier
                  // A churn event here is defined as M1/M2/M3 transitioning to L or Inactive in the next chronological month
                  if (['M1', 'M2', 'M3'].includes(currentSeg)) {
                      if (!churnDataMap[currentMonth]) churnDataMap[currentMonth] = { total: 0, churned: 0 };
                      churnDataMap[currentMonth].total++;
                      
                      if (diffMonths !== 1 || nextSeg === 'L') {
                          churnDataMap[currentMonth].churned++;
                      }
                  }
              }
              // Handle the last active month (assume inactive next month if it's not the last month of the dataset)
              const lastMonthInHistory = months[months.length - 1];
              if (lastMonthInHistory !== allMonths[allMonths.length - 1]) {
                   const lastSeg = history[lastMonthInHistory];
                   if (migrationMatrix[lastSeg]) migrationMatrix[lastSeg]['Inactive']++;
                   
                   if (['M1', 'M2', 'M3'].includes(lastSeg)) {
                      if (!churnDataMap[lastMonthInHistory]) churnDataMap[lastMonthInHistory] = { total: 0, churned: 0 };
                      churnDataMap[lastMonthInHistory].total++;
                      churnDataMap[lastMonthInHistory].churned++;
                   }
              }
          });
          
          // Normalize migration matrix to percentages per row
          const migrationRates = [];
          ['H', 'M3', 'M2', 'M1', 'L'].forEach(fromSeg => {
              const rowSum = Object.values(migrationMatrix[fromSeg]).reduce((a, b) => a + b, 0);
              const formattedRow = { From: fromSeg };
              ['H', 'M3', 'M2', 'M1', 'L', 'Inactive'].forEach(toSeg => {
                  formattedRow[toSeg] = rowSum > 0 ? (migrationMatrix[fromSeg][toSeg] / rowSum) : 0;
              });
              migrationRates.push(formattedRow);
          });
          
          // Format Churn Data
          const churnTrend = [];
          // Skip the very last month of the dataset since we don't know future churn
          const monthsForChurn = allMonths.slice(0, -1); 
          monthsForChurn.forEach(month => {
              const d = churnDataMap[month];
              if (d && d.total > 0) {
                  const rate = d.churned / d.total;
                  // Estimate lost revenue based on AOV * churned count (simplified)
                  const avgAovForMonth = aovTrend.find(a => a.Month === month)?.AOV || 0;
                  const estLostRev = d.churned * avgAovForMonth;
                  churnTrend.push({ Month: month, ChurnRate: rate, LostRevenue: estLostRev });
              } else {
                  churnTrend.push({ Month: month, ChurnRate: 0, LostRevenue: 0 });
              }
          });
          
          // 6. Top Products
          const topProducts = Object.entries(productRevenueMidTier)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([desc, rev]) => ({ Product: desc, Revenue: rev }));

          // Post Everything Back
          self.postMessage({
            type: 'COMPLETE',
            payload: {
              aovTrend,
              monthlyRevenue,
              monthlyCustomers,
              retentionMatrix,
              migrationRates,
              churnTrend,
              topProducts
            }
          });
        },
        error: function(err) {
          self.postMessage({ type: 'ERROR', payload: err.message });
        }
      });
      
    } catch (err) {
      self.postMessage({ type: 'ERROR', payload: err.message });
    }
  }
};
