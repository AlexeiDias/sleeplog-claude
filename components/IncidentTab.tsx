//components/IncidentTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Child, IncidentLogEntry, Family, Daycare } from '@/types';
import Button from './Button';
import IncidentLogModal from './IncidentLogModal';
import IncidentLogTable from './IncidentLogTable';
import EditIncidentLogModal from './EditIncidentLogModal';
import { generateIncidentReportHTML } from '@/utils/reportGenerator';

interface IncidentTabProps {
  child: Child;
}

export default function IncidentTab({ child }: IncidentTabProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<IncidentLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<IncidentLogEntry | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [daycare, setDaycare] = useState<Daycare | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Get today's date key
  const now = new Date();
  const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Fetch family and daycare data
  useEffect(() => {
    async function fetchData() {
      try {
        const [familyDoc, daycareDoc] = await Promise.all([
          getDoc(doc(db, 'families', child.familyId)),
          user?.daycareId ? getDoc(doc(db, 'daycares', user.daycareId)) : null,
        ]);

        if (familyDoc.exists()) {
          setFamily({ id: familyDoc.id, ...familyDoc.data() } as Family);
        }
        if (daycareDoc?.exists()) {
          setDaycare({ id: daycareDoc.id, ...daycareDoc.data() } as Daycare);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }
    fetchData();
  }, [child.familyId, user?.daycareId]);

  // Listen to today's incidents
  useEffect(() => {
    const entriesRef = collection(db, 'children', child.id, 'incidentLogs', dateKey, 'entries');
    const q = query(entriesRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entriesData = snapshot.docs
        .filter(doc => !doc.data().deleted)
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          lastEditedAt: doc.data().lastEditedAt?.toDate(),
          parentNotifiedAt: doc.data().parentNotifiedAt?.toDate(),
        })) as IncidentLogEntry[];

      setEntries(entriesData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching incidents:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [child.id, dateKey]);

  function handleEdit(entry: IncidentLogEntry) {
    setEditingEntry(entry);
    setShowEditModal(true);
  }

  async function handleEmailReport() {
    if (!family || entries.length === 0) {
      alert('No incidents to report or no parent email configured');
      return;
    }

    const parentEmails = [family.motherEmail, family.fatherEmail].filter(Boolean);
    if (parentEmails.length === 0) {
      alert('No parent email addresses configured. Please add email addresses in the family settings.');
      return;
    }

    setIsSendingEmail(true);

    try {
      const htmlContent = generateIncidentReportHTML({
        child,
        entries,
        date: now,
        daycare,
      });

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: parentEmails[0],
          subject: `⚠️ Incident Report - ${child.name} - ${now.toLocaleDateString()}`,
          htmlContent,
          cc: daycare?.email,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`Incident report sent to ${parentEmails.join(', ')}`);
      } else {
        throw new Error(result.error || 'Failed to send email');
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      alert('Failed to send email: ' + error.message);
    } finally {
      setIsSendingEmail(false);
    }
  }

  function handlePrint() {
    if (entries.length === 0) {
      alert('No incidents to print');
      return;
    }

    setIsPrinting(true);

    try {
      const reportHtml = generateIncidentReportHTML({
        child,
        entries,
        date: now,
        daycare,
      });

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(reportHtml);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } catch (error) {
      console.error('Error printing:', error);
      alert('Failed to generate print view');
    } finally {
      setIsPrinting(false);
    }
  }

  if (!user?.initials) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
        <p className="text-amber-800">
          ⚠️ Please set your initials in <a href="/settings" className="underline">Settings</a> to log incidents.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-gray-800">
          ⚠️ Today's Incidents
        </h3>
        <div className="flex gap-2">
          {entries.length > 0 && (
            <>
              <Button
                variant="secondary"
                onClick={handleEmailReport}
                disabled={isSendingEmail}
                className="text-sm"
              >
                {isSendingEmail ? '📧 Sending...' : '📧 Email'}
              </Button>
              <Button
                variant="secondary"
                onClick={handlePrint}
                disabled={isPrinting}
                className="text-sm"
              >
                {isPrinting ? '🖨️ ...' : '🖨️ Print'}
              </Button>
            </>
          )}
          <Button
            variant="primary"
            onClick={() => setShowLogModal(true)}
            className="text-sm bg-red-600 hover:bg-red-700"
          >
            ⚠️ Log Incident
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      ) : (
        <IncidentLogTable entries={entries} onEdit={handleEdit} />
      )}

      {/* Modals */}
      <IncidentLogModal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        onSuccess={() => setShowLogModal(false)}
        childId={child.id}
        childName={child.name}
        staffInitials={user.initials}
        staffId={user.uid}
        staffName={`${user.firstName || ''} ${user.lastName || ''}`.trim()}
      />

      <EditIncidentLogModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingEntry(null);
        }}
        onSuccess={() => {
          setShowEditModal(false);
          setEditingEntry(null);
        }}
        entry={editingEntry}
        childId={child.id}
        childName={child.name}
        staffInitials={user.initials}
        staffId={user.uid}
      />
    </div>
  );
}
