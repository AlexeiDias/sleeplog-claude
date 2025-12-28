//
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-b from-blue-50 to-blue-100">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-blue-900 mb-4">
          💤 SleepLog
        </h1>
        <p className="text-xl text-blue-700 mb-8">
          Compliant Sleep Tracking for California Daycare Centers
        </p>
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Phase 1 Complete! ✅
          </h2>
          <ul className="text-left text-gray-600 space-y-2">
            <li>✅ Next.js 14 with TypeScript</li>
            <li>✅ Tailwind CSS configured</li>
            <li>✅ Firebase connected</li>
            <li>✅ Project structure ready</li>
            <li>✅ Type definitions created</li>
          </ul>
          <p className="mt-6 text-sm text-gray-500">
            Next: Phase 2 - Authentication System
          </p>
        </div>
      </div>
    </main>
  );
}