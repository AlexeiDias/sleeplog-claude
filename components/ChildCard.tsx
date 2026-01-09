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
import EditChildModal from './EditChildModal';
import EditFamilyModal from './EditFamilyModal';
import { generateEmailHTML } from '@/utils/reportGenerator';
import Image from 'next/image';

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
  
  // New state for edit modals
  const [showEditChildModal, setShowEditChildModal] = useState(false);
  const [showEditFamilyModal, setShowEditFamilyModal] = useState(false);
  const [family, setFamily] = useState<Family | null>(null);

  // FIXED: Use local date instead of UTC to prevent timezone issues
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayDate = `${year}-${month}-${day}`; // YYYY-MM-DD in local timezone

  // Fetch family data
  useEffect(() => {
    async function fetchFamily() {
      try {
        const familyDoc = await getDoc(doc(db, 'families', child.familyId));
        if (familyDoc.exists()) {
          setFamily({
            id: familyDoc.id,
            ...familyDoc.data()
          } as Family);
        }
      } catch (error) {
        console.error('Error fetching family:', error);
      }
    }

    fetchFamily();
  }, [child.familyId]);

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

  // NEW: Mobile device detection
  function isMobileDevice(): boolean {
    if (typeof window === 'undefined') return false;
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
           (navigator.maxTouchPoints > 2);
  }

  // NEW: Mobile print helper
  function openPrintableTab(htmlContent: string) {
    // Add mobile-specific instructions to the HTML
    const mobileHtml = htmlContent.replace(
      '</body>',
      `
      <div style="position: fixed; bottom: 0; left: 0; right: 0; background: #667eea; color: white; padding: 15px; text-align: center; font-size: 14px; box-shadow: 0 -2px 10px rgba(0,0,0,0.2); z-index: 1000;">
        <p style="margin: 0 0 8px 0; font-weight: bold;">📱 Mobile Print Instructions:</p>
        <p style="margin: 0; font-size: 12px;">Tap the Share button <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='white' viewBox='0 0 16 16'%3E%3Cpath d='M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5z'/%3E%3C/svg%3E" style="vertical-align: middle; margin: 0 4px;"> in Safari, then select "Print"</p>
      </div>
      </body>
      `
    );

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(mobileHtml);
      printWindow.document.close();
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

  // Edit handlers
  const handleEditChild = () => {
    setShowEditChildModal(true);
  };

  const handleEditFamily = () => {
    setShowEditFamilyModal(true);
  };

  const handleEditSuccess = () => {
    // Firestore real-time listeners will auto-update the data
    console.log('Edit successful - data will update automatically');
  };

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

      // Only include notes if provided
      if (data.notes) {
        entry.notes = data.notes;
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
          subject: `Sleep Report for ${child.name} - ${new Date(todayDate).toLocaleDateString()}`,
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

  // UPDATED: Mobile-friendly print function
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

      // Mobile-friendly approach
      if (isMobileDevice()) {
        // Create HTML blob
        const blob = new Blob([htmlContent], { type: 'text/html' });
        
        // Try native share API first (works on iOS/Android)
        if (navigator.share) {
          try {
            // Create a file from the blob
            const file = new File([blob], `sleep-report-${child.name}-${todayDate}.html`, { 
              type: 'text/html' 
            });
            
            await navigator.share({
              title: `Sleep Report - ${child.name}`,
              text: `Sleep report for ${child.name} on ${new Date(todayDate).toLocaleDateString()}`,
              files: [file]
            });
          } catch (shareError: any) {
            // User cancelled share or share failed, offer download instead
            if (shareError.name !== 'AbortError') {
              // Fallback: Open in new tab with instructions
              openPrintableTab(htmlContent);
            }
          }
        } else {
          // Fallback for devices without share API
          openPrintableTab(htmlContent);
        }
      } else {
        // Desktop: Use traditional print dialog
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
          }, 500);
        }
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
        {/* Child Info with Photo and Edit Buttons */}
        <div className="flex items-start gap-4 mb-4">
          {/* Photo */}
          <div className="flex-shrink-0">
            {child.photoUrl ? (
              <div className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-blue-500">
                <Image
                  src={child.photoUrl}
                  alt={child.name}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-3xl border-4 border-blue-500">
                👶
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-800">{child.name}</h3>
            <p className="text-sm text-gray-500">{calculateAge(child.dateOfBirth)}</p>
          </div>

          {/* Edit Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleEditChild}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit child information"
              aria-label="Edit child"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
            
            <button
              onClick={handleEditFamily}
              className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Edit family information"
              aria-label="Edit family"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
            </button>
          </div>
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
                🔍 Check
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

      {/* Edit Child Modal */}
      {showEditChildModal && (
        <EditChildModal
          child={child}
          isOpen={showEditChildModal}
          onClose={() => setShowEditChildModal(false)}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Edit Family Modal */}
      {showEditFamilyModal && family && (
        <EditFamilyModal
          family={family}
          isOpen={showEditFamilyModal}
          onClose={() => setShowEditFamilyModal(false)}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  );
}
