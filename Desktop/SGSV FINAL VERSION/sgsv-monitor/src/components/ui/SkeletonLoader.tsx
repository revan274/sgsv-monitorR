import React from 'react';
import { Activity, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';

const SkeletonLoader = () => {
  return (
    <div className="animate-pulse space-y-6">
      {/* Dashboard Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <div className="h-8 w-48 bg-slate-800 rounded-lg mb-2"></div>
          <div className="h-4 w-64 bg-slate-800/50 rounded"></div>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="h-10 w-24 bg-slate-800 rounded-lg"></div>
          <div className="h-10 w-32 bg-slate-800 rounded-lg"></div>
        </div>
      </div>

      {/* KPIs Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Activity, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
          { icon: ShieldAlert, color: 'text-rose-400', bg: 'bg-rose-500/20' },
          { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/20' },
          { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/20' }
        ].map((item, index) => (
          <div key={index} className="glass-panel p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div className="h-4 w-24 bg-slate-800 rounded"></div>
              <div className={`p-2 rounded-xl ${item.bg}`}>
                <item.icon className={`w-5 h-5 ${item.color} opacity-50`} />
              </div>
            </div>
            <div className="h-10 w-16 bg-slate-800 rounded-lg mb-2"></div>
            <div className="flex items-center gap-2 mt-2">
              <div className="h-3 w-12 bg-slate-800 rounded"></div>
              <div className="h-3 w-20 bg-slate-800/50 rounded"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart & Slider Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-panel p-6 lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div className="h-6 w-40 bg-slate-800 rounded"></div>
            <div className="h-8 w-24 bg-slate-800 rounded-lg"></div>
          </div>
          <div className="flex-1 h-[300px] w-full bg-slate-800/30 rounded-xl relative overflow-hidden">
            <div className="absolute inset-0 flex items-end px-4 pb-4 gap-2">
               {[...Array(15)].map((_, i) => (
                 <div key={i} className="flex-1 bg-slate-800/50 rounded-t-sm" style={{height: `${Math.random() * 60 + 20}%`}}></div>
               ))}
            </div>
          </div>
        </div>
        
        <div className="glass-panel p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div className="h-6 w-32 bg-slate-800 rounded"></div>
            <div className="h-6 w-6 bg-slate-800 rounded-full"></div>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-4">
            <div className="h-48 w-full bg-slate-800/50 rounded-xl"></div>
            <div className="h-6 w-3/4 mx-auto bg-slate-800 rounded"></div>
            <div className="flex justify-center gap-2">
              <div className="h-2 w-2 rounded-full bg-slate-800"></div>
              <div className="h-2 w-4 rounded-full bg-indigo-500/50"></div>
              <div className="h-2 w-2 rounded-full bg-slate-800"></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Table Skeleton */}
      <div className="glass-panel p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="h-6 w-48 bg-slate-800 rounded"></div>
          <div className="flex gap-2">
            <div className="h-9 w-32 bg-slate-800 rounded-lg"></div>
            <div className="h-9 w-24 bg-slate-800 rounded-lg"></div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-10 w-full bg-slate-800/50 rounded-lg"></div>
          {[...Array(3)].map((_, i) => (
             <div key={i} className="h-16 w-full bg-slate-800/30 rounded-lg border border-white/5"></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SkeletonLoader;
