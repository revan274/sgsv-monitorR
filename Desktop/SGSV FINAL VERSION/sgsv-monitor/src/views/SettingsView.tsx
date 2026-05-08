import React, { useState } from 'react';
import { Settings, Plus, Trash2, MapPin, Tag, Shield } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import {
  LOCATION_OPTIONS,
  INCIDENT_TYPES,
  PCP_TERMINO_OPTIONS,
} from '../lib/utils';
import type { NotificationType } from '../types';

interface SettingsViewProps {
  notify: (msg: string, type?: NotificationType) => void;
}

interface CatalogSectionProps {
  title: string;
  icon: React.ReactNode;
  staticItems: string[];
  customItems: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  placeholder: string;
}

function CatalogSection({
  title,
  icon,
  staticItems,
  customItems,
  onAdd,
  onRemove,
  placeholder,
}: CatalogSectionProps) {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    const val = input.trim();
    if (!val) return;
    const all = [...staticItems, ...customItems].map((s) => s.toLowerCase());
    if (all.includes(val.toLowerCase())) return;
    onAdd(val);
    setInput('');
  };

  return (
    <div className="glass-panel p-6 rounded-2xl space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-bold text-white text-base">{title}</h3>
      </div>

      {/* Estáticos (solo lectura) */}
      <div>
        <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Predefinidos (no editables)</p>
        <div className="flex flex-wrap gap-2">
          {staticItems.map((item) => (
            <span
              key={item}
              className="bg-slate-800/60 border border-white/10 text-slate-300 text-xs px-3 py-1.5 rounded-lg"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Personalizados */}
      {customItems.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Personalizados</p>
          <div className="flex flex-wrap gap-2">
            {customItems.map((item) => (
              <span
                key={item}
                className="flex items-center gap-1.5 bg-indigo-900/40 border border-indigo-500/30 text-indigo-200 text-xs px-3 py-1.5 rounded-lg"
              >
                {item}
                <button
                  onClick={() => onRemove(item)}
                  className="text-indigo-400 hover:text-rose-400 transition"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Input para agregar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={placeholder}
          className="glass-input flex-1 rounded-lg px-3 py-2 text-white text-sm"
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim()}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </div>
    </div>
  );
}

export default function SettingsView({ notify }: SettingsViewProps) {
  const config = useAppStore((s) => s.config);
  const updateConfig = useAppStore((s) => s.updateConfig);

  const addLocation = async (val: string) => {
    await updateConfig({ customLocations: [...(config.customLocations || []), val] });
    notify(`Ubicación "${val}" agregada.`);
  };

  const removeLocation = async (val: string) => {
    await updateConfig({ customLocations: (config.customLocations || []).filter((v) => v !== val) });
    notify(`Ubicación "${val}" eliminada.`, 'warning');
  };

  const addIncidentType = async (val: string) => {
    await updateConfig({ customIncidentTypes: [...(config.customIncidentTypes || []), val] });
    notify(`Tipo "${val}" agregado.`);
  };

  const removeIncidentType = async (val: string) => {
    await updateConfig({ customIncidentTypes: (config.customIncidentTypes || []).filter((v) => v !== val) });
    notify(`Tipo "${val}" eliminado.`, 'warning');
  };

  const addPcpTermino = async (val: string) => {
    await updateConfig({ customPcpTerminos: [...(config.customPcpTerminos || []), val] });
    notify(`Término PCP "${val}" agregado.`);
  };

  const removePcpTermino = async (val: string) => {
    await updateConfig({ customPcpTerminos: (config.customPcpTerminos || []).filter((v) => v !== val) });
    notify(`Término "${val}" eliminado.`, 'warning');
  };

  return (
    <div className="space-y-6 animate-fade-in no-print">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-slate-700/50 rounded-xl">
          <Settings className="w-6 h-6 text-slate-300" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Configuración del Sistema</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Personaliza los catálogos de datos. Los cambios aplican de inmediato en todos los formularios.
          </p>
        </div>
      </div>

      <CatalogSection
        title="Ubicaciones / Sucursales"
        icon={<MapPin className="w-5 h-5 text-sky-400" />}
        staticItems={[...LOCATION_OPTIONS]}
        customItems={config.customLocations || []}
        onAdd={addLocation}
        onRemove={removeLocation}
        placeholder="Ej: CeDis Norte, TJ04..."
      />

      <CatalogSection
        title="Tipos de Incidente"
        icon={<Tag className="w-5 h-5 text-indigo-400" />}
        staticItems={[...INCIDENT_TYPES]}
        customItems={config.customIncidentTypes || []}
        onAdd={addIncidentType}
        onRemove={removeIncidentType}
        placeholder="Ej: Vandalismo, Extorsion..."
      />

      <CatalogSection
        title="Términos PCP (motivos de lista negra)"
        icon={<Shield className="w-5 h-5 text-amber-400" />}
        staticItems={[...PCP_TERMINO_OPTIONS]}
        customItems={config.customPcpTerminos || []}
        onAdd={addPcpTermino}
        onRemove={removePcpTermino}
        placeholder="Ej: Reincidente documentado..."
      />
    </div>
  );
}
