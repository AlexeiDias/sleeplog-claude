//components/CareTab.tsx
import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Child, CareLogEntry, CareLogType } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import Button from './Button';
import CareLogModal from './CareLogModal';
import CareLogTable from './CareLogTable';
import EditCareLogModal from './EditCareLogModal';

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
        <CareLogTable entries={entries} onEdit={handleEdit} />
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
