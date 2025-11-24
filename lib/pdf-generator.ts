/**
 * PDF Generation Utilities
 * 
 * This is a MOCK/PLACEHOLDER implementation for demo purposes.
 * 
 * For production, you would integrate:
 * 1. puppeteer (Chromium-based PDF generation from HTML)
 * 2. jsPDF (Client-side PDF generation)
 * 3. pdfkit (Node.js PDF generation)
 * 4. react-pdf/renderer (React components to PDF)
 * 
 * Installation:
 * ```bash
 * npm install puppeteer
 * # or
 * npm install jspdf
 * # or
 * npm install pdfkit
 * ```
 */

export interface InvoiceData {
  invoiceNumber: string;
  facilityName: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  dueDate: string;
  issuedAt: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  subtotal: number;
  shippingFee: number;
  tax: number;
  total: number;
}

/**
 * Generate Invoice HTML Template
 */
export function generateInvoiceHTML(data: InvoiceData): string {
  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>請求書 - ${data.invoiceNumber}</title>
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
    
    .invoice-number {
      font-size: 18px;
      color: #666;
      font-weight: bold;
    }
    
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    
    .info-box {
      flex: 1;
    }
    
    .info-box h2 {
      font-size: 14px;
      color: #666;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    
    .info-box p {
      font-size: 16px;
      margin-bottom: 5px;
    }
    
    .facility-name {
      font-size: 20px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 10px;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0;
    }
    
    .items-table thead {
      background-color: #f3f4f6;
    }
    
    .items-table th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #d1d5db;
    }
    
    .items-table td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .items-table .amount {
      text-align: right;
      font-weight: 600;
    }
    
    .totals-section {
      margin-left: auto;
      width: 350px;
      margin-top: 20px;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 16px;
    }
    
    .total-row.subtotal {
      border-top: 1px solid #d1d5db;
      padding-top: 12px;
    }
    
    .total-row.final {
      border-top: 3px solid #2563eb;
      margin-top: 12px;
      padding-top: 12px;
      font-size: 20px;
      font-weight: bold;
      color: #1e40af;
    }
    
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #d1d5db;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
    
    .payment-info {
      background-color: #eff6ff;
      padding: 20px;
      border-radius: 8px;
      margin-top: 30px;
      border-left: 4px solid #2563eb;
    }
    
    .payment-info h3 {
      color: #1e40af;
      margin-bottom: 10px;
      font-size: 16px;
    }
    
    .payment-info p {
      font-size: 14px;
      color: #374151;
      margin-bottom: 5px;
    }
    
    @media print {
      body {
        padding: 20px;
      }
      
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>請求書</h1>
    <p class="invoice-number">${data.invoiceNumber}</p>
  </div>
  
  <div class="info-section">
    <div class="info-box">
      <h2>請求先</h2>
      <p class="facility-name">${data.facilityName}</p>
    </div>
    
    <div class="info-box" style="text-align: right;">
      <h2>請求情報</h2>
      <p><strong>発行日:</strong> ${formatDate(data.issuedAt)}</p>
      <p><strong>支払期限:</strong> ${formatDate(data.dueDate)}</p>
      <p><strong>請求期間:</strong></p>
      <p>${formatDate(data.billingPeriodStart)}</p>
      <p>〜 ${formatDate(data.billingPeriodEnd)}</p>
    </div>
  </div>
  
  <table class="items-table">
    <thead>
      <tr>
        <th>品目</th>
        <th style="text-align: center;">数量</th>
        <th style="text-align: right;">単価</th>
        <th style="text-align: right;">金額</th>
      </tr>
    </thead>
    <tbody>
      ${data.items.map(item => `
        <tr>
          <td>${item.description}</td>
          <td style="text-align: center;">${item.quantity}</td>
          <td style="text-align: right;">${formatCurrency(item.unitPrice)}</td>
          <td class="amount">${formatCurrency(item.amount)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="totals-section">
    <div class="total-row subtotal">
      <span>小計</span>
      <span>${formatCurrency(data.subtotal)}</span>
    </div>
    ${data.shippingFee > 0 ? `
    <div class="total-row">
      <span>配送料</span>
      <span>${formatCurrency(data.shippingFee)}</span>
    </div>
    ` : ''}
    ${data.tax > 0 ? `
    <div class="total-row">
      <span>消費税</span>
      <span>${formatCurrency(data.tax)}</span>
    </div>
    ` : ''}
    <div class="total-row final">
      <span>合計金額</span>
      <span>${formatCurrency(data.total)}</span>
    </div>
  </div>
  
  <div class="payment-info">
    <h3>お支払い方法</h3>
    <p>支払期限までに下記口座へお振込みください。</p>
    <p style="margin-top: 10px;">
      <strong>銀行名:</strong> ○○銀行<br>
      <strong>支店名:</strong> △△支店<br>
      <strong>口座種別:</strong> 普通<br>
      <strong>口座番号:</strong> 1234567<br>
      <strong>口座名義:</strong> ESSC株式会社
    </p>
  </div>
  
  <div class="footer">
    <p><strong>ESSC株式会社</strong></p>
    <p>〒100-0001 東京都千代田区○○ 1-2-3</p>
    <p>TEL: 03-1234-5678 | Email: info@essc.co.jp</p>
    <p style="margin-top: 10px; font-size: 12px;">
      ※この請求書は自動生成されたものです。
    </p>
  </div>
</body>
</html>
  `;
}

/**
 * MOCK: Generate PDF (returns HTML for now)
 * 
 * In production, use puppeteer:
 * 
 * ```typescript
 * import puppeteer from 'puppeteer';
 * 
 * export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
 *   const browser = await puppeteer.launch();
 *   const page = await browser.newPage();
 *   
 *   const html = generateInvoiceHTML(data);
 *   await page.setContent(html);
 *   
 *   const pdf = await page.pdf({
 *     format: 'A4',
 *     printBackground: true,
 *     margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
 *   });
 *   
 *   await browser.close();
 *   return pdf;
 * }
 * ```
 */
export async function generateInvoicePDF(data: InvoiceData): Promise<string> {
  // MOCK: Return HTML instead of PDF for demo
  // In production, this would return a Buffer containing the PDF
  return generateInvoiceHTML(data);
}

/**
 * Get printable invoice URL
 */
export function getPrintableInvoiceURL(invoiceId: string): string {
  return `/api/invoices/${invoiceId}/pdf`;
}
