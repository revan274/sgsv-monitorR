import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ShieldAlert } from 'lucide-react';
import type { Incidente } from '../../types';

interface SeverityDonutChartProps {
  incidentes: Incidente[];
}

const COLORS: Record<string, string> = {
  Critica: '#ef4444', // red-500
  Alta: '#f97316',    // orange-500
  Media: '#eab308',   // yellow-500
  Baja: '#3b82f6',    // blue-500
  Informativa: '#8b5cf6', // violet-500
};

export default function SeverityDonutChart({ incidentes }: SeverityDonutChartProps) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {
      Critica: 0,
      Alta: 0,
      Media: 0,
      Baja: 0,
      Informativa: 0,
    };

    incidentes.forEach((inc) => {
      const sev = inc.severidad || 'Informativa';
      if (counts[sev] !== undefined) {
        counts[sev]++;
      } else {
        counts[sev] = 1;
      }
    });

    return Object.entries(counts)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [incidentes]);

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="glass-panel p-6 rounded-2xl h-full flex flex-col transition-all hover:border-white/10 hover:shadow-lg hover:shadow-black/20">
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <ShieldAlert className="w-5 h-5 text-rose-400" />
        <h3 className="font-bold text-white tracking-tight">Distribución por Severidad</h3>
      </div>
      
      <div className="flex-1 min-h-[250px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={90}
              paddingAngle={5}
              dataKey="value"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={2}
              cornerRadius={4}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#64748b'} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '0.75rem',
                color: '#fff',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                padding: '8px 12px'
              }}
              itemStyle={{ color: '#fff', fontWeight: 600 }}
              formatter={(value) => [`${value} siniestros`, 'Total']}
            />
            <Legend
              layout="vertical"
              verticalAlign="middle"
              align="right"
              wrapperStyle={{ fontSize: '12px', color: '#cbd5e1' }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Etiqueta Central */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pr-24">
           <span className="text-3xl font-bold text-white">{incidentes.length}</span>
           <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total</span>
        </div>
      </div>
    </div>
  );
}
