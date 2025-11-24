/**
 * Report PDF Generation Utilities
 * 
 * Mock implementation for demo purposes.
 * For production, integrate with puppeteer or jsPDF.
 */

export interface ReportData {
  reportType: 'analytics' | 'campaign' | 'facility' | 'custom';
  title: string;
  generatedAt: string;
  period: {
    start: string;
    end: string;
  };
  summary?: {
    totalUsers?: number;
    totalCampaigns?: number;
    totalScans?: number;
    totalPurchases?: number;
    totalRevenue?: number;
    conversionRate?: number;
  };
  sections: Array<{
    title: string;
    type: 'kpi' | 'table' | 'chart' | 'text';
    data: any;
  }>;
  footer?: string;
}

/**
 * Generate Analytics Report HTML
 */
export function generateAnalyticsReportHTML(data: ReportData): string {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatNumber = (num: number) => num.toLocaleString();
  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;
  const formatPercent = (rate: number) => `${(rate * 100).toFixed(2)}%`;

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif;
      padding: 40px;
      color: #333;
      line-height: 1.6;
    }
    
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #2563eb;
    }
    
    .header h1 {
      font-size: 32px;
      color: #2563eb;
      margin-bottom: 10px;
    }
    
    .header .subtitle {
      font-size: 18px;
      color: #666;
      margin-bottom: 20px;
    }
    
    .header .meta {
      font-size: 14px;
      color: #666;
    }
    
    .summary-section {
      background-color: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 30px;
      margin-bottom: 40px;
    }
    
    .summary-section h2 {
      font-size: 24px;
      color: #1e40af;
      margin-bottom: 20px;
    }
    
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
    
    .kpi-card {
      background-color: white;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 20px;
      text-align: center;
    }
    
    .kpi-label {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 8px;
    }
    
    .kpi-value {
      font-size: 32px;
      font-weight: bold;
      color: #1e40af;
    }
    
    .section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 20px;
      color: #1e40af;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    
    .data-table thead {
      background-color: #f3f4f6;
    }
    
    .data-table th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #d1d5db;
    }
    
    .data-table td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .data-table tr:hover {
      background-color: #f9fafb;
    }
    
    .chart-placeholder {
      background-color: #f3f4f6;
      border: 2px dashed #d1d5db;
      border-radius: 8px;
      padding: 60px;
      text-align: center;
      color: #6b7280;
      margin: 20px 0;
    }
    
    .text-content {
      line-height: 1.8;
      color: #374151;
    }
    
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #d1d5db;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
    
    .footer p {
      margin-bottom: 5px;
    }
    
    @media print {
      body {
        padding: 20px;
      }
      
      .no-print {
        display: none;
      }
      
      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${data.title}</h1>
    <p class="subtitle">${data.reportType === 'analytics' ? '全体分析レポート' : 'カスタムレポート'}</p>
    <div class="meta">
      <p><strong>期間:</strong> ${formatDate(data.period.start)} 〜 ${formatDate(data.period.end)}</p>
      <p><strong>生成日時:</strong> ${formatDate(data.generatedAt)}</p>
    </div>
  </div>
  
  ${data.summary ? `
  <div class="summary-section">
    <h2>📊 サマリー</h2>
    <div class="kpi-grid">
      ${data.summary.totalUsers !== undefined ? `
        <div class="kpi-card">
          <div class="kpi-label">総ユーザー数</div>
          <div class="kpi-value">${formatNumber(data.summary.totalUsers)}</div>
        </div>
      ` : ''}
      ${data.summary.totalCampaigns !== undefined ? `
        <div class="kpi-card">
          <div class="kpi-label">総キャンペーン数</div>
          <div class="kpi-value">${formatNumber(data.summary.totalCampaigns)}</div>
        </div>
      ` : ''}
      ${data.summary.totalScans !== undefined ? `
        <div class="kpi-card">
          <div class="kpi-label">総スキャン数</div>
          <div class="kpi-value">${formatNumber(data.summary.totalScans)}</div>
        </div>
      ` : ''}
      ${data.summary.totalPurchases !== undefined ? `
        <div class="kpi-card">
          <div class="kpi-label">総購入数</div>
          <div class="kpi-value">${formatNumber(data.summary.totalPurchases)}</div>
        </div>
      ` : ''}
      ${data.summary.totalRevenue !== undefined ? `
        <div class="kpi-card">
          <div class="kpi-label">総売上</div>
          <div class="kpi-value">${formatCurrency(data.summary.totalRevenue)}</div>
        </div>
      ` : ''}
      ${data.summary.conversionRate !== undefined ? `
        <div class="kpi-card">
          <div class="kpi-label">コンバージョン率</div>
          <div class="kpi-value">${formatPercent(data.summary.conversionRate)}</div>
        </div>
      ` : ''}
    </div>
  </div>
  ` : ''}
  
  ${data.sections.map((section) => {
    if (section.type === 'kpi') {
      return `
        <div class="section">
          <h3 class="section-title">${section.title}</h3>
          <div class="kpi-grid">
            ${Object.entries(section.data).map(([key, value]: [string, any]) => `
              <div class="kpi-card">
                <div class="kpi-label">${key}</div>
                <div class="kpi-value">${typeof value === 'number' ? formatNumber(value) : value}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else if (section.type === 'table') {
      return `
        <div class="section">
          <h3 class="section-title">${section.title}</h3>
          <table class="data-table">
            <thead>
              <tr>
                ${section.data.headers.map((header: string) => `<th>${header}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${section.data.rows.map((row: any[]) => `
                <tr>
                  ${row.map((cell) => `<td>${cell}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else if (section.type === 'chart') {
      return `
        <div class="section">
          <h3 class="section-title">${section.title}</h3>
          <div class="chart-placeholder">
            <p>📈 グラフプレースホルダー</p>
            <p style="font-size: 12px; margin-top: 10px;">
              本番環境では、Chart.js等でグラフを表示します
            </p>
          </div>
        </div>
      `;
    } else if (section.type === 'text') {
      return `
        <div class="section">
          <h3 class="section-title">${section.title}</h3>
          <div class="text-content">
            ${section.data}
          </div>
        </div>
      `;
    }
    return '';
  }).join('')}
  
  <div class="footer">
    <p><strong>ESSC株式会社</strong></p>
    <p>〒100-0001 東京都千代田区○○ 1-2-3</p>
    <p>TEL: 03-1234-5678 | Email: info@essc.co.jp</p>
    ${data.footer ? `<p style="margin-top: 10px;">${data.footer}</p>` : ''}
    <p style="margin-top: 10px; font-size: 12px; color: #9ca3af;">
      このレポートは自動生成されました - ${formatDate(data.generatedAt)}
    </p>
  </div>
</body>
</html>
  `;
}

/**
 * Mock: Generate Report PDF
 * Returns HTML for demo, would return PDF Buffer in production
 */
export async function generateReportPDF(data: ReportData): Promise<string> {
  // In production with puppeteer:
  // const browser = await puppeteer.launch();
  // const page = await browser.newPage();
  // await page.setContent(generateAnalyticsReportHTML(data));
  // const pdf = await page.pdf({ format: 'A4', printBackground: true });
  // await browser.close();
  // return pdf;
  
  return generateAnalyticsReportHTML(data);
}

/**
 * Generate CSV export
 */
export function generateCSV(headers: string[], rows: any[][]): string {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      // Escape commas and quotes
      if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(','))
  ].join('\n');
  
  return csvContent;
}

/**
 * Get printable report URL
 */
export function getPrintableReportURL(reportId: string, reportType: string): string {
  return `/api/reports/${reportType}/${reportId}/pdf`;
}
