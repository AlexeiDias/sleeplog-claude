//components/HistoricalChildCard.tsx
import React, { useState, useEffect } from 'react';
import { Child, SleepLogEntry } from '@/types';
import { collection, query, getDocs, orderBy, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Button from './Button';
import SleepLogTable from './SleepLogTable';
import { generateEmailHTML } from '@/utils/reportGenerator';

interface HistoricalChildCardProps {
  child: Child;
  selectedDate: string;
}

export default function HistoricalChildCard({ child, selectedDate }: HistoricalChildCardProps) {
  const [entries, setEntries] = useState<SleepLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSleepMinutes, setTotalSleepMinutes] = useState(0);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    fetchHistoricalData();
  }, [child.id, selectedDate]);

  async function fetchHistoricalData() {
    setLoading(true);

    try {
      const logsRef = collection(db, 'children', child.id, 'sleepLogs', selectedDate, 'entries');
      const q = query(logsRef, orderBy('timestamp', 'asc'));
      const snapshot = await getDocs(q);

      const entriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date(),
      })) as SleepLogEntry[];

      setEntries(entriesData);
      calculateTotalSleep(entriesData);
    } catch (error) {
      console.error('Error fetching historical data:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateTotalSleep(entries: SleepLogEntry[]) {
    let total = 0;
    let sessionStart: Date | null = null;

    for (const entry of entries) {
      if (entry.type === 'start') {
        sessionStart = entry.timestamp;
      } else if (entry.type === 'stop' && sessionStart) {
        const duration = Math.floor((entry.timestamp.getTime() - sessionStart.getTime()) / 60000);
        total += duration;
        sessionStart = null;
      }
    }

    setTotalSleepMinutes(total);
  }

  function formatTotalSleep(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  function calculateAge(dateOfBirth: Date): string {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    const ageInMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + 
                        (today.getMonth() - birthDate.getMonth());
    
    if (ageInMonths < 12) {
      return `${ageInMonths} month${ageInMonths !== 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(ageInMonths / 12);
      const months = ageInMonths % 12;
      return months > 0 ? `${years}y ${months}m` : `${years} year${years !== 1 ? 's' : ''}`;
    }
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

  async function handleSendEmail() {
    if (entries.length === 0) {
      alert('No sleep logs to send');
      return;
    }

    setIsSendingEmail(true);

    try {
      const familyDoc = await getDoc(doc(db, 'families', child.familyId));
      const familyData = familyDoc.data();

      const daycareDoc = await getDoc(doc(db, 'daycares', child.daycareId));
      const daycareData = daycareDoc.data();

      if (!familyData || !daycareData) {
        throw new Error('Missing family or daycare information');
      }

      const parentEmail = familyData.motherEmail || familyData.fatherEmail;
      if (!parentEmail) {
        alert('No parent email found for this child');
        setIsSendingEmail(false);
        return;
      }

      const staffIds = [...new Set(entries.map(entry => entry.staffId))];
      
      const staffMembers = await Promise.all(
        staffIds.map(async (staffId) => {
          const staffDoc = await getDoc(doc(db, 'users', staffId));
          const staffData = staffDoc.data();
          return {
            initials: staffData?.initials || 'N/A',
            fullName: `${staffData?.firstName || ''} ${staffData?.lastName || ''}`.trim() || 'Unknown',
          };
        })
      );

      const htmlContent = generateEmailHTML(
        {
          child,
          entries,
          totalSleepMinutes,
          date: selectedDate,
          staffMembers,
        },
        daycareData
      );

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: parentEmail,
          cc: daycareData.email,
          subject: `Sleep Report for ${child.name} - ${new Date(selectedDate).toLocaleDateString()}`,
          htmlContent,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`Email sent successfully to ${parentEmail}!`);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      alert('Failed to send email: ' + error.message);
    } finally {
      setIsSendingEmail(false);
    }
  }

  async function handlePrint() {
    if (entries.length === 0) {
      alert('No sleep logs to print');
      return;
    }

    setIsPrinting(true);

    try {
      const daycareDoc = await getDoc(doc(db, 'daycares', child.daycareId));
      const daycareData = daycareDoc.data();

      if (!daycareData) {
        throw new Error('Missing daycare information');
      }

      const staffIds = [...new Set(entries.map(entry => entry.staffId))];
      
      const staffMembers = await Promise.all(
        staffIds.map(async (staffId) => {
          const staffDoc = await getDoc(doc(db, 'users', staffId));
          const staffData = staffDoc.data();
          return {
            initials: staffData?.initials || 'N/A',
            fullName: `${staffData?.firstName || ''} ${staffData?.lastName || ''}`.trim() || 'Unknown',
          };
        })
      );

      const htmlContent = generateEmailHTML(
        {
          child,
          entries,
          totalSleepMinutes,
          date: selectedDate,
          staffMembers,
        },
        daycareData
      );

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    } catch (error: any) {
      console.error('Error printing:', error);
      alert('Failed to generate print report: ' + error.message);
    } finally {
      setIsPrinting(false);
    }
  }

  const sessions = groupEntriesBySessions(entries);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
      {/* Child Info */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-800">{child.name}</h3>
          <p className="text-sm text-gray-500">{calculateAge(child.dateOfBirth)}</p>
        </div>
        <div className="text-3xl">👶</div>
      </div>

      {/* Sleep Info */}
      <div className="mb-4 text-sm">
        <div className="flex justify-between py-1">
          <span className="text-gray-500">Total Sleep:</span>
          <span className="font-semibold text-gray-800">{formatTotalSleep(totalSleepMinutes)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-gray-500">Sessions:</span>
          <span className="font-semibold text-gray-800">{sessions.length}</span>
        </div>
      </div>

      {/* Status */}
      {entries.length === 0 ? (
        <div className="p-4 bg-gray-50 rounded text-center text-gray-500 text-sm">
          No sleep logs for this date
        </div>
      ) : (
        <>
          {/* Sleep Log Tables */}
          <div className="mt-6 border-t pt-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-gray-700">Sleep Log</h4>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={handleSendEmail}
                  isLoading={isSendingEmail}
                  className="text-xs px-3 py-1"
                >
                  📧 Email
                </Button>
                <Button
                  variant="secondary"
                  onClick={handlePrint}
                  isLoading={isPrinting}
                  className="text-xs px-3 py-1"
                >
                  🖨️ Print
                </Button>
              </div>
            </div>
            {sessions.map((sessionEntries, index) => (
              <SleepLogTable
                key={index}
                entries={sessionEntries}
                sessionNumber={index + 1}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}