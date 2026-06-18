import { useEffect, useMemo, useState } from 'react';
import { X, Camera, ShieldAlert, UserX, Check, Search } from 'lucide-react';
import { PCP_TERMINO_OPTIONS, DEFAULT_PCP_TERMINO, MAX_PCP_IMAGES } from '../domain/constants.js';
import { compressImage } from '../domain/image.js';
import { createId, safeText, normalizeByOptions, normalizeSearchText } from '../domain/utils.js';
import Pagination from '../components/Pagination.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Topbar from '../components/Topbar.jsx';

const PER_PAGE = 8;
const EMPTY_FORM = { nombre: '', terminos: DEFAULT_PCP_TERMINO, descripcion: '', imagenes: [] };

export default function PcpView({ personas, onAdd, onDelete, onImageClick, notify }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const ns = normalizeSearchText(search);
    if (!ns) return personas;
    return personas.filter(
      (p) =>
        normalizeSearchText(p.nombre).includes(ns) ||
        normalizeSearchText(p.terminos).includes(ns) ||
        normalizeSearchText(p.descripcion).includes(ns),
    );
  }, [personas, search]);

  useEffect(() => setPage(1), [search]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const slots = MAX_PCP_IMAGES - form.imagenes.length;
    if (slots <= 0) {
      notify(`Límite de ${MAX_PCP_IMAGES} imágenes.`, 'warning');
      e.target.value = '';
      return;
    }
    try {
      const images = await Promise.all(files.slice(0, slots).map((f) => compressImage(f)));
      setForm((prev) => ({ ...prev, imagenes: [...prev.imagenes, ...images] }));
    } catch {
      notify('Error procesando las imágenes', 'error');
    }
    e.target.value = '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nombre = safeText(form.nombre).trim();
    if (!nombre) {
      notify('Nombre obligatorio.', 'error');
      return;
    }
    if (personas.some((p) => normalizeSearchText(p.nombre) === normalizeSearchText(nombre))) {
      notify('Ya existe una persona con ese nombre o alias.', 'warning');
      return;
    }
    onAdd({
      id: createId(),
      fechaRegistro: new Date().toLocaleDateString(),
      nombre,
      terminos: normalizeByOptions(form.terminos, PCP_TERMINO_OPTIONS, DEFAULT_PCP_TERMINO),
      descripcion: safeText(form.descripcion).trim(),
      imagenes: form.imagenes,
    });
    setForm(EMPTY_FORM);
  };

  const removeImage = (idx) => setForm((prev) => ({ ...prev, imagenes: prev.imagenes.filter((_, i) => i !== idx) }));

  return (
    <div className="animate-fade-in">
      <Topbar title="Lista negra PCP" subtitle={<><b>{personas.length}</b> persona(s) registrada(s)</>} />

      <div className="grid">
        {/* Formulario de registro */}
        <div className="col">
          <div className="card">
            <div className="card-h">
              <h3 className="bl-head">
                <span className="shield">
                  <ShieldAlert size={17} />
                </span>
                Registrar persona de interés
              </h3>
            </div>
            <div className="card-b">
              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label>Nombre o alias</label>
                  <input placeholder="Nombre, alias o identificador" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
                </div>
                <div className="field">
                  <label>Motivo</label>
                  <select value={form.terminos} onChange={(e) => setForm({ ...form, terminos: e.target.value })}>
                    {PCP_TERMINO_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Notas</label>
                  <textarea placeholder="Detalles, características, antecedentes…" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} style={{ minHeight: 58 }} />
                </div>

                <label className="upload-amber">
                  <Camera size={22} strokeWidth={1.7} />
                  <p>Subir fotos · {form.imagenes.length} / {MAX_PCP_IMAGES}</p>
                  <input type="file" multiple accept="image/*" capture="environment" onChange={handleUpload} style={{ display: 'none' }} />
                </label>

                {form.imagenes.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                    {form.imagenes.map((img, i) => (
                      <div key={i} style={{ position: 'relative' }}>
                        <img src={img} alt="" className="thumb" style={{ width: 52, height: 52 }} />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          aria-label="Quitar"
                          style={{ position: 'absolute', top: -5, right: -5, width: 18, height: 18, borderRadius: '50%', border: 'none', background: 'var(--red)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button type="submit" className="btn amber block">
                  <Check size={15} /> Guardar en lista negra
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Listado */}
        <div className="col">
          <div className="card">
            <div className="card-h">
              <h3>
                <Search size={16} className="hi" /> Personas registradas
              </h3>
            </div>
            <div className="card-b">
              <div className="field" style={{ marginBottom: 16 }}>
                <input placeholder="Buscar en lista negra…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>

              {paginated.length === 0 ? (
                <EmptyState
                  icon={UserX}
                  title="Lista negra vacía"
                  hint={personas.length ? 'Ningún registro coincide con la búsqueda.' : 'Registra la primera persona de interés.'}
                />
              ) : (
                <div className="pcp-grid">
                  {paginated.map((p) => (
                    <div key={p.id} className="pcp-card">
                      <div className="pcp-photo" onClick={() => p.imagenes[0] && onImageClick(p.imagenes[0])}>
                        {p.imagenes.length > 0 ? (
                          <img src={p.imagenes[0]} alt={p.nombre} />
                        ) : (
                          <UserX size={26} strokeWidth={1.5} />
                        )}
                        {p.imagenes.length > 1 && (
                          <span style={{ position: 'absolute', bottom: 8, left: 8, fontSize: 10, fontWeight: 700, background: 'rgba(8,11,20,0.8)', padding: '2px 8px', borderRadius: 20 }}>
                            +{p.imagenes.length - 1}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(p);
                          }}
                          aria-label="Eliminar"
                          style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'rgba(255,77,94,0.85)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
                        >
                          <X size={15} />
                        </button>
                      </div>
                      <div style={{ padding: 12 }}>
                        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600 }}>{p.nombre}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--amber)', margin: '4px 0' }}>{p.terminos}</div>
                        <p className="line-clamp-2" style={{ fontSize: 12, color: 'var(--txt-dim)' }}>{p.descripcion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 16 }}>
                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
