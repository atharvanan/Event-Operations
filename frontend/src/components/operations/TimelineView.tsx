'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { ITask } from '@shared/types';
import { Clock, MapPin, CheckCircle2, AlertTriangle, Flame } from 'lucide-react';

interface TimelineViewProps {
  eventId: string;
  onSelectTask?: (task: ITask) => void;
}

export function TimelineView({ eventId, onSelectTask }: TimelineViewProps) {
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/events/${eventId}/tasks`);
      if (res.data?.success) {
        setTasks(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching tasks for timeline:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      fetchTasks();
    }
  }, [eventId]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-8 text-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <span className="text-xs font-bold text-slate-400">Loading operational timeline...</span>
      </div>
    );
  }

  // Group tasks by time of day
  const slots: { title: string; subtitle: string; tasks: ITask[] }[] = [
    {
      title: 'Slot 1: Morning Staging & Load-in',
      subtitle: '06:00 - 12:00 • Venue preparation, truss rigging & floral delivery',
      tasks: [],
    },
    {
      title: 'Slot 2: Afternoon Tech Checks & Rehearsals',
      subtitle: '12:00 - 17:00 • Sound checks, stage lighting focus & catering prep',
      tasks: [],
    },
    {
      title: 'Slot 3: Evening Main Event & Live Ops',
      subtitle: '17:00 - 22:00 • Guest reception, live showtime & VIP coordination',
      tasks: [],
    },
    {
      title: 'Slot 4: Night Teardown & Logistics',
      subtitle: '22:00 onwards • Stage strike, rental equipment return & exit audit',
      tasks: [],
    },
  ];

  tasks.forEach((t) => {
    const dueHour = new Date(t.dueTime).getHours();
    if (dueHour < 12) {
      slots[0].tasks.push(t);
    } else if (dueHour < 17) {
      slots[1].tasks.push(t);
    } else if (dueHour < 22) {
      slots[2].tasks.push(t);
    } else {
      slots[3].tasks.push(t);
    }
  });

  return (
    <div className="space-y-6">
      {slots.map((slot, idx) => (
        <div
          key={idx}
          className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm space-y-4"
        >
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>{slot.title}</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">{slot.subtitle}</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 w-fit">
              {slot.tasks.length} task{slot.tasks.length === 1 ? '' : 's'}
            </span>
          </div>

          {slot.tasks.length === 0 ? (
            <div className="py-6 text-center text-xs font-semibold text-slate-400">
              No tasks scheduled for this slot.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {slot.tasks.map((task) => (
                <div
                  key={task._id}
                  onClick={() => onSelectTask && onSelectTask(task)}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 cursor-pointer hover:border-blue-500 transition space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        task.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : task.status === 'BLOCKED'
                          ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                          : task.status === 'IN_PROGRESS'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {task.status.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {new Date(task.dueTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h4 className="text-xs font-black text-slate-900 dark:text-white line-clamp-2">
                    {task.title}
                  </h4>

                  {task.zone && (
                    <div className="flex items-center space-x-1 text-[11px] font-medium text-slate-500">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{task.zone}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
