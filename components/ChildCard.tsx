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
import CareTab from './CareTab';
import ActivityTab from './ActivityTab';
import { generateEmailHTML } from '@/utils/reportGenerator';
import Image from 'next/image';

interface ChildCardProps {
  child: Child;
}

type TabType = 'sleep' | 'care' | 'activities';

export default function ChildCard({ child }: ChildCardProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('sleep');
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
  
  // Care log settings state
  const [careLogSettings, setCareLogSettings] = useState<any>(null);

  // FIXED: Use local date instead of UTC to prevent timezone issues
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayDate = `${year}-${month}-${day}`; // YYYY-MM-DD in local timezone

  // Check if child needs sleep tracking (under 24 months)
  const needsSleepTracking = () => {
    const birthDate = new Date(child.dateOfBirth);
    const ageInMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + 
                       (now.getMonth() - birthDate.getMonth());
    return ageInMonths < 24;
  };

  // Show Sleep tab for ALL children (parents want nap info for older kids too)
  const showSleepTab = true;
  const showCareTab = careLogSettings?.enabled || false;
  const showActivitiesTab = true; // Activities enabled for all children by default
  
  // California compliance indicator (required for under 24 months)
  const isComplianceRequired = needsSleepTracking();

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

  // Fetch care log settings
  useEffect(() => {
    async function fetchCareLogSettings() {
      try {
        const settingsDoc = await getDoc(doc(db, 'children', child.id, 'settings', 'careLogs'));
        if (settingsDoc.exists()) {
          setCareLogSettings(settingsDoc.data());
        } else {
          // Enable care logs for ALL kids by default
          const defaults = {
            enabled: true,
            trackDiapers: true,
            trackMeals: true,
            trackBottles: true,
            pottyTrained: false,
            noBottles: false,
          };
          
          setCareLogSettings(defaults);
          
          // Save defaults to Firestore for future use
          const settingsRef = doc(db, 'children', child.id, 'settings', 'careLogs');
          await setDoc(settingsRef, defaults);
        }
      } catch (error) {
        console.error('Error fetching care log settings:', error);
        // Fallback defaults on error
        setCareLogSettings({
          enabled: true,
          trackDiapers: true,
          trackMeals: true,
          trackBottles: true,
          pottyTrained: false,
          noBottles: false,
        });
      }
    }

    fetchCareLogSettings();
  }, [child.id]);

  useEffect(() => {
    if (!user?.initials) {
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

  // Mobile device detection
  function isMobileDevice(): boolean {
    if (typeof window === 'undefined') return false;
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
           (navigator.maxTouchPoints > 2);
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

      if (intervalSinceLast !== undefined) {
        entry.intervalSinceLast = intervalSinceLast;
      }

      if (data.mood) {
        entry.mood = data.mood;
      }

      if (data.notes) {
        entry.notes = data.notes;
      }

      const entryRef = doc(db, 'children', child.id, 'sleepLogs', todayDate, 'entries', entryId);
      await setDoc(entryRef, entry);

      if (currentAction === 'check') {
        setTimerStartTime(now);
      }

      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving sleep log:', error);
      alert('Failed to save sleep log. Please try again.');
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

  const sessions = groupEntriesBySessions(todayEntries);

  async function handleSendEmail() {
    if (todayEntries.length === 0) {
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

      const staffIds = [...new Set(todayEntries.map(entry => entry.staffId))];
      
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
          entries: todayEntries,
          totalSleepMinutes,
          date: todayDate,
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

  async function handlePrint() {
    if (todayEntries.length === 0) {
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

      const staffIds = [...new Set(todayEntries.map(entry => entry.staffId))];
      
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
          entries: todayEntries,
          totalSleepMinutes,
          date: todayDate,
          staffMembers,
        },
        daycareData
      );

      if (isMobileDevice()) {
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        overlay.style.zIndex = '9999';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        
        const container = document.createElement('div');
        container.style.width = '95%';
        container.style.maxWidth = '800px';
        container.style.height = '90%';
        container.style.backgroundColor = 'white';
        container.style.borderRadius = '12px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.overflow = 'hidden';
        
        const header = document.createElement('div');
        header.style.padding = '15px';
        header.style.backgroundColor = '#667eea';
        header.style.color = 'white';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.innerHTML = `
          <span style="font-weight: bold; font-size: 16px;">📄 Sleep Report Preview</span>
          <button id="closePreview" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 8px 12px; border-radius: 6px; font-size: 14px;">✕ Close</button>
        `;
        
        const printFrame = document.createElement('iframe');
        printFrame.style.flex = '1';
        printFrame.style.border = 'none';
        printFrame.style.width = '100%';
        
        const footer = document.createElement('div');
        footer.style.padding = '15px';
        footer.style.backgroundColor = '#f8f9fa';
        footer.style.display = 'flex';
        footer.style.gap = '10px';
        footer.style.justifyContent = 'center';
        footer.innerHTML = `
          <button id="printButton" style="background: #667eea; color: white; border: none; padding: 12px 30px; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
            🖨️ Print Report
          </button>
        `;
        
        container.appendChild(header);
        container.appendChild(printFrame);
        container.appendChild(footer);
        overlay.appendChild(container);
        document.body.appendChild(overlay);
        
        const frameDoc = printFrame.contentWindow?.document;
        if (frameDoc) {
          frameDoc.open();
          frameDoc.write(htmlContent);
          frameDoc.close();
        }
        
        const closeBtn = header.querySelector('#closePreview');
        closeBtn?.addEventListener('click', () => {
          document.body.removeChild(overlay);
          setIsPrinting(false);
        });
        
        const printBtn = footer.querySelector('#printButton');
        printBtn?.addEventListener('click', () => {
          try {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
          } catch (err) {
            console.error('Print error:', err);
            alert('Print failed. Please try using the Email button instead.');
          }
        });
        
        setIsPrinting(false);
        
      } else {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
          }, 500);
        }
        setIsPrinting(false);
      }
    } catch (error: any) {
      console.error('Error printing:', error);
      alert('Failed to generate print report: ' + error.message);
      setIsPrinting(false);
    }
  }

  if (!user?.initials) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">{child.name}</h3>
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm text-yellow-800">
          Please set your initials in your profile to start tracking.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
        {/* Child Info Header */}
        <div className="p-6 pb-0">
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
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
              
              <button
                onClick={handleEditFamily}
                className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Edit family information"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 -mx-6 px-6">
            {showSleepTab && (
              <button
                onClick={() => setActiveTab('sleep')}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'sleep'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                😴 Sleep
              </button>
            )}
            {showCareTab && (
              <button
                onClick={() => setActiveTab('care')}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'care'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                🍼 Care
              </button>
            )}
            {showActivitiesTab && (
              <button
                onClick={() => setActiveTab('activities')}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'activities'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                🎨 Activities
              </button>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* SLEEP TAB */}
          {activeTab === 'sleep' && showSleepTab && (
            <div className="space-y-4">
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
          )}

          {/* CARE TAB */}
          {activeTab === 'care' && showCareTab && (
            <CareTab child={{ ...child, careLogSettings }} />
          )}

          {/* ACTIVITIES TAB */}
          {activeTab === 'activities' && showActivitiesTab && (
            <ActivityTab child={child} />
          )}

          {/* If no tabs are visible */}
          {!showSleepTab && !showCareTab && !showActivitiesTab && (
            <div className="text-center py-8 text-gray-500">
              <p>No tracking enabled for this child.</p>
              <p className="text-sm mt-2">Enable Sleep or Care logs in Settings → Edit Child</p>
            </div>
          )}
        </div>
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
