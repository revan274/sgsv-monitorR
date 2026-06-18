import { useState } from 'react';
import { FilePlus2, Camera, User, X, Check } from 'lucide-react';
import {
  INCIDENT_TYPES,
  SEVERITY_OPTIONS,
  LOCATION_OPTIONS,
  DEFAULT_INCIDENT_TYPE,
  DEFAULT_SEVERITY,
  DEFAULT_LOCATION,
  DEFAULT_RESPONSABLE,
  DEFAULT_STATUS,
} from '../domain/constants.js';
import { compressImage } from '../domain/image.js';
import { createId, safeText, normalizeByOptions } from '../domain/utils.js';

const EMPTY_FORM = {
  titulo: '',
  tipo: DEFAULT_INCIDENT_TYPE,
  severidad: DEFAULT_SEVERITY,
  descripcion: '',
  ubicacion: DEFAULT_LOCATION,
  imagenEvidencia: null,
  imagenPersona: null,
};

export default function NewIncidentView({ onCreate, notify }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));
  const handleInput = (e) => setField(e.target.name, e.target.value);

  const handleImage = (field, errorMsg) => async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setField(field, await compressImage(file));
    } catch {
      notify(errorMsg, 'error');
    }
    e.target.value = '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const titulo = safeText(form.titulo).trim();
    const descripcion = safeText(form.descripcion).trim();
    if (!titulo || !descripcion) {
      notify('Completa título y descripción.', 'error');
      return;
    }
    onCreate({
      id: createId(),
      fecha: new Date().toLocaleString(),
      timestamp: Date.now(),
      titulo,
      tipo: normalizeByOptions(form.tipo, INCIDENT_TYPES, DEFAULT_INCIDENT_TYPE),
      severidad: normalizeByOptions(form.severidad, SEVERITY_OPTIONS, DEFAULT_SEVERITY),
      descripcion,
      ubicacion: normalizeByOptions(form.ubicacion, LOCATION_OPTIONS, DEFAULT_LOCATION),
      videoFile: null,
      status: DEFAULT_STATUS,
      responsable: DEFAULT_RESPONSABLE,
      imagenEvidencia: form.imagenEvidencia,
      imagenPersona: form.imagenPersona,
    });
    setForm(EMPTY_FORM);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="card">
        <div className="card-h">
          <h3>
            <FilePlus2 size={17} className="hi" /> Registrar nuevo evento
          </h3>
        </div>
        <div className="card-b">
          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <div className="field">
                <label>Título del evento</label>
                <input name="titulo" value={form.titulo} onChange={handleInput} placeholder="Ej: Movimiento detectado…" required />
              </div>
              <Select label="Tipo" name="tipo" value={form.tipo} onChange={handleInput} options={INCIDENT_TYPES} />
            </div>
            <div className="field-row">
              <Select label="Ubicación" name="ubicacion" value={form.ubicacion} onChange={handleInput} options={LOCATION_OPTIONS} />
              <Select label="Severidad" name="severidad" value={form.severidad} onChange={handleInput} options={SEVERITY_OPTIONS} />
            </div>
            <div className="field">
              <label>Descripción detallada</label>
              <textarea name="descripcion" value={form.descripcion} onChange={handleInput} placeholder="Describe lo ocurrido, personas, hora y acciones tomadas…" required />
            </div>

            <div className="drops">
              <Drop cls="cam" Icon={Camera} title="Evidencia del incidente" hint="Toca para subir" onChange={handleImage('imagenEvidencia', 'Error al comprimir evidencia')} />
              <Drop cls="person" Icon={User} title="Foto persona involucrada" hint="Opcional · 1 archivo" onChange={handleImage('imagenPersona', 'Error al comprimir imagen de persona')} />
            </div>

            {(form.imagenEvidencia || form.imagenPersona) && (
              <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
                {form.imagenEvidencia && <Preview src={form.imagenEvidencia} onRemove={() => setField('imagenEvidencia', null)} />}
                {form.imagenPersona && <Preview src={form.imagenPersona} onRemove={() => setField('imagenPersona', null)} />}
              </div>
            )}

            <div className="form-foot">
              <button type="submit" className="btn primary block">
                <Check size={15} /> Registrar evento
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Select({ label, name, value, onChange, options }) {
  return (
    <div className="field">
      <label>{label}</label>
      <select name={name} value={value} onChange={onChange}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function Drop({ cls, Icon, title, hint, onChange }) {
  return (
    <label className={`drop ${cls}`}>
      <Icon size={24} strokeWidth={1.7} />
      <p>{title}</p>
      <small>{hint}</small>
      <input type="file" className="hidden" accept="image/*" capture="environment" onChange={onChange} style={{ display: 'none' }} />
    </label>
  );
}

function Preview({ src, onRemove }) {
  return (
    <div style={{ position: 'relative', width: '50%' }}>
      <img src={src} alt="Vista previa" className="thumb" style={{ height: 96, width: '100%' }} />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Quitar imagen"
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          width: 24,
          height: 24,
          borderRadius: '50%',
          border: 'none',
          background: 'var(--red)',
          color: '#fff',
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
