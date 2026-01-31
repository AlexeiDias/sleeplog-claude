//components/CareTab.tsx
import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Child, CareLogEntry, CareLogType } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import Button from './Button';
import CareLogModal from './CareLogModal';
import CareLogTable from './CareLogTable';
import EditCareLogModal from './EditCareLogModal';
import { generateCareLogHTML } from '@/utils/reportGenerator';

interface CareTabProps {
  child: Child;
}

export default function CareTab({ child }: CareTabProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<CareLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentLogType, setCurrentLogType] = useState<CareLogType>('diaper');
  const [editingEntry, setEditingEntry] = useState<CareLogEntry | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Get today's date in local timezone
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayDate = `${year}-${month}-${day}`;

  // Get care log settings (with defaults)
  const careSettings = child.careLogSettings || {
    enabled: true,
    trackDiapers: true,
    trackMeals: true,
    trackBottles: true,
    pottyTrained: false,
    noBottles: false,
  };

  useEffect(() => {
    if (!user?.initials) return;

    // Listen to today's care logs in real-time
    const logsRef = collection(db, 'children', child.id, 'careLogs', todayDate, 'entries');
    const q = query(logsRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const careEntries = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() || new Date(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            lastEditedAt: doc.data().lastEditedAt?.toDate(),
          }))
          .filter((entry: any) => !entry.deleted) as CareLogEntry[]; // Filter out deleted entries

        setEntries(careEntries);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching care logs:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [child.id, todayDate, user]);

  function handleAddLog(type: CareLogType) {
    setCurrentLogType(type);
    setIsAddModalOpen(true);
  }

  function handleEdit(entry: CareLogEntry) {
    setEditingEntry(entry);
    setIsEditModalOpen(true);
  }

  function handleSuccess() {
    // Entries will auto-update via real-time listener
    console.log('Care log saved successfully');
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
      alert('No care logs to send');
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

      const htmlContent = generateCareLogHTML(
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
          subject: `Care Log Report for ${child.name} - ${new Date(todayDate).toLocaleDateString()}`,
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
      alert('No care logs to print');
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

      const htmlContent = generateCareLogHTML(
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
        header.style.backgroundColor = '#11998e';
        header.style.color = 'white';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.innerHTML = `
          <span style="font-weight: bold; font-size: 16px;">📄 Care Log Preview</span>
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
          <button id="printButton" style="background: #11998e; color: white; border: none; padding: 12px 30px; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
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
          Please set your initials in your profile to log care activities.
        </div>
      </div>
    );
  }

  // Check if care logs are disabled for this child
  if (!careSettings.enabled) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <div className="text-4xl mb-2">🍼</div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Care Logs Disabled</h3>
        <p className="text-gray-600 text-sm">
          Care logging is currently disabled for {child.name}.
        </p>
        <p className="text-gray-500 text-xs mt-2">
          Enable it in Settings → Families → Edit Child
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Action Buttons */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
        <h3 className="font-semibold text-gray-800 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-3 gap-3">
          {careSettings.trackDiapers && !careSettings.pottyTrained && (
            <Button
              variant="primary"
              onClick={() => handleAddLog('diaper')}
              className="w-full"
            >
              🧷 Diaper
            </Button>
          )}
          {careSettings.trackMeals && (
            <Button
              variant="primary"
              onClick={() => handleAddLog('meal')}
              className="w-full"
            >
              🍽️ Meal
            </Button>
          )}
          {careSettings.trackBottles && !careSettings.noBottles && (
            <Button
              variant="primary"
              onClick={() => handleAddLog('bottle')}
              className="w-full"
            >
              🍼 Bottle
            </Button>
          )}
        </div>

        {/* Info about disabled features */}
        {(careSettings.pottyTrained || careSettings.noBottles) && (
          <div className="mt-3 text-xs text-gray-600">
            {careSettings.pottyTrained && (
              <div>✓ Potty trained - Diaper tracking hidden</div>
            )}
            {careSettings.noBottles && (
              <div>✓ No bottles - Bottle tracking hidden</div>
            )}
          </div>
        )}
      </div>

      {/* Care Log Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading care logs...</p>
        </div>
      ) : (
        <>
          <CareLogTable entries={entries} onEdit={handleEdit} />
          
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

      {/* Add Care Log Modal */}
      <CareLogModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleSuccess}
        logType={currentLogType}
        childId={child.id}
        childName={child.name}
        staffInitials={user.initials}
        staffId={user.uid}
      />

      {/* Edit Care Log Modal */}
      {editingEntry && (
        <EditCareLogModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingEntry(null);
          }}
          onSuccess={handleSuccess}
          entry={editingEntry}
          childId={child.id}
          childName={child.name}
          staffInitials={user.initials}
          staffId={user.uid}
        />
      )}
    </div>
  );
}
