//components/SleepAnalytics.tsx
import React, { useState, useEffect } from 'react';
import { Child, SleepLogEntry } from '@/types';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SleepAnalyticsProps {
  child: Child;
}

interface DailyStats {
  date: string;
  totalMinutes: number;
  sessions: number;
  formattedDate: string;
}

export default function SleepAnalytics({ child }: SleepAnalyticsProps) {
  const [weeklyStats, setWeeklyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageSleep, setAverageSleep] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);

  useEffect(() => {
    fetchWeeklyData();
  }, [child.id]);

  async function fetchWeeklyData() {
    setLoading(true);

    try {
      const stats: DailyStats[] = [];
      const today = new Date();
      
      // Get last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const logsRef = collection(db, 'children', child.id, 'sleepLogs', dateStr, 'entries');
        const snapshot = await getDocs(logsRef);

        const entries = snapshot.docs.map(doc => ({
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(),
        })) as SleepLogEntry[];

        const { totalMinutes, sessions } = calculateDayStats(entries);

        stats.push({
          date: dateStr,
          totalMinutes,
          sessions,
          formattedDate: date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
        });
      }

      setWeeklyStats(stats);

      // Calculate average
      const daysWithSleep = stats.filter(s => s.totalMinutes > 0);
      const avg = daysWithSleep.length > 0
        ? Math.round(daysWithSleep.reduce((sum, s) => sum + s.totalMinutes, 0) / daysWithSleep.length)
        : 0;
      setAverageSleep(avg);

      // Calculate total sessions
      const total = stats.reduce((sum, s) => sum + s.sessions, 0);
      setTotalSessions(total);

    } catch (error) {
      console.error('Error fetching weekly data:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateDayStats(entries: SleepLogEntry[]): { totalMinutes: number; sessions: number } {
    let totalMinutes = 0;
    let sessions = 0;
    let sessionStart: Date | null = null;

    for (const entry of entries) {
      if (entry.type === 'start') {
        sessionStart = entry.timestamp;
        sessions++;
      } else if (entry.type === 'stop' && sessionStart) {
        const duration = Math.floor((entry.timestamp.getTime() - sessionStart.getTime()) / 60000);
        totalMinutes += duration;
        sessionStart = null;
      }
    }

    return { totalMinutes, sessions };
  }

  function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const chartData = weeklyStats.map(stat => ({
    date: stat.formattedDate,
    'Sleep (hours)': parseFloat((stat.totalMinutes / 60).toFixed(1)),
    Sessions: stat.sessions,
  }));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-6">
        Weekly Analytics - {child.name}
      </h3>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm text-blue-600 font-medium">Avg Daily Sleep</div>
          <div className="text-2xl font-bold text-blue-900">{formatDuration(averageSleep)}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm text-green-600 font-medium">Total Sessions (7d)</div>
          <div className="text-2xl font-bold text-green-900">{totalSessions}</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-sm text-purple-600 font-medium">Active Days</div>
          <div className="text-2xl font-bold text-purple-900">
            {weeklyStats.filter(s => s.totalMinutes > 0).length}/7
          </div>
        </div>
      </div>

      {/* Sleep Duration Chart */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Daily Sleep Duration</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" style={{ fontSize: '12px' }} />
            <YAxis style={{ fontSize: '12px' }} />
            <Tooltip />
            <Bar dataKey="Sleep (hours)" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Sessions Chart */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Daily Sleep Sessions</h4>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" style={{ fontSize: '12px' }} />
            <YAxis style={{ fontSize: '12px' }} allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="Sessions" stroke="#10b981" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}