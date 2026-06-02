import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock } from 'lucide-react';
import { normalizeTimestamp } from '../../lib/utils';
import type { Incidente } from '../../types';

interface TimeOfDayLineChartProps {
  incidentes: Incidente[];
}

export default function TimeOfDayLineChart({ incidentes }: TimeOfDayLineChartProps) {
  const chartData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${String(i).padStart(2, '0')}:00`,
      total: 0,
      criticos: 0,
    }));

    incidentes.forEach((inc) => {
      const ts = normalizeTimestamp(inc.timestamp);
      if (!ts) return;
      const date = new Date(ts);
      const h = date.getHours();
      
      if (hours[h]) {
        hours[h].total++;
        if (inc.severidad === 'Critica' || inc.severidad === 'Alta') {
          hours[h].criticos++;
        }
      }
    });

    return hours;
  }, [incidentes]);

  if (incidentes.length === 0) {
    return null;
  }

  return (
    <div className="glass-panel p-6 rounded-2xl h-full flex flex-col transition-all hover:border-white/10 hover:shadow-lg hover:shadow-black/20">
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <Clock className="w-5 h-5 text-indigo-400" />
        <h3 className="font-bold text-white tracking-tight">Actividad por Hora del Día</h3>
      </div>
      
      <div className="flex-1 min-h-[250px] w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorCriticos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="label" 
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickMargin={10}
              interval="preserveStartEnd"
              minTickGap={20}
            />
            <YAxis 
              allowDecimals={false} 
              tick={{ fill: '#94a3b8', fontSize: 10 }} 
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '0.75rem',
                color: '#fff',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                padding: '8px 12px'
              }}
              itemStyle={{ fontWeight: 600 }}
              labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
            />
            <Area 
              type="monotone" 
              dataKey="total" 
              name="Total Siniestros"
              stroke="#6366f1" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorTotal)" 
            />
            <Area 
              type="monotone" 
              dataKey="criticos" 
              name="Prioridad Alta"
              stroke="#ef4444" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorCriticos)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
