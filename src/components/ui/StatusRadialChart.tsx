import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CheckCircle2 } from 'lucide-react';
import type { Incidente } from '../../types';

interface StatusRadialChartProps {
  incidentes: Incidente[];
}

const COLORS: Record<string, string> = {
  Abierto: '#f43f5e',         // rose-500
  'En seguimiento': '#f59e0b', // amber-500
  Cerrado: '#10b981',         // emerald-500
};

export default function StatusRadialChart({ incidentes }: StatusRadialChartProps) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {
      Abierto: 0,
      'En seguimiento': 0,
      Cerrado: 0,
    };

    incidentes.forEach((inc) => {
      const stat = inc.status || 'Abierto';
      if (counts[stat] !== undefined) {
        counts[stat]++;
      } else {
        counts[stat] = 1;
      }
    });

    return Object.entries(counts)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [incidentes]);

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="glass-panel p-6 rounded-2xl h-full flex flex-col transition-all hover:border-white/10 hover:shadow-lg hover:shadow-black/20">
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        <h3 className="font-bold text-white tracking-tight">Estado de Siniestros</h3>
      </div>
      
      <div className="flex-1 min-h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={0}
              outerRadius={90}
              dataKey="value"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={2}
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
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ fontSize: '12px', color: '#cbd5e1', paddingTop: '20px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
