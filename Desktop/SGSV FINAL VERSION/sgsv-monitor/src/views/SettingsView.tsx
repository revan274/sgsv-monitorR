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
  onAdd: (value: string) => Promise<void>;
  onRemove: (value: string) => Promise<void>;
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
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    const val = input.trim();
    if (!val || saving) return;
    const all = [...staticItems, ...customItems].map((s) => s.toLowerCase());
    if (all.includes(val.toLowerCase())) return;

    setSaving(true);
    try {
      await onAdd(val);
      setInput('');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (value: string) => {
    if (saving) return;
    setSaving(true);
    try {
      await onRemove(value);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-bold text-white text-base">{title}</h3>
      </div>

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
                  onClick={() => handleRemove(item)}
                  disabled={saving}
                  className="text-indigo-400 hover:text-rose-400 disabled:opacity-40 transition"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void handleAdd();
            }
          }}
          placeholder={placeholder}
          className="glass-input flex-1 rounded-lg px-3 py-2 text-white text-sm"
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim() || saving}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-4 h-4" /> {saving ? 'Guardando' : 'Agregar'}
        </button>
      </div>
    </div>
  );
}

export default function SettingsView({ notify }: SettingsViewProps) {
  const config = useAppStore((s) => s.config);
  const updateConfig = useAppStore((s) => s.updateConfig);

  const persistConfig = async (
    patch: Parameters<typeof updateConfig>[0],
    successMessage: string,
    type: NotificationType = 'success',
  ) => {
    try {
      await updateConfig(patch);
      notify(successMessage, type);
    } catch {
      notify('No se pudo guardar la configuracion en la base de datos.', 'error');
    }
  };

  const addLocation = (val: string) =>
    persistConfig(
      { customLocations: [...(config.customLocations || []), val] },
      `Ubicacion "${val}" agregada.`,
    );

  const removeLocation = (val: string) =>
    persistConfig(
      { customLocations: (config.customLocations || []).filter((v) => v !== val) },
      `Ubicacion "${val}" eliminada.`,
      'warning',
    );

  const addIncidentType = (val: string) =>
    persistConfig(
      { customIncidentTypes: [...(config.customIncidentTypes || []), val] },
      `Tipo "${val}" agregado.`,
    );

  const removeIncidentType = (val: string) =>
    persistConfig(
      { customIncidentTypes: (config.customIncidentTypes || []).filter((v) => v !== val) },
      `Tipo "${val}" eliminado.`,
      'warning',
    );

  const addPcpTermino = (val: string) =>
    persistConfig(
      { customPcpTerminos: [...(config.customPcpTerminos || []), val] },
      `Termino PCP "${val}" agregado.`,
    );

  const removePcpTermino = (val: string) =>
    persistConfig(
      { customPcpTerminos: (config.customPcpTerminos || []).filter((v) => v !== val) },
      `Termino "${val}" eliminado.`,
      'warning',
    );

  return (
    <div className="space-y-6 animate-fade-in no-print">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-slate-700/50 rounded-xl">
          <Settings className="w-6 h-6 text-slate-300" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Configuracion del Sistema</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Personaliza los catalogos de datos. Los cambios se guardan en la base de datos cuando Cloud esta activo.
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
        title="Terminos PCP (motivos de lista negra)"
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
