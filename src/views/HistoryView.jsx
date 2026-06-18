import { useEffect, useMemo, useRef, useState } from 'react';
import { ListChecks, FileSpreadsheet, FileDown, Download, Upload, Trash2, Inbox } from 'lucide-react';
import { INCIDENT_TYPES, SEVERITY_OPTIONS, STATUS_OPTIONS, SEVERITY_RANK } from '../domain/constants.js';
import { normalizeSearchText, normalizeTimestamp, toCsvCell } from '../domain/utils.js';
import { severitySlug, statusSlug } from '../components/badges.js';
import Pagination from '../components/Pagination.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Topbar from '../components/Topbar.jsx';

const PER_PAGE = 8;

const INITIAL_FILTERS = {
  search: '',
  tipo: 'Todos',
  severidad: 'Todas',
  status: 'Todos',
  sortBy: 'fecha_desc',
  excludeBlacklist: false,
  dateStart: '',
  dateEnd: '',
};

function downloadBlob(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function HistoryView({ incidents, blacklistTerms, onDelete, onImport, onImageClick }) {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const importRef = useRef(null);

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  const prepared = useMemo(
    () =>
      incidents.map((inc) => {
        const indexText = normalizeSearchText(
          `${inc.titulo} ${inc.descripcion} ${inc.ubicacion} ${inc.tipo} ${inc.severidad} ${inc.status} ${inc.responsable}`,
        );
        return { ...inc, _indexText: indexText, _blacklisted: blacklistTerms.some((t) => t && indexText.includes(t)) };
      }),
    [incidents, blacklistTerms],
  );

  const filtered = useMemo(() => {
    const ns = normalizeSearchText(filters.search);
    const start = filters.dateStart ? new Date(filters.dateStart + 'T00:00:00').getTime() : null;
    const end = filters.dateEnd ? new Date(filters.dateEnd + 'T23:59:59').getTime() : null;

    const result = prepared.filter((inc) => {
      if (ns && !inc._indexText.includes(ns)) return false;
      if (filters.tipo !== 'Todos' && inc.tipo !== filters.tipo) return false;
      if (filters.severidad !== 'Todas' && inc.severidad !== filters.severidad) return false;
      if (filters.status !== 'Todos' && inc.status !== filters.status) return false;
      if (filters.excludeBlacklist && inc._blacklisted) return false;
      const ts = normalizeTimestamp(inc.timestamp);
      if (start !== null && ts < start) return false;
      if (end !== null && ts > end) return false;
      return true;
    });

    return result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'fecha_asc':
          return normalizeTimestamp(a.timestamp) - normalizeTimestamp(b.timestamp);
        case 'severidad_desc':
          return (SEVERITY_RANK[b.severidad] || 0) - (SEVERITY_RANK[a.severidad] || 0);
        case 'severidad_asc':
          return (SEVERITY_RANK[a.severidad] || 0) - (SEVERITY_RANK[b.severidad] || 0);
        default:
          return normalizeTimestamp(b.timestamp) - normalizeTimestamp(a.timestamp);
      }
    });
  }, [prepared, filters]);

  useEffect(() => setPage(1), [filters]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const exportCSV = () => {
    const header = ['ID', 'Fecha', 'Titulo', 'Tipo', 'Severidad', 'Estado', 'Responsable', 'Ubicacion', 'Descripcion'];
    const rows = [header.map(toCsvCell).join(',')];
    filtered.forEach((inc) =>
      rows.push(
        [inc.id, inc.fecha, inc.titulo, inc.tipo, inc.severidad, inc.status, inc.responsable, inc.ubicacion, inc.descripcion]
          .map(toCsvCell)
          .join(','),
      ),
    );
    downloadBlob(rows.join('\r\n'), 'reporte_siniestros.csv', 'text/csv;charset=utf-8;');
  };

  const exportJSON = () => {
    const clean = incidents.map(({ _indexText, _blacklisted, ...rest }) => rest);
    downloadBlob(JSON.stringify(clean, null, 2), 'backup_sgsv.json', 'application/json;charset=utf-8;');
  };

  const exportPDF = async () => {
    const active = [];
    if (filters.search) active.push(`texto: "${filters.search}"`);
    if (filters.tipo !== 'Todos') active.push(`tipo: ${filters.tipo}`);
    if (filters.severidad !== 'Todas') active.push(`severidad: ${filters.severidad}`);
    if (filters.status !== 'Todos') active.push(`estado: ${filters.status}`);
    if (filters.dateStart) active.push(`desde ${filters.dateStart}`);
    if (filters.dateEnd) active.push(`hasta ${filters.dateEnd}`);
    const { generatePdfReport } = await import('../lib/pdfReport.js');
    generatePdfReport(filtered, {
      title: 'Reporte de Siniestros',
      filterSummary: active.length ? `Filtros: ${active.join(' · ')}` : 'Todos los registros',
    });
  };

  const importJSON = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await onImport(await file.text());
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="animate-fade-in">
      <Topbar
        title="Bitácora e historial"
        subtitle={<><b>{filtered.length}</b> de {incidents.length} registro(s)</>}
        actions={
          <>
            <button className="btn primary" disabled={!filtered.length} onClick={exportPDF}>
              <FileDown size={15} /> Reporte PDF
            </button>
            <button className="btn green" onClick={exportCSV}>
              <FileSpreadsheet size={15} /> CSV
            </button>
            <button className="btn" onClick={exportJSON}>
              <Download size={15} /> JSON
            </button>
            <button className="btn" onClick={() => importRef.current?.click()}>
              <Upload size={15} /> Importar
            </button>
            <input ref={importRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={importJSON} />
          </>
        }
      />

      <div className="card">
        <div className="card-h">
          <h3>
            <ListChecks size={17} className="hi" /> Registros
          </h3>
        </div>

        <div className="filters">
          <input className="search" placeholder="Buscar incidente, persona o folio…" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} />
          <FilterSelect value={filters.tipo} onChange={(v) => setFilter('tipo', v)} all="Tipos" allValue="Todos" options={INCIDENT_TYPES} />
          <FilterSelect value={filters.severidad} onChange={(v) => setFilter('severidad', v)} all="Severidad" allValue="Todas" options={SEVERITY_OPTIONS} />
          <FilterSelect value={filters.status} onChange={(v) => setFilter('status', v)} all="Estado" allValue="Todos" options={STATUS_OPTIONS} />
          <select value={filters.sortBy} onChange={(e) => setFilter('sortBy', e.target.value)}>
            <option value="fecha_desc">Más recientes</option>
            <option value="fecha_asc">Más antiguos</option>
            <option value="severidad_desc">Severidad ↓</option>
            <option value="severidad_asc">Severidad ↑</option>
          </select>
          <input type="date" value={filters.dateStart} onChange={(e) => setFilter('dateStart', e.target.value)} style={{ flex: 1, minWidth: 130 }} />
          <input type="date" value={filters.dateEnd} onChange={(e) => setFilter('dateEnd', e.target.value)} style={{ flex: 1, minWidth: 130 }} />
          <label className="chk">
            <input type="checkbox" checked={filters.excludeBlacklist} onChange={(e) => setFilter('excludeBlacklist', e.target.checked)} />
            Ocultar coincidencias de lista negra
            <button type="button" className="clear" onClick={() => setFilters(INITIAL_FILTERS)}>
              Limpiar filtros
            </button>
          </label>
        </div>

        <div className="card-b">
          {paginated.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Sin incidentes"
              hint={incidents.length ? 'Ningún registro coincide con los filtros actuales.' : 'Aún no se ha registrado ningún evento.'}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {paginated.map((inc) => (
                <div
                  key={inc.id}
                  style={{ display: 'flex', gap: 14, padding: 14, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--panel-2)' }}
                >
                  <div className={`stripe sev-${severitySlug(inc.severidad)}`} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                      <span className={`pill sev-${severitySlug(inc.severidad)}`}>{inc.severidad}</span>
                      <span className={`pill st-${statusSlug(inc.status)}`}>{inc.status}</span>
                      {inc._blacklisted && <span className="pill sev-critica">⚠ PCP</span>}
                      <span className="meta" style={{ marginLeft: 'auto' }}>{inc.fecha}</span>
                    </div>
                    <h4 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 600 }}>{inc.titulo}</h4>
                    <div className="meta" style={{ margin: '2px 0 8px' }}>{inc.tipo} · {inc.ubicacion} · {inc.responsable}</div>
                    <p style={{ fontSize: 13, color: 'var(--txt-dim)', lineHeight: 1.5, marginBottom: 10 }}>{inc.descripcion}</p>
                    <button className="btn danger" style={{ padding: '6px 11px', fontSize: 11.5 }} onClick={() => onDelete(inc)}>
                      <Trash2 size={13} /> Eliminar
                    </button>
                  </div>
                  {(inc.imagenEvidencia || inc.imagenPersona) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 92, flex: 'none' }}>
                      {inc.imagenEvidencia && <img src={inc.imagenEvidencia} alt="Evidencia" className="thumb" style={{ height: 64, width: '100%' }} onClick={() => onImageClick(inc.imagenEvidencia)} />}
                      {inc.imagenPersona && <img src={inc.imagenPersona} alt="Persona" className="thumb" style={{ height: 64, width: '100%' }} onClick={() => onImageClick(inc.imagenPersona)} />}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, all, allValue, options }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value={allValue}>{all}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
