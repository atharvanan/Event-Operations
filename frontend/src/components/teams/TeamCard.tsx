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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(team);
    }
  };

  return (
    <article
      onClick={() => onClick && onClick(team)}
      className="group bg-white dark:bg-[#18132B] rounded-2xl border border-brand-200/70 dark:border-brand-800/60 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* Color bar & icon */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm"
              style={{ backgroundColor: team.colorHex || '#43328E' }}
              aria-hidden="true"
            >
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#1A162E] dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-300 transition-colors">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onClick) onClick(team);
                  }}
                  className="text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                >
                  {team.name}
                </button>
              </h3>
              <p className="text-xs text-[#524D6B] dark:text-brand-200 line-clamp-1">{team.description}</p>
            </div>
          </div>

          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-brand-50 dark:bg-[#221C3E] text-[#2B244D] dark:text-brand-100">
            {team.memberIds ? team.memberIds.length : 0} Members
          </span>
        </div>

        {/* Lead Badge */}
        <div className="mt-3 p-2.5 bg-brand-50/50 dark:bg-[#221C3E] rounded-xl border border-brand-100 dark:border-brand-800/60 flex items-center space-x-2">
          <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden="true" />
          <div className="text-xs">
            <span className="text-[#524D6B] dark:text-brand-300 block text-xs">Team Lead</span>
            <span className="font-bold text-[#1A162E] dark:text-white">
              {team.lead ? team.lead.name : 'Unassigned'}
            </span>
          </div>
        </div>

        {/* Readiness Meter */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-[#524D6B] dark:text-brand-200">Readiness Progress</span>
            <span className="text-brand-600 dark:text-brand-300 font-extrabold">
              {metrics.readinessPercentage}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={metrics.readinessPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${team.name} readiness progress`}
            className="w-full h-2 bg-brand-100 dark:bg-brand-900 rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-brand-600 rounded-full transition-all"
              style={{ width: `${metrics.readinessPercentage}%` }}
            />
          </div>
        </div>

        {/* Task Counts Summary */}
        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <div className="p-2 bg-brand-50/50 dark:bg-[#221C3E] rounded-lg border border-brand-100 dark:border-brand-800/60">
            <span className="block text-xs text-[#524D6B] dark:text-brand-300 font-bold uppercase">Tasks</span>
            <span className="text-xs font-extrabold text-[#1A162E] dark:text-white">
              {metrics.totalTasks}
            </span>
          </div>
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
            <span className="block text-xs text-emerald-700 dark:text-emerald-300 font-bold uppercase">Done</span>
            <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-200">
              {metrics.completedTasks}
            </span>
          </div>
          <div className="p-2 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-100 dark:border-red-900/40">
            <span className="block text-xs text-red-700 dark:text-red-300 font-bold uppercase">Blocked</span>
            <span className="text-xs font-extrabold text-red-800 dark:text-red-200">
              {metrics.blockedTasks}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-brand-100 dark:border-brand-800/60 flex items-center justify-between text-xs font-bold text-brand-600 dark:text-brand-300">
        <span>Team Operations</span>
        <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" aria-hidden="true" />
      </div>
    </article>
  );
};

