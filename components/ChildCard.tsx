//components/ChildCard.tsx
import React, { useState, useEffect } from 'react';
import { Child, SleepLogEntry, SleepSession, Family } from '@/types';
import { collection, query, where, onSnapshot, doc, setDoc, getDocs, orderBy, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import Button from './Button';
import Timer from './Timer';
import SleepActionModal, { SleepActionData } from './SleepActionModal';
import SleepLogTable from './SleepLogTable';
import { generateEmailHTML } from '@/utils/reportGenerator';

interface ChildCardProps {
  child: Child;
}

export default function ChildCard({ child }: ChildCardProps) {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState<SleepSession | null>(null);
  const [todayEntries, setTodayEntries] = useState<SleepLogEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<'start' | 'check' | 'stop'>('start');
  const [totalSleepMinutes, setTotalSleepMinutes] = useState(0);
  const [timerStartTime, setTimerStartTime] = useState<Date | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  useEffect(() => {
    if (!user?.initials) {
      // User needs to set initials - we'll handle this in the next step
      return;
    }

    // Listen to today's sleep logs in real-time
    const logsRef = collection(db, 'children', child.id, 'sleepLogs', todayDate, 'entries');
    const q = query(logsRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date(),
      })) as SleepLogEntry[];

      setTodayEntries(entries);

      // Determine active session
      const lastEntry = entries[entries.length - 1];
      if (lastEntry && lastEntry.type !== 'stop') {
        // Find the start of current session
        const sessionEntries = [];
        for (let i = entries.length - 1; i >= 0; i--) {
          sessionEntries.unshift(entries[i]);
          if (entries[i].type === 'start') break;
        }

        const startEntry = sessionEntries[0];
        const lastCheckOrStart = sessionEntries[sessionEntries.length - 1];
        
        setActiveSession({
          sessionId: startEntry.sessionId,
          childId: child.id,
          startTime: startEntry.timestamp,
          entries: sessionEntries,
          isActive: true,
        });

        // Set timer start time to last check or start
        setTimerStartTime(lastCheckOrStart.timestamp);
      } else {
        setActiveSession(null);
        setTimerStartTime(null);
      }

      // Calculate total sleep time
      calculateTotalSleep(entries);
    });

    return () => unsubscribe();
  }, [child.id, todayDate, user]);

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

    // Add current active session time
    if (activeSession && activeSession.startTime) {
      const now = new Date();
      const currentDuration = Math.floor((now.getTime() - activeSession.startTime.getTime()) / 60000);
      total += currentDuration;
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

  function handleStartSleep() {
    setCurrentAction('start');
    setIsModalOpen(true);
  }

  function handleCheck() {
    setCurrentAction('check');
    setIsModalOpen(true);
  }

  function handleStopSleep() {
    setCurrentAction('stop');
    setIsModalOpen(true);
  }

  async function handleModalSubmit(data: SleepActionData) {
    if (!user?.initials) {
      alert('Please set your initials in your profile first');
      return;
    }

    try {
      const now = new Date();
      const entryId = `entry_${now.getTime()}`;
      
      let sessionId: string;
      let intervalSinceLast: number | undefined;

      if (currentAction === 'start') {
        sessionId = `session_${now.getTime()}`;
      } else {
        sessionId = activeSession?.sessionId || `session_${now.getTime()}`;
        
        // Calculate interval since last entry
        if (activeSession && activeSession.entries.length > 0) {
          const lastEntry = activeSession.entries[activeSession.entries.length - 1];
          intervalSinceLast = Math.floor((now.getTime() - lastEntry.timestamp.getTime()) / 60000);
        }
      }

      const entry: any = {
        childId: child.id,
        timestamp: now,
        type: currentAction,
        position: data.position,
        breathing: data.breathing,
        staffInitials: user.initials,
        staffId: user.uid,
        sessionId,
      };

      // Only include intervalSinceLast if it exists
      if (intervalSinceLast !== undefined) {
        entry.intervalSinceLast = intervalSinceLast;
      }

      // Only include mood if it exists (stop action only)
      if (data.mood) {
        entry.mood = data.mood;
      }

      // Save to Firestore
      const entryRef = doc(db, 'children', child.id, 'sleepLogs', todayDate, 'entries', entryId);
      await setDoc(entryRef, entry);

      // Reset timer start time if check action
      if (currentAction === 'check') {
        setTimerStartTime(now);
      }

      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving sleep log:', error);
      alert('Failed to save sleep log. Please try again.');
    }
  }

  // Group entries by session
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

  const sessions = groupEntriesBySessions(todayEntries);

  async function handleSendEmail() {
    if (todayEntries.length === 0) {
      alert('No sleep logs to send');
      return;
    }

    setIsSendingEmail(true);

    try {
      // Fetch family info
      const familyDoc = await getDoc(doc(db, 'families', child.familyId));
      const familyData = familyDoc.data();

      // Fetch daycare info
      const daycareDoc = await getDoc(doc(db, 'daycares', child.daycareId));
      const daycareData = daycareDoc.data();

      if (!familyData || !daycareData) {
        throw new Error('Missing family or daycare information');
      }

      // Get parent email
      const parentEmail = familyData.motherEmail || familyData.fatherEmail;
      if (!parentEmail) {
        alert('No parent email found for this child');
        setIsSendingEmail(false);
        return;
      }

      // Get unique staff IDs from entries
      const staffIds = [...new Set(todayEntries.map(entry => entry.staffId))];
      
      // Fetch staff information
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

      // Generate report HTML
      const htmlContent = generateEmailHTML(
        {
          child,
          entries: todayEntries,
          totalSleepMinutes,
          date: todayDate,
          staffMembers,
        },
        daycareData
      );

      // Send email
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: parentEmail,
          cc: daycareData.email,
          subject: `Sleep Report for ${child.name} - ${new Date().toLocaleDateString()}`,
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
    if (todayEntries.length === 0) {
      alert('No sleep logs to print');
      return;
    }

    setIsPrinting(true);

    try {
      // Fetch daycare info
      const daycareDoc = await getDoc(doc(db, 'daycares', child.daycareId));
      const daycareData = daycareDoc.data();

      if (!daycareData) {
        throw new Error('Missing daycare information');
      }

      // Get unique staff IDs from entries
      const staffIds = [...new Set(todayEntries.map(entry => entry.staffId))];
      
      // Fetch staff information
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

      // Generate report HTML
      const htmlContent = generateEmailHTML(
        {
          child,
          entries: todayEntries,
          totalSleepMinutes,
          date: todayDate,
          staffMembers,
        },
        daycareData
      );

      // Open print window
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

  if (!user?.initials) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">{child.name}</h3>
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm text-yellow-800">
          Please set your initials in your profile to start tracking sleep.
        </div>
      </div>
    );
  }

  return (
    <>
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
            <span className="text-gray-500">Total Sleep Today:</span>
            <span className="font-semibold text-gray-800">{formatTotalSleep(totalSleepMinutes)}</span>
          </div>
        </div>

        {/* Timer */}
        {activeSession && timerStartTime && (
          <div className="mb-4">
            <Timer startTime={timerStartTime} />
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {!activeSession ? (
            <Button variant="primary" className="w-full" onClick={handleStartSleep}>
              🟢 Start Sleep
            </Button>
          ) : (
            <>
              <Button variant="primary" className="w-full" onClick={handleCheck}>
                🔁 Check
              </Button>
              <Button variant="danger" className="w-full" onClick={handleStopSleep}>
                ⛔ Stop
              </Button>
            </>
          )}
        </div>

        {/* Status */}
        <div className={`mt-4 p-3 rounded text-xs text-center ${
          activeSession ? 'bg-green-50 text-green-800' : 'bg-blue-50 text-blue-800'
        }`}>
          {activeSession ? '😴 Sleeping...' : 'No active sleep session'}
        </div>

        {/* Sleep Log Tables */}
        {sessions.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-gray-700">Today's Sleep Log</h4>
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
        )}
      </div>

      {/* Sleep Action Modal */}
      <SleepActionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        action={currentAction}
        childName={child.name}
      />
    </>
  );
}