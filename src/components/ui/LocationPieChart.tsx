import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { MapPin } from 'lucide-react';
import type { Incidente } from '../../types';

interface LocationPieChartProps {
  incidentes: Incidente[];
}

const COLORS = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function LocationPieChart({ incidentes }: LocationPieChartProps) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    incidentes.forEach((inc) => {
      const loc = inc.ubicacion || 'Sin ubicacion';
      counts[loc] = (counts[loc] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [incidentes]);

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="glass-panel p-6 rounded-2xl h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <MapPin className="w-5 h-5 text-indigo-400" />
        <h3 className="font-bold text-white">Distribucion por Ubicacion (Historico)</h3>
      </div>
      
      <div className="flex-1 min-h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              stroke="rgba(255,255,255,0.05)"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '0.75rem',
                color: '#fff',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
              }}
              itemStyle={{ color: '#fff', fontWeight: 600 }}
              formatter={(value) => [`${value as number} siniestros`, 'Total']}
            />
            <Legend
              layout="vertical"
              verticalAlign="middle"
              align="right"
              wrapperStyle={{ fontSize: '12px', color: '#cbd5e1' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
