'use client';

import React from 'react';
import { ITeam } from '@shared/types';
import { Users, Crown, CheckCircle2, Clock, AlertTriangle, ArrowRight } from 'lucide-react';

interface TeamCardProps {
  team: ITeam & {
    metrics?: {
      totalTasks: number;
      completedTasks: number;
      blockedTasks: number;
      inProgressTasks: number;
      readinessPercentage: number;
    };
  };
  onClick?: (team: ITeam) => void;
}

export const TeamCard: React.FC<TeamCardProps> = ({ team, onClick }) => {
  const metrics = team.metrics || {
    totalTasks: 0,
    completedTasks: 0,
    blockedTasks: 0,
    inProgressTasks: 0,
    readinessPercentage: 0,
  };

  return (
    <div
      onClick={() => onClick && onClick(team)}
      className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* Color bar & icon */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm"
              style={{ backgroundColor: team.colorHex || '#3B82F6' }}
            >
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                {team.name}
              </h3>
              <p className="text-[11px] text-slate-500 line-clamp-1">{team.description}</p>
            </div>
          </div>

          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {team.memberIds ? team.memberIds.length : 0} Members
          </span>
        </div>

        {/* Lead Badge */}
        <div className="mt-3 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center space-x-2">
          <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <div className="text-xs">
            <span className="text-slate-400 block text-[10px]">Team Lead</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {team.lead ? team.lead.name : 'Unassigned'}
            </span>
          </div>
        </div>

        {/* Readiness Meter */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-slate-500">Readiness Progress</span>
            <span className="text-blue-600 dark:text-blue-400 font-extrabold">
              {metrics.readinessPercentage}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${metrics.readinessPercentage}%` }}
            />
          </div>
        </div>

        {/* Task Counts Summary */}
        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <div className="p-2 bg-slate-50 dark:bg-slate-800/30 rounded-lg">
            <span className="block text-[10px] text-slate-400 font-bold uppercase">Tasks</span>
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
              {metrics.totalTasks}
            </span>
          </div>
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
            <span className="block text-[10px] text-emerald-600 font-bold uppercase">Done</span>
            <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
              {metrics.completedTasks}
            </span>
          </div>
          <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
            <span className="block text-[10px] text-red-600 font-bold uppercase">Blocked</span>
            <span className="text-xs font-extrabold text-red-700 dark:text-red-400">
              {metrics.blockedTasks}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-blue-600">
        <span>Team Operations</span>
        <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
};

