'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { IWorkloadTeamSummary, IWorkloadWorkerSummary } from '@shared/types';
import { Users, AlertTriangle, CheckCircle2, Kanban, ShieldAlert } from 'lucide-react';

interface WorkloadMatrixProps {
  eventId: string;
  onSelectTeam?: (teamId: string) => void;
}

export function WorkloadMatrix({ eventId, onSelectTeam }: WorkloadMatrixProps) {
  const [teamsSummary, setTeamsSummary] = useState<IWorkloadTeamSummary[]>([]);
  const [workersSummary, setWorkersSummary] = useState<IWorkloadWorkerSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkload = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/events/${eventId}/workload`);
      if (res.data?.success) {
        setTeamsSummary(res.data.data.teamsSummary || []);
        setWorkersSummary(res.data.data.workersSummary || []);
      }
    } catch (err) {
      console.error('Error fetching workload:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      fetchWorkload();
    }
  }, [eventId]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-8 text-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <span className="text-xs font-bold text-slate-400">Calculating team workload distribution...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Teams Breakdown */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Team Workload & Completion Velocity
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Task distribution and resolution metrics per operational team
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamsSummary.map((tm) => {
            const completionPct =
              tm.totalTasks > 0 ? Math.round((tm.completedTasks / tm.totalTasks) * 100) : 0;

            return (
              <div
                key={tm.teamId}
                onClick={() => onSelectTeam && onSelectTeam(tm.teamId)}
                className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 cursor-pointer hover:border-blue-500 transition space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: tm.colorHex || '#3B82F6' }}
                    />
                    <h4 className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[180px]">
                      {tm.teamName}
                    </h4>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">{tm.membersCount} crew</span>
                </div>

                <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                  <span>{completionPct}% Complete</span>
                  <span>{tm.completedTasks} / {tm.totalTasks} Tasks</span>
                </div>

                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${completionPct}%`,
                      backgroundColor: tm.colorHex || '#3B82F6',
                    }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">In Progress</span>
                    <span className="text-xs font-black text-blue-600">{tm.inProgressTasks}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Blocked</span>
                    <span className={`text-xs font-black ${tm.blockedTasks > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                      {tm.blockedTasks}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Done</span>
                    <span className="text-xs font-black text-emerald-600">{tm.completedTasks}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Staff Capacity & Overload Matrix */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Staff Capacity & Allocation Matrix
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Active task density per on-site member to balance operational load
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {workersSummary.map((worker) => (
            <div
              key={worker.userId}
              className={`p-4 rounded-2xl border transition ${
                worker.isOverloaded
                  ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                  {worker.name.charAt(0)}
                </div>
                {worker.isOverloaded ? (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-black bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                    <AlertTriangle className="w-3 h-3 text-red-500" />
                    <span>HIGH LOAD</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <span>BALANCED</span>
                  </span>
                )}
              </div>

              <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                {worker.name}
              </h4>
              <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                {worker.teamName}
              </p>

              <div className="mt-3 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500">Active Tasks:</span>
                <span className={`font-black ${worker.isOverloaded ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>
                  {worker.activeTasksCount} / {worker.assignedTasksCount}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
