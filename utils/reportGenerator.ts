//utils/reportGenerator.ts
import { SleepLogEntry, Child } from '@/types';

export interface ReportData {
  child: Child;
  entries: SleepLogEntry[];
  totalSleepMinutes: number;
  date: string;
  staffMembers?: { initials: string; fullName: string }[];
}

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
