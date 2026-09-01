//app/parent/messages/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import MessageThreadView from '@/components/messaging/MessageThreadView';

export default function ParentMessagesPage() {
  const { user } = useAuth();

  if (!user?.familyId || !user?.daycareId) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-600">
          Your account is not linked to a family yet. Please contact your daycare.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden flex flex-col h-[calc(100vh-15rem)] min-h-[280px]">
      <div className="p-4 border-b shrink-0">
        <h2 className="text-lg font-bold text-gray-800">Messages</h2>
        <p className="text-sm text-gray-600">
          Talk directly with the daycare. Photos welcome.
        </p>
      </div>

      <MessageThreadView
        familyId={user.familyId}
        daycareId={user.daycareId}
        currentUser={user}
        viewerRole="parent"
        emptyHint="No messages yet. Send a note or a photo to start the conversation."
      />
    </div>
  );
}
