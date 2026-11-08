'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { ITask, TaskStatus, TaskPriority } from '@shared/types';
import {
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Camera,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface TaskCardProps {
  task: ITask;
  onClick: (task: ITask) => void;
  onQuickStatusChange?: (task: ITask, newStatus: TaskStatus) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, onQuickStatusChange }) => {
  const { t } = useTranslation();

  const isOverdue = new Date(task.dueTime).getTime() < Date.now() && task.status !== TaskStatus.COMPLETED;

  const priorityStyles: Record<TaskPriority, { bg: string; text: string; border: string }> = {
    [TaskPriority.LOW]: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-300', border: 'border-slate-200' },
    [TaskPriority.MEDIUM]: { bg: 'bg-blue-50 dark:bg-blue-950/50', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200' },
    [TaskPriority.HIGH]: { bg: 'bg-orange-50 dark:bg-orange-950/50', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200' },
    [TaskPriority.URGENT]: { bg: 'bg-amber-500 text-white', text: 'text-white', border: 'border-amber-600' },
    [TaskPriority.CRITICAL]: { bg: 'bg-red-600 text-white animate-pulse', text: 'text-white', border: 'border-red-700' },
  };

  const statusStyles: Record<TaskStatus, { bg: string }> = {
    [TaskStatus.TO_DO]: { bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    [TaskStatus.ACKNOWLEDGED]: { bg: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300' },
    [TaskStatus.IN_PROGRESS]: { bg: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300' },
    [TaskStatus.BLOCKED]: { bg: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300' },
    [TaskStatus.SUBMITTED_FOR_REVIEW]: { bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' },
    [TaskStatus.REWORK_REQUIRED]: { bg: 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300' },
    [TaskStatus.COMPLETED]: { bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' },
    [TaskStatus.CANCELLED]: { bg: 'bg-zinc-100 text-zinc-500 line-through dark:bg-zinc-800 dark:text-zinc-400' },
  };

  const currentPriorityStyle = priorityStyles[task.priority] || priorityStyles[TaskPriority.MEDIUM];
  const currentStatusStyle = statusStyles[task.status] || statusStyles[TaskStatus.TO_DO];

  return (
    <div
      onClick={() => onClick(task)}
      className={`group bg-white dark:bg-slate-900 rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between ${
        task.isUrgentEscalated
          ? 'border-red-500/80 bg-red-50/10'
          : isOverdue
          ? 'border-orange-400'
          : 'border-slate-200/90 dark:border-slate-800'
      }`}
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center space-x-1.5 flex-wrap">
            <span
              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${currentPriorityStyle.bg} ${currentPriorityStyle.text} ${currentPriorityStyle.border}`}
            >
              {task.isUrgentEscalated && <Flame className="w-3 h-3 inline mr-1" />}
              {t(`tasks.priority.${task.priority}`)}
            </span>

            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${currentStatusStyle.bg}`}>
              {t(`tasks.status.${task.status}`)}
            </span>
          </div>

          {task.evidenceRequired && (
            <span
              title="Completion proof required"
              className="text-[10px] font-bold flex items-center text-slate-400 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded"
            >
              <Camera className="w-3 h-3 mr-1 text-blue-500" />
              {task.minEvidenceCount}
            </span>
          )}
        </div>

        {/* Title & Description */}
        <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors line-clamp-2">
          {task.title}
        </h4>

        {task.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Microtasks Progress Bar if Parent Task */}
        {!task.parentTaskId && task.microtasksCount !== undefined && task.microtasksCount > 0 && (
          <div className="mt-3 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
              <span className="flex items-center">
                <Layers className="w-3 h-3 mr-1 text-slate-400" />
                Microtasks
              </span>
              <span>
                {task.completedMicrotasksCount}/{task.microtasksCount} Done
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{
                  width: `${
                    task.microtasksCount > 0
                      ? Math.round(((task.completedMicrotasksCount || 0) / task.microtasksCount) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Rework Notice */}
        {task.status === TaskStatus.REWORK_REQUIRED && task.reworkReason && (
          <div className="mt-2.5 p-2 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900 rounded-xl text-xs text-orange-700 dark:text-orange-300 flex items-start space-x-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-orange-600" />
            <span className="line-clamp-2">{task.reworkReason}</span>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center space-x-2">
          {task.assignee ? (
            <div className="flex items-center space-x-1.5">
              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                {task.assignee.name.charAt(0)}
              </div>
              <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px] truncate max-w-[90px]">
                {task.assignee.name}
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400 italic">Unassigned</span>
          )}

          {task.zone && (
            <div className="hidden sm:flex items-center text-[11px] text-slate-400">
              <MapPin className="w-3 h-3 mr-0.5 shrink-0" />
              <span className="truncate max-w-[80px]">{task.zone}</span>
            </div>
          )}
        </div>

        <div className={`flex items-center text-[11px] font-semibold ${isOverdue ? 'text-red-600' : 'text-slate-500'}`}>
          <Clock className="w-3 h-3 mr-1 shrink-0" />
          <span>
            {new Date(task.dueTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};
