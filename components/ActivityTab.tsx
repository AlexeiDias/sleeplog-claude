//components/ActivityTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Child, ActivityLogEntry } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import Button from './Button';
import ActivityLogModal from './ActivityLogModal';
import ActivityLogTable from './ActivityLogTable';
import EditActivityLogModal from './EditActivityLogModal';
import { generateActivityLogHTML } from '@/utils/reportGenerator';

interface ActivityTabProps {
  child: Child;
}

export default function ActivityTab({ child }: ActivityTabProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ActivityLogEntry | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Get today's date in local timezone
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayDate = `${year}-${month}-${day}`;

  useEffect(() => {
    if (!user?.initials) return;

    // Listen to today's activity logs in real-time
    const logsRef = collection(db, 'children', child.id, 'activityLogs', todayDate, 'entries');
    const q = query(logsRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const activityEntries = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() || new Date(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            lastEditedAt: doc.data().lastEditedAt?.toDate(),
          }))
          .filter((entry: any) => !entry.deleted) as ActivityLogEntry[];

        setEntries(activityEntries);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching activity logs:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [child.id, todayDate, user]);

  function handleEdit(entry: ActivityLogEntry) {
    setEditingEntry(entry);
    setIsEditModalOpen(true);
  }

  function handleSuccess() {
    console.log('Activity log saved successfully');
  }

  // Mobile device detection
  function isMobileDevice(): boolean {
    if (typeof window === 'undefined') return false;
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
           (navigator.maxTouchPoints > 2);
  }

  // Email handler
  async function handleSendEmail() {
    if (entries.length === 0) {
      alert('No activities to send');
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

      // Get unique staff IDs from entries
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

      const htmlContent = generateActivityLogHTML(
        {
          child,
          entries,
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
          subject: `Activity Log for ${child.name} - ${new Date(todayDate).toLocaleDateString()}`,
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

  // Print handler
  async function handlePrint() {
    if (entries.length === 0) {
      alert('No activities to print');
      return;
    }

    setIsPrinting(true);

    try {
      const daycareDoc = await getDoc(doc(db, 'daycares', child.daycareId));
      const daycareData = daycareDoc.data();

      if (!daycareData) {
        throw new Error('Missing daycare information');
      }

      // Get unique staff IDs from entries
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

      const htmlContent = generateActivityLogHTML(
        {
          child,
          entries,
          date: todayDate,
          staffMembers,
        },
        daycareData
      );

      if (isMobileDevice()) {
        // Mobile: Create visible iframe with print button
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;';
        
        const container = document.createElement('div');
        container.style.cssText = 'width:95%;max-width:800px;height:90%;background:white;border-radius:12px;display:flex;flex-direction:column;overflow:hidden;';
        
        const header = document.createElement('div');
        header.style.cssText = 'padding:15px;background:#9333ea;color:white;display:flex;justify-content:space-between;align-items:center;';
        header.innerHTML = `<span style="font-weight:bold;font-size:16px;">📄 Activity Log Preview</span><button id="closePreview" style="background:rgba(255,255,255,0.2);border:none;color:white;padding:8px 12px;border-radius:6px;font-size:14px;">✕ Close</button>`;
        
        const printFrame = document.createElement('iframe');
        printFrame.style.cssText = 'flex:1;border:none;width:100%;';
        
        const footer = document.createElement('div');
        footer.style.cssText = 'padding:15px;background:#f8f9fa;display:flex;gap:10px;justify-content:center;';
        footer.innerHTML = `<button id="printButton" style="background:#9333ea;color:white;border:none;padding:12px 30px;border-radius:8px;font-weight:bold;font-size:16px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.2);">🖨️ Print Report</button>`;
        
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
        
        header.querySelector('#closePreview')?.addEventListener('click', () => {
          document.body.removeChild(overlay);
          setIsPrinting(false);
        });
        
        footer.querySelector('#printButton')?.addEventListener('click', () => {
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
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm text-yellow-800">
          Please set your initials in your profile to log activities.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Activity Button */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
        <h3 className="font-semibold text-gray-800 mb-3">Log Activity</h3>
        <Button
          variant="primary"
          onClick={() => setIsAddModalOpen(true)}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          🎨 Add Activity
        </Button>
      </div>

      {/* Activity Log Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading activities...</p>
        </div>
      ) : (
        <>
          <ActivityLogTable entries={entries} onEdit={handleEdit} />
          
          {/* Email & Print Buttons */}
          {entries.length > 0 && (
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={handleSendEmail}
                isLoading={isSendingEmail}
                className="text-sm"
              >
                📧 Email Report
              </Button>
              <Button
                variant="secondary"
                onClick={handlePrint}
                isLoading={isPrinting}
                className="text-sm"
              >
                🖨️ Print Report
              </Button>
            </div>
          )}
        </>
      )}

      {/* Add Activity Modal */}
      <ActivityLogModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleSuccess}
        childId={child.id}
        childName={child.name}
        daycareId={child.daycareId}
        staffInitials={user.initials}
        staffId={user.uid}
      />

      {/* Edit Activity Modal */}
      {editingEntry && (
        <EditActivityLogModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingEntry(null);
          }}
          onSuccess={handleSuccess}
          entry={editingEntry}
          childId={child.id}
          childName={child.name}
          daycareId={child.daycareId}
          staffInitials={user.initials}
          staffId={user.uid}
        />
      )}
    </div>
  );
}
