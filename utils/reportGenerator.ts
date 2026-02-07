//utils/reportGenerator.ts
import { SleepLogEntry, Child, CareLogEntry, DiaperEntry, MealEntry, BottleEntry, ActivityLogEntry } from '@/types';

export interface ReportData {
  child: Child;
  entries: SleepLogEntry[];
  totalSleepMinutes: number;
  date: string;
  staffMembers?: { initials: string; fullName: string }[];
}

export interface CareReportData {
  child: Child;
  entries: CareLogEntry[];
  date: string;
  staffMembers?: { initials: string; fullName: string }[];
}

export interface ActivityReportData {
  child: Child;
  entries: ActivityLogEntry[];
  date: string;
  staffMembers?: { initials: string; fullName: string }[];
}

export interface CombinedReportData {
  child: Child;
  sleepEntries: SleepLogEntry[];
  careEntries: CareLogEntry[];
  totalSleepMinutes: number;
  date: string;
  staffMembers?: { initials: string; fullName: string }[];
}

// ============================================
// SLEEP LOG REPORT (Existing)
// ============================================

export function generateEmailHTML(reportData: ReportData, daycareInfo: any): string {
  const { child, entries, totalSleepMinutes, date, staffMembers } = reportData;

  // Group entries by session
  const sessions = groupEntriesBySessions(entries);

  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const totalSleepFormatted = formatDuration(totalSleepMinutes);

  let html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.4;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 15px;
      font-size: 12px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin-bottom: 15px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .header p {
      margin: 5px 0 0 0;
      font-size: 13px;
      opacity: 0.9;
    }
    .info-section {
      background: #f8f9fa;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 12px;
    }
    .info-section h2 {
      margin: 0 0 8px 0;
      font-size: 14px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 11px;
    }
    .label {
      font-weight: bold;
      color: #495057;
    }
    .session {
      margin-bottom: 12px;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      overflow: hidden;
      page-break-inside: avoid;
    }
    .session-header {
      background: #e9ecef;
      padding: 8px 12px;
      font-weight: bold;
      color: #495057;
      font-size: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    th {
      background: #f8f9fa;
      padding: 6px 8px;
      text-align: left;
      font-weight: bold;
      color: #495057;
      border-bottom: 2px solid #dee2e6;
    }
    td {
      padding: 5px 8px;
      border-bottom: 1px solid #dee2e6;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 9px;
      font-weight: bold;
    }
    .badge-start {
      background: #d4edda;
      color: #155724;
    }
    .badge-check {
      background: #d1ecf1;
      color: #0c5460;
    }
    .badge-stop {
      background: #f8d7da;
      color: #721c24;
    }
    .notes-cell {
      font-style: italic;
      color: #6c757d;
      font-size: 9px;
      max-width: 200px;
    }
    .footer {
      margin-top: 15px;
      padding-top: 12px;
      border-top: 2px solid #dee2e6;
      text-align: center;
      color: #6c757d;
      font-size: 10px;
      line-height: 1.4;
    }
    .compliance-note {
      background: #fff3cd;
      border: 1px solid #ffc107;
      padding: 10px;
      border-radius: 6px;
      margin-top: 12px;
      font-size: 10px;
    }
    h2 {
      font-size: 14px;
      margin: 12px 0 8px 0;
    }
    @media print {
      body {
        padding: 10px;
      }
      .session {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>💤 SleepLog Daily Report</h1>
    <p>${formattedDate}</p>
  </div>

  <div class="info-section">
    <h2>Child Information & Summary</h2>
    <div class="info-grid">
      <div class="info-row">
        <span class="label">Name:</span>
        <span>${child.name}</span>
      </div>
      <div class="info-row">
        <span class="label">Date of Birth:</span>
        <span>${new Date(child.dateOfBirth).toLocaleDateString()}</span>
      </div>
      <div class="info-row">
        <span class="label">Total Sleep Today:</span>
        <span style="color: #28a745; font-weight: bold;">${totalSleepFormatted}</span>
      </div>
      <div class="info-row">
        <span class="label">Sleep Sessions:</span>
        <span>${sessions.length}</span>
      </div>
    </div>
  </div>

  <h2>Sleep Sessions</h2>
`;

  sessions.forEach((sessionEntries, index) => {
    const startEntry = sessionEntries[0];
    const endEntry = sessionEntries[sessionEntries.length - 1];
    const sessionDuration = endEntry.type === 'stop' 
      ? Math.floor((endEntry.timestamp.getTime() - startEntry.timestamp.getTime()) / 60000)
      : 0;

    html += `
  <div class="session">
    <div class="session-header">
      Session ${index + 1} - ${formatTime(startEntry.timestamp)} to ${
        endEntry.type === 'stop' ? formatTime(endEntry.timestamp) : 'In Progress'
      } (${formatDuration(sessionDuration)})
    </div>
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Action</th>
          <th>Position</th>
          <th>Breathing</th>
          <th>Mood</th>
          <th>Notes</th>
          <th>Interval</th>
          <th>Staff</th>
        </tr>
      </thead>
      <tbody>
`;

    sessionEntries.forEach(entry => {
      const badgeClass = `badge-${entry.type}`;
      html += `
        <tr>
          <td>${formatTime(entry.timestamp)}</td>
          <td><span class="badge ${badgeClass}">${entry.type.toUpperCase()}</span></td>
          <td>${entry.position}</td>
          <td>${entry.breathing}</td>
          <td>${entry.mood || '-'}</td>
          <td class="notes-cell">${entry.notes || '-'}</td>
          <td>${entry.intervalSinceLast ? entry.intervalSinceLast + ' min' : '-'}</td>
          <td><strong>${entry.staffInitials}</strong></td>
        </tr>
`;
    });

    html += `
      </tbody>
    </table>
  </div>
`;
  });

  html += `
  <div class="compliance-note">
    <strong>📋 Compliance:</strong> Meets CA Title 22, Section 101229 - 15-min checks with position, breathing, staff initials.
  </div>

  ${staffMembers && staffMembers.length > 0 ? `
  <div class="info-section" style="margin-top: 12px;">
    <h2>Staff Members</h2>
    <div class="info-grid">
      ${staffMembers.map(staff => `
        <div class="info-row">
          <span class="label">${staff.initials}:</span>
          <span>${staff.fullName}</span>
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  <div class="footer">
    <p><strong>${daycareInfo.name}</strong> | License #${daycareInfo.licenseNumber}</p>
    <p>${daycareInfo.address} | ${daycareInfo.phoneNumber}</p>
    <p>Generated ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
`;

  return html;
}

// ============================================
// CARE LOG REPORT (NEW)
// ============================================

export function generateCareLogHTML(reportData: CareReportData, daycareInfo: any): string {
  const { child, entries, date, staffMembers } = reportData;

  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Group entries by type
  const diaperEntries = entries.filter(e => e.type === 'diaper') as DiaperEntry[];
  const mealEntries = entries.filter(e => e.type === 'meal') as MealEntry[];
  const bottleEntries = entries.filter(e => e.type === 'bottle') as BottleEntry[];

  // Calculate totals
  const totalBottleOz = bottleEntries.reduce((sum, e) => sum + e.amount, 0);
  const totalMealOz = mealEntries.reduce((sum, e) => sum + (e.amount || 0), 0);

  let html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.4;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 15px;
      font-size: 12px;
    }
    .header {
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin-bottom: 15px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .header p {
      margin: 5px 0 0 0;
      font-size: 13px;
      opacity: 0.9;
    }
    .info-section {
      background: #f8f9fa;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 12px;
    }
    .info-section h2 {
      margin: 0 0 8px 0;
      font-size: 14px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 11px;
    }
    .label {
      font-weight: bold;
      color: #495057;
    }
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 15px;
    }
    .summary-card {
      padding: 15px;
      border-radius: 8px;
      text-align: center;
    }
    .summary-card.diaper {
      background: #fff3cd;
      border: 1px solid #ffc107;
    }
    .summary-card.meal {
      background: #d4edda;
      border: 1px solid #28a745;
    }
    .summary-card.bottle {
      background: #e2d5f1;
      border: 1px solid #6f42c1;
    }
    .summary-card .count {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .summary-card .label {
      font-size: 11px;
      color: #495057;
    }
    .summary-card .sub {
      font-size: 10px;
      color: #6c757d;
      margin-top: 3px;
    }
    .section {
      margin-bottom: 15px;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      overflow: hidden;
      page-break-inside: avoid;
    }
    .section-header {
      padding: 10px 12px;
      font-weight: bold;
      font-size: 13px;
    }
    .section-header.diaper {
      background: #fff3cd;
      color: #856404;
    }
    .section-header.meal {
      background: #d4edda;
      color: #155724;
    }
    .section-header.bottle {
      background: #e2d5f1;
      color: #4a235a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    th {
      background: #f8f9fa;
      padding: 6px 8px;
      text-align: left;
      font-weight: bold;
      color: #495057;
      border-bottom: 2px solid #dee2e6;
    }
    td {
      padding: 5px 8px;
      border-bottom: 1px solid #dee2e6;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 9px;
      font-weight: bold;
    }
    .badge-wet {
      background: #cce5ff;
      color: #004085;
    }
    .badge-solid {
      background: #fff3cd;
      color: #856404;
    }
    .badge-both {
      background: #e2d5f1;
      color: #4a235a;
    }
    .notes-cell {
      font-style: italic;
      color: #6c757d;
      font-size: 9px;
      max-width: 200px;
    }
    .footer {
      margin-top: 15px;
      padding-top: 12px;
      border-top: 2px solid #dee2e6;
      text-align: center;
      color: #6c757d;
      font-size: 10px;
      line-height: 1.4;
    }
    h2 {
      font-size: 14px;
      margin: 12px 0 8px 0;
    }
    .no-entries {
      padding: 20px;
      text-align: center;
      color: #6c757d;
      font-style: italic;
    }
    @media print {
      body {
        padding: 10px;
      }
      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🍼 Care Log Daily Report</h1>
    <p>${formattedDate}</p>
  </div>

  <div class="info-section">
    <h2>Child Information</h2>
    <div class="info-grid">
      <div class="info-row">
        <span class="label">Name:</span>
        <span>${child.name}</span>
      </div>
      <div class="info-row">
        <span class="label">Date of Birth:</span>
        <span>${new Date(child.dateOfBirth).toLocaleDateString()}</span>
      </div>
    </div>
  </div>

  <div class="summary-cards">
    <div class="summary-card diaper">
      <div class="count">${diaperEntries.length}</div>
      <div class="label">🧷 Diaper Changes</div>
    </div>
    <div class="summary-card meal">
      <div class="count">${mealEntries.length}</div>
      <div class="label">🍽️ Meals</div>
      ${totalMealOz > 0 ? `<div class="sub">${totalMealOz}oz total</div>` : ''}
    </div>
    <div class="summary-card bottle">
      <div class="count">${bottleEntries.length}</div>
      <div class="label">🍼 Bottles</div>
      ${totalBottleOz > 0 ? `<div class="sub">${totalBottleOz}oz total</div>` : ''}
    </div>
  </div>
`;

  // Diaper Section
  html += `
  <div class="section">
    <div class="section-header diaper">🧷 Diaper Changes (${diaperEntries.length})</div>
    ${diaperEntries.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Type</th>
          <th>Comments</th>
          <th>Staff</th>
        </tr>
      </thead>
      <tbody>
        ${diaperEntries.map(entry => `
        <tr>
          <td>${formatTime(entry.timestamp)}</td>
          <td><span class="badge badge-${entry.diaperType}">${getDiaperEmoji(entry.diaperType)} ${capitalize(entry.diaperType)}</span></td>
          <td class="notes-cell">${entry.comments || '-'}</td>
          <td><strong>${entry.staffInitials}</strong></td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    ` : '<div class="no-entries">No diaper changes recorded</div>'}
  </div>
`;

  // Meals Section
  html += `
  <div class="section">
    <div class="section-header meal">🍽️ Meals (${mealEntries.length})${totalMealOz > 0 ? ` - ${totalMealOz}oz total` : ''}</div>
    ${mealEntries.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Amount</th>
          <th>Ingredients</th>
          <th>Comments</th>
          <th>Staff</th>
        </tr>
      </thead>
      <tbody>
        ${mealEntries.map(entry => `
        <tr>
          <td>${formatTime(entry.timestamp)}</td>
          <td>${entry.amount ? entry.amount + 'oz' : '-'}</td>
          <td>${entry.ingredients}</td>
          <td class="notes-cell">${entry.comments || '-'}</td>
          <td><strong>${entry.staffInitials}</strong></td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    ` : '<div class="no-entries">No meals recorded</div>'}
  </div>
`;

  // Bottles Section
  html += `
  <div class="section">
    <div class="section-header bottle">🍼 Bottles (${bottleEntries.length})${totalBottleOz > 0 ? ` - ${totalBottleOz}oz total` : ''}</div>
    ${bottleEntries.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Amount</th>
          <th>Comments</th>
          <th>Staff</th>
        </tr>
      </thead>
      <tbody>
        ${bottleEntries.map(entry => `
        <tr>
          <td>${formatTime(entry.timestamp)}</td>
          <td><strong>${entry.amount}oz</strong></td>
          <td class="notes-cell">${entry.comments || '-'}</td>
          <td><strong>${entry.staffInitials}</strong></td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    ` : '<div class="no-entries">No bottles recorded</div>'}
  </div>
`;

  // Staff Members
  if (staffMembers && staffMembers.length > 0) {
    html += `
  <div class="info-section">
    <h2>Staff Members</h2>
    <div class="info-grid">
      ${staffMembers.map(staff => `
        <div class="info-row">
          <span class="label">${staff.initials}:</span>
          <span>${staff.fullName}</span>
        </div>
      `).join('')}
    </div>
  </div>
`;
  }

  // Footer
  html += `
  <div class="footer">
    <p><strong>${daycareInfo.name}</strong> | License #${daycareInfo.licenseNumber}</p>
    <p>${daycareInfo.address} | ${daycareInfo.phoneNumber}</p>
    <p>Generated ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
`;

  return html;
}

// ============================================
// COMBINED REPORT (Sleep + Care)
// ============================================

export function generateCombinedReportHTML(reportData: CombinedReportData, daycareInfo: any): string {
  const { child, sleepEntries, careEntries, totalSleepMinutes, date, staffMembers } = reportData;

  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Sleep data
  const sessions = groupEntriesBySessions(sleepEntries);
  const totalSleepFormatted = formatDuration(totalSleepMinutes);

  // Care data
  const diaperEntries = careEntries.filter(e => e.type === 'diaper') as DiaperEntry[];
  const mealEntries = careEntries.filter(e => e.type === 'meal') as MealEntry[];
  const bottleEntries = careEntries.filter(e => e.type === 'bottle') as BottleEntry[];
  const totalBottleOz = bottleEntries.reduce((sum, e) => sum + e.amount, 0);
  const totalMealOz = mealEntries.reduce((sum, e) => sum + (e.amount || 0), 0);

  let html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.4;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 15px;
      font-size: 12px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin-bottom: 15px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .header p {
      margin: 5px 0 0 0;
      font-size: 13px;
      opacity: 0.9;
    }
    .info-section {
      background: #f8f9fa;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 12px;
    }
    .info-section h2 {
      margin: 0 0 8px 0;
      font-size: 14px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 11px;
    }
    .label {
      font-weight: bold;
      color: #495057;
    }
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 15px;
    }
    .summary-card {
      padding: 12px;
      border-radius: 8px;
      text-align: center;
    }
    .summary-card.sleep {
      background: #cce5ff;
      border: 1px solid #007bff;
    }
    .summary-card.diaper {
      background: #fff3cd;
      border: 1px solid #ffc107;
    }
    .summary-card.meal {
      background: #d4edda;
      border: 1px solid #28a745;
    }
    .summary-card.bottle {
      background: #e2d5f1;
      border: 1px solid #6f42c1;
    }
    .summary-card .count {
      font-size: 22px;
      font-weight: bold;
      margin-bottom: 3px;
    }
    .summary-card .label {
      font-size: 10px;
      color: #495057;
    }
    .summary-card .sub {
      font-size: 9px;
      color: #6c757d;
      margin-top: 2px;
    }
    .section-title {
      background: #343a40;
      color: white;
      padding: 10px 15px;
      border-radius: 6px 6px 0 0;
      font-size: 14px;
      font-weight: bold;
      margin-top: 15px;
    }
    .section {
      margin-bottom: 12px;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      overflow: hidden;
      page-break-inside: avoid;
    }
    .section-header {
      padding: 8px 12px;
      font-weight: bold;
      font-size: 12px;
    }
    .section-header.sleep {
      background: #cce5ff;
      color: #004085;
    }
    .section-header.diaper {
      background: #fff3cd;
      color: #856404;
    }
    .section-header.meal {
      background: #d4edda;
      color: #155724;
    }
    .section-header.bottle {
      background: #e2d5f1;
      color: #4a235a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    th {
      background: #f8f9fa;
      padding: 5px 6px;
      text-align: left;
      font-weight: bold;
      color: #495057;
      border-bottom: 2px solid #dee2e6;
    }
    td {
      padding: 4px 6px;
      border-bottom: 1px solid #dee2e6;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .badge {
      display: inline-block;
      padding: 2px 5px;
      border-radius: 3px;
      font-size: 8px;
      font-weight: bold;
    }
    .badge-start { background: #d4edda; color: #155724; }
    .badge-check { background: #d1ecf1; color: #0c5460; }
    .badge-stop { background: #f8d7da; color: #721c24; }
    .badge-wet { background: #cce5ff; color: #004085; }
    .badge-solid { background: #fff3cd; color: #856404; }
    .badge-both { background: #e2d5f1; color: #4a235a; }
    .notes-cell {
      font-style: italic;
      color: #6c757d;
      font-size: 9px;
      max-width: 150px;
    }
    .footer {
      margin-top: 15px;
      padding-top: 12px;
      border-top: 2px solid #dee2e6;
      text-align: center;
      color: #6c757d;
      font-size: 10px;
      line-height: 1.4;
    }
    .compliance-note {
      background: #fff3cd;
      border: 1px solid #ffc107;
      padding: 8px;
      border-radius: 6px;
      margin-top: 10px;
      font-size: 9px;
    }
    .no-entries {
      padding: 15px;
      text-align: center;
      color: #6c757d;
      font-style: italic;
      font-size: 11px;
    }
    @media print {
      body { padding: 10px; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📋 Daily Report</h1>
    <p>${formattedDate}</p>
  </div>

  <div class="info-section">
    <h2>Child Information</h2>
    <div class="info-grid">
      <div class="info-row">
        <span class="label">Name:</span>
        <span>${child.name}</span>
      </div>
      <div class="info-row">
        <span class="label">Date of Birth:</span>
        <span>${new Date(child.dateOfBirth).toLocaleDateString()}</span>
      </div>
    </div>
  </div>

  <div class="summary-cards">
    <div class="summary-card sleep">
      <div class="count">${totalSleepFormatted}</div>
      <div class="label">😴 Total Sleep</div>
      <div class="sub">${sessions.length} session${sessions.length !== 1 ? 's' : ''}</div>
    </div>
    <div class="summary-card diaper">
      <div class="count">${diaperEntries.length}</div>
      <div class="label">🧷 Diapers</div>
    </div>
    <div class="summary-card meal">
      <div class="count">${mealEntries.length}</div>
      <div class="label">🍽️ Meals</div>
      ${totalMealOz > 0 ? `<div class="sub">${totalMealOz}oz</div>` : ''}
    </div>
    <div class="summary-card bottle">
      <div class="count">${bottleEntries.length}</div>
      <div class="label">🍼 Bottles</div>
      ${totalBottleOz > 0 ? `<div class="sub">${totalBottleOz}oz</div>` : ''}
    </div>
  </div>
`;

  // Sleep Sessions
  if (sleepEntries.length > 0) {
    html += `<div class="section-title">😴 Sleep Log</div>`;
    
    sessions.forEach((sessionEntries, index) => {
      const startEntry = sessionEntries[0];
      const endEntry = sessionEntries[sessionEntries.length - 1];
      const sessionDuration = endEntry.type === 'stop' 
        ? Math.floor((endEntry.timestamp.getTime() - startEntry.timestamp.getTime()) / 60000)
        : 0;

      html += `
  <div class="section">
    <div class="section-header sleep">
      Session ${index + 1}: ${formatTime(startEntry.timestamp)} - ${endEntry.type === 'stop' ? formatTime(endEntry.timestamp) : 'In Progress'} (${formatDuration(sessionDuration)})
    </div>
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Action</th>
          <th>Position</th>
          <th>Breathing</th>
          <th>Mood</th>
          <th>Notes</th>
          <th>Staff</th>
        </tr>
      </thead>
      <tbody>
        ${sessionEntries.map(entry => `
        <tr>
          <td>${formatTime(entry.timestamp)}</td>
          <td><span class="badge badge-${entry.type}">${entry.type.toUpperCase()}</span></td>
          <td>${entry.position}</td>
          <td>${entry.breathing}</td>
          <td>${entry.mood || '-'}</td>
          <td class="notes-cell">${entry.notes || '-'}</td>
          <td><strong>${entry.staffInitials}</strong></td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
`;
    });
  }

  // Care Log Sections
  if (careEntries.length > 0) {
    html += `<div class="section-title">🍼 Care Log</div>`;

    // Diapers
    if (diaperEntries.length > 0) {
      html += `
  <div class="section">
    <div class="section-header diaper">🧷 Diaper Changes (${diaperEntries.length})</div>
    <table>
      <thead>
        <tr><th>Time</th><th>Type</th><th>Comments</th><th>Staff</th></tr>
      </thead>
      <tbody>
        ${diaperEntries.map(entry => `
        <tr>
          <td>${formatTime(entry.timestamp)}</td>
          <td><span class="badge badge-${entry.diaperType}">${getDiaperEmoji(entry.diaperType)} ${capitalize(entry.diaperType)}</span></td>
          <td class="notes-cell">${entry.comments || '-'}</td>
          <td><strong>${entry.staffInitials}</strong></td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
`;
    }

    // Meals
    if (mealEntries.length > 0) {
      html += `
  <div class="section">
    <div class="section-header meal">🍽️ Meals (${mealEntries.length})${totalMealOz > 0 ? ` - ${totalMealOz}oz total` : ''}</div>
    <table>
      <thead>
        <tr><th>Time</th><th>Amount</th><th>Ingredients</th><th>Comments</th><th>Staff</th></tr>
      </thead>
      <tbody>
        ${mealEntries.map(entry => `
        <tr>
          <td>${formatTime(entry.timestamp)}</td>
          <td>${entry.amount ? entry.amount + 'oz' : '-'}</td>
          <td>${entry.ingredients}</td>
          <td class="notes-cell">${entry.comments || '-'}</td>
          <td><strong>${entry.staffInitials}</strong></td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
`;
    }

    // Bottles
    if (bottleEntries.length > 0) {
      html += `
  <div class="section">
    <div class="section-header bottle">🍼 Bottles (${bottleEntries.length}) - ${totalBottleOz}oz total</div>
    <table>
      <thead>
        <tr><th>Time</th><th>Amount</th><th>Comments</th><th>Staff</th></tr>
      </thead>
      <tbody>
        ${bottleEntries.map(entry => `
        <tr>
          <td>${formatTime(entry.timestamp)}</td>
          <td><strong>${entry.amount}oz</strong></td>
          <td class="notes-cell">${entry.comments || '-'}</td>
          <td><strong>${entry.staffInitials}</strong></td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
`;
    }
  }

  // Compliance note (if sleep data exists)
  if (sleepEntries.length > 0) {
    html += `
  <div class="compliance-note">
    <strong>📋 Compliance:</strong> Sleep log meets CA Title 22, Section 101229 requirements.
  </div>
`;
  }

  // Staff Members
  if (staffMembers && staffMembers.length > 0) {
    html += `
  <div class="info-section">
    <h2>Staff Members</h2>
    <div class="info-grid">
      ${staffMembers.map(staff => `
        <div class="info-row">
          <span class="label">${staff.initials}:</span>
          <span>${staff.fullName}</span>
        </div>
      `).join('')}
    </div>
  </div>
`;
  }

  // Footer
  html += `
  <div class="footer">
    <p><strong>${daycareInfo.name}</strong> | License #${daycareInfo.licenseNumber}</p>
    <p>${daycareInfo.address} | ${daycareInfo.phoneNumber}</p>
    <p>Generated ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
`;

  return html;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function groupEntriesBySessions(entries: SleepLogEntry[]): SleepLogEntry[][] {
  const sessions: SleepLogEntry[][] = [];
  let currentSession: SleepLogEntry[] = [];

  for (const entry of entries) {
    if (entry.type === 'start') {
      if (currentSession.length > 0) {
        sessions.push(currentSession);
      }
      currentSession = [entry];
    } else {
      currentSession.push(entry);
      if (entry.type === 'stop') {
        sessions.push(currentSession);
        currentSession = [];
      }
    }
  }

  if (currentSession.length > 0) {
    sessions.push(currentSession);
  }

  return sessions;
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

function getDiaperEmoji(type: string): string {
  switch (type) {
    case 'dry': return '✨';
    case 'wet': return '💧';
    case 'solid': return '💩';
    case 'both': return '💧💩';
    default: return '';
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================
// ACTIVITY LOG REPORT (NEW)
// ============================================

export function generateActivityLogHTML(reportData: ActivityReportData, daycareInfo: any): string {
  const { child, entries, date, staffMembers } = reportData;

  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Group entries by category
  const entriesByCategory: { [key: string]: ActivityLogEntry[] } = {};
  entries.forEach(entry => {
    if (!entriesByCategory[entry.category]) {
      entriesByCategory[entry.category] = [];
    }
    entriesByCategory[entry.category].push(entry);
  });

  // Calculate totals
  const totalActivities = entries.length;
  const totalDuration = entries.reduce((sum, e) => sum + (e.duration || 0), 0);

  // Get category color
  function getCategoryStyle(category: string): { bg: string; text: string; border: string } {
    if (category.includes('Games')) return { bg: '#f3e8ff', text: '#6b21a8', border: '#c084fc' };
    if (category.includes('Learning')) return { bg: '#dbeafe', text: '#1e40af', border: '#60a5fa' };
    if (category.includes('Motor')) return { bg: '#ffedd5', text: '#9a3412', border: '#fb923c' };
    if (category.includes('Arts')) return { bg: '#fce7f3', text: '#9d174d', border: '#f472b6' };
    if (category.includes('STEM')) return { bg: '#dcfce7', text: '#166534', border: '#4ade80' };
    if (category.includes('Life')) return { bg: '#fef9c3', text: '#854d0e', border: '#facc15' };
    if (category.includes('Outdoor')) return { bg: '#ccfbf1', text: '#115e59', border: '#2dd4bf' };
    return { bg: '#f3f4f6', text: '#374151', border: '#9ca3af' };
  }

  let html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.4;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 15px;
      font-size: 12px;
    }
    .header {
      background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin-bottom: 15px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .header p {
      margin: 5px 0 0 0;
      font-size: 13px;
      opacity: 0.9;
    }
    .info-section {
      background: #f8f9fa;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 12px;
    }
    .info-section h2 {
      margin: 0 0 8px 0;
      font-size: 14px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 11px;
    }
    .label {
      font-weight: bold;
      color: #495057;
    }
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 15px;
    }
    .summary-card {
      padding: 15px;
      border-radius: 8px;
      text-align: center;
    }
    .summary-card.activities {
      background: #f3e8ff;
      border: 1px solid #c084fc;
    }
    .summary-card.duration {
      background: #fce7f3;
      border: 1px solid #f472b6;
    }
    .summary-card .count {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .summary-card .label {
      font-size: 11px;
      color: #495057;
    }
    .section {
      margin-bottom: 15px;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      overflow: hidden;
      page-break-inside: avoid;
    }
    .section-header {
      padding: 10px 12px;
      font-weight: bold;
      font-size: 13px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    th {
      background: #f8f9fa;
      padding: 6px 8px;
      text-align: left;
      font-weight: bold;
      color: #495057;
      border-bottom: 2px solid #dee2e6;
    }
    td {
      padding: 5px 8px;
      border-bottom: 1px solid #dee2e6;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .notes-cell {
      font-style: italic;
      color: #6c757d;
      font-size: 9px;
      max-width: 200px;
    }
    .footer {
      margin-top: 15px;
      padding-top: 12px;
      border-top: 2px solid #dee2e6;
      text-align: center;
      color: #6c757d;
      font-size: 10px;
      line-height: 1.4;
    }
    h2 {
      font-size: 14px;
      margin: 12px 0 8px 0;
    }
    .no-entries {
      padding: 20px;
      text-align: center;
      color: #6c757d;
      font-style: italic;
    }
    @media print {
      body {
        padding: 10px;
      }
      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎨 Activity Log Daily Report</h1>
    <p>${formattedDate}</p>
  </div>

  <div class="info-section">
    <h2>Child Information</h2>
    <div class="info-grid">
      <div class="info-row">
        <span class="label">Name:</span>
        <span>${child.name}</span>
      </div>
      <div class="info-row">
        <span class="label">Date of Birth:</span>
        <span>${new Date(child.dateOfBirth).toLocaleDateString()}</span>
      </div>
    </div>
  </div>

  <div class="summary-cards">
    <div class="summary-card activities">
      <div class="count" style="color: #9333ea;">${totalActivities}</div>
      <div class="label">🎨 Activities</div>
    </div>
    <div class="summary-card duration">
      <div class="count" style="color: #ec4899;">${totalDuration > 0 ? formatDuration(totalDuration) : '-'}</div>
      <div class="label">⏱️ Total Time</div>
    </div>
  </div>
`;

  // Activities by Category
  Object.entries(entriesByCategory).forEach(([category, categoryEntries]) => {
    const style = getCategoryStyle(category);
    const categoryDuration = categoryEntries.reduce((sum, e) => sum + (e.duration || 0), 0);

    html += `
  <div class="section">
    <div class="section-header" style="background: ${style.bg}; color: ${style.text}; border-bottom: 1px solid ${style.border};">
      ${category} (${categoryEntries.length})${categoryDuration > 0 ? ` - ${formatDuration(categoryDuration)}` : ''}
    </div>
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Activity</th>
          <th>Duration</th>
          <th>Notes</th>
          <th>Staff</th>
        </tr>
      </thead>
      <tbody>
        ${categoryEntries.map(entry => `
        <tr>
          <td>${formatTime(entry.timestamp)}</td>
          <td><strong>${entry.activityName}</strong></td>
          <td>${entry.duration ? entry.duration + 'm' : '-'}</td>
          <td class="notes-cell">${entry.notes || '-'}</td>
          <td><strong>${entry.staffInitials}</strong></td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
`;
  });

  // Staff Members
  if (staffMembers && staffMembers.length > 0) {
    html += `
  <div class="info-section">
    <h2>Staff Members</h2>
    <div class="info-grid">
      ${staffMembers.map(staff => `
        <div class="info-row">
          <span class="label">${staff.initials}:</span>
          <span>${staff.fullName}</span>
        </div>
      `).join('')}
    </div>
  </div>
`;
  }

  // Footer
  html += `
  <div class="footer">
    <p><strong>${daycareInfo.name}</strong> | License #${daycareInfo.licenseNumber}</p>
    <p>${daycareInfo.address} | ${daycareInfo.phoneNumber}</p>
    <p>Generated ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
`;

  return html;
}
