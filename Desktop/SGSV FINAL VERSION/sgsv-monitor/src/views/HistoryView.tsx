import { useMemo, useState } from 'react';
import {
  INCIDENT_TYPES,
  SEVERITY_OPTIONS,
  STATUS_OPTIONS,
  normalizeSearchText,
  normalizeTimestamp,
  stripPreviewForStorage,
  toCsvCell,
} from '../lib/utils';
import { generateIncidentsPdf } from '../lib/pdfGenerator';
import { Download, FileText, Trash2, Edit2 } from 'lucide-react';
import IncidentChart from '../components/ui/IncidentChart';
import EditIncidentModal from '../components/ui/EditIncidentModal';
import IncidentNotes from '../components/ui/IncidentNotes';

const INC_PER_PAGE = 10;
const severityRank = { Critica: 4, Alta: 3, Media: 2, Baja: 1 };

export default function HistoryView({
  incidentes,
  deleteIncidente,
  updateIncidente,
  setLightboxImage,
  blacklistTerms,
  openModal,
  notify,
  canDelete,
  canExport,
  canEdit,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('Todos');
  const [filterSeverity, setFilterSeverity] = useState('Todas');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [sortBy, setSortBy] = useState('fecha_desc');
  const [excludeBlacklistMatches, setExcludeBlacklistMatches] = useState(false);
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [currentPageInc, setCurrentPageInc] = useState(1);
  const [savingMap, setSavingMap] = useState({});
  const [localResponsable, setLocalResponsable] = useState({});
  
  // State para Edit Modal
  const [editingIncident, setEditingIncident] = useState(null);

  const incidentesPrepared = useMemo(() => {
    return incidentes.map((inc) => {
      const indexText = normalizeSearchText(
        `${inc.titulo} ${inc.descripcion} ${inc.ubicacion} ${inc.tipo} ${inc.severidad} ${inc.status} ${inc.responsable}`
      );
      const hasBlacklistMatch = blacklistTerms.some((term) => term && indexText.includes(term));
      return { ...inc, _indexText: indexText, _hasBlacklistMatch: hasBlacklistMatch };
    });
  }, [incidentes, blacklistTerms]);

  const filteredIncidentes = useMemo(() => {
    const normalizedSearch = normalizeSearchText(searchTerm);
    const filtered = incidentesPrepared.filter((inc) => {
      const timestamp = normalizeTimestamp(inc.timestamp);
      const matchesSearch = !normalizedSearch || inc._indexText.includes(normalizedSearch);
      const matchesType = filterType === 'Todos' || inc.tipo === filterType;
      const matchesSeverity = filterSeverity === 'Todas' || inc.severidad === filterSeverity;
      const matchesStatus = filterStatus === 'Todos' || inc.status === filterStatus;
      const matchesBlacklist = !excludeBlacklistMatches || !inc._hasBlacklistMatch;
      const matchesStart = !filterDateStart || timestamp >= new Date(`${filterDateStart}T00:00:00`).getTime();
      const matchesEnd = !filterDateEnd || timestamp <= new Date(`${filterDateEnd}T23:59:59`).getTime();

      return matchesSearch && matchesType && matchesSeverity && matchesStatus && matchesBlacklist && matchesStart && matchesEnd;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'fecha_asc') return normalizeTimestamp(a.timestamp) - normalizeTimestamp(b.timestamp);
      if (sortBy === 'severidad_desc') return (severityRank[b.severidad] || 0) - (severityRank[a.severidad] || 0);
      if (sortBy === 'severidad_asc') return (severityRank[a.severidad] || 0) - (severityRank[b.severidad] || 0);
      return normalizeTimestamp(b.timestamp) - normalizeTimestamp(a.timestamp);
    });
  }, [
    incidentesPrepared,
    searchTerm,
    filterType,
    filterSeverity,
    filterStatus,
    excludeBlacklistMatches,
    sortBy,
    filterDateStart,
    filterDateEnd,
  ]);

  const setFilter = (setter) => (event) => {
    setter(event.target.value);
    setCurrentPageInc(1);
  };

  const setCheckboxFilter = (setter) => (event) => {
    setter(event.target.checked);
    setCurrentPageInc(1);
  };

  const totalIncPages = Math.max(1, Math.ceil(filteredIncidentes.length / INC_PER_PAGE));
  const safeCurrentPage = Math.min(currentPageInc, totalIncPages);

  const paginatedIncidentes = useMemo(
    () => filteredIncidentes.slice((safeCurrentPage - 1) * INC_PER_PAGE, safeCurrentPage * INC_PER_PAGE),
    [filteredIncidentes, safeCurrentPage]
  );

  const setSaving = (id, val) => setSavingMap((prev) => ({ ...prev, [id]: val }));

  const handleStatusChange = async (inc, newStatus) => {
    if (!canEdit) return;
    setSaving(inc.id, true);
    try {
      const updatedData = { ...inc, status: newStatus };
      if (newStatus === 'Cerrado' && inc.status !== 'Cerrado') {
        updatedData.closedAt = Date.now();
      } else if (newStatus !== 'Cerrado') {
        updatedData.closedAt = null;
      }
      await updateIncidente(updatedData);
      notify('Estado actualizado.');
    } catch {
      notify('No se pudo actualizar el estado.', 'error');
    } finally {
      setSaving(inc.id, false);
    }
  };

  const handleResponsableBlur = async (inc) => {
    if (!canEdit) return;
    const newVal = (localResponsable[inc.id] ?? inc.responsable).trim();
    if (newVal === inc.responsable) return;
    setSaving(inc.id, true);
    try {
      await updateIncidente({ ...inc, responsable: newVal });
      notify('Responsable actualizado.');
    } catch {
      notify('No se pudo actualizar el responsable.', 'error');
    } finally {
      setSaving(inc.id, false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Critica':
        return 'bg-red-900/50 text-red-200 border-red-700/50';
      case 'Alta':
        return 'bg-orange-900/50 text-orange-200 border-orange-700/50';
      case 'Media':
        return 'bg-yellow-900/50 text-yellow-200 border-yellow-700/50';
      default:
        return 'bg-blue-900/50 text-blue-200 border-blue-700/50';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Cerrado':
        return 'bg-emerald-900/50 text-emerald-200 border-emerald-700/50';
      case 'En seguimiento':
        return 'bg-indigo-900/50 text-indigo-200 border-indigo-700/50';
      default:
        return 'bg-slate-800/50 text-slate-200 border-slate-600/50';
    }
  };

  const downloadFile = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const header = ['ID', 'Fecha', 'Titulo', 'Tipo', 'Severidad', 'Estado', 'Responsable', 'Ubicacion', 'Descripcion'];
    const rows = [header.map(toCsvCell).join(',')];
    filteredIncidentes.forEach((inc) => {
      rows.push([
        inc.id,
        inc.fecha,
        inc.titulo,
        inc.tipo,
        inc.severidad,
        inc.status,
        inc.responsable,
        inc.ubicacion,
        inc.descripcion,
      ].map(toCsvCell).join(','));
    });
    downloadFile(new Blob([rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' }), 'reporte_siniestros.csv');
  };

  const exportJSON = () => {
    const payload = JSON.stringify(incidentes.map(stripPreviewForStorage), null, 2);
    downloadFile(new Blob([payload], { type: 'application/json;charset=utf-8;' }), 'backup_sgsv.json');
  };

  const exportPDF = async () => {
    notify('Generando reporte PDF...', 'success');
    try {
      await generateIncidentsPdf({ incidentes: filteredIncidentes, chartElementId: 'hidden-chart-export' });
      notify('Reporte PDF generado correctamente.');
    } catch {
      notify('No se pudo generar el PDF.', 'error');
    }
  };

  const confirmDelete = (incidentId) => {
    openModal('Borrar', 'Borrar incidente?', async () => {
      try {
        await deleteIncidente(incidentId);
        notify('Incidente eliminado.');
      } catch {
        notify('No se pudo eliminar el incidente.', 'error');
      }
    });
  };

  return (
    <div className="space-y-6 no-print animate-fade-in">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-white">Bitacora e Historial</h2>
        {canExport && (
          <div className="flex gap-2">
            <button onClick={exportPDF} className="text-xs flex items-center gap-1 bg-red-600/80 hover:bg-red-500 px-3 py-2 rounded-lg text-white backdrop-blur transition">
              <FileText className="w-4 h-4" /> PDF
            </button>
            <button onClick={exportCSV} className="text-xs flex items-center gap-1 bg-emerald-600/80 hover:bg-emerald-500 px-3 py-2 rounded-lg text-white backdrop-blur transition">
              <Download className="w-4 h-4" /> CSV
            </button>
            <button onClick={exportJSON} className="text-xs flex items-center gap-1 glass-input px-3 py-2 rounded-lg text-white transition hover:bg-white/10">
              <Download className="w-4 h-4" /> JSON
            </button>
          </div>
        )}
      </div>

      <div className="glass-panel p-5 rounded-2xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <input type="text" placeholder="Buscar..." value={searchTerm} onChange={setFilter(setSearchTerm)} className="glass-input w-full rounded-lg px-4 py-2.5 text-white" />
          </div>
          <select value={filterType} onChange={setFilter(setFilterType)} className="glass-input rounded-lg px-3 py-2.5 text-white">
            <option value="Todos" className="bg-slate-900">Tipos</option>
            {INCIDENT_TYPES.map((type) => <option key={type} value={type} className="bg-slate-900">{type}</option>)}
          </select>
          <select value={filterSeverity} onChange={setFilter(setFilterSeverity)} className="glass-input rounded-lg px-3 py-2.5 text-white">
            <option value="Todas" className="bg-slate-900">Severidad</option>
            {SEVERITY_OPTIONS.map((severity) => <option key={severity} value={severity} className="bg-slate-900">{severity}</option>)}
          </select>
          <select value={filterStatus} onChange={setFilter(setFilterStatus)} className="glass-input rounded-lg px-3 py-2.5 text-white">
            <option value="Todos" className="bg-slate-900">Estado</option>
            {STATUS_OPTIONS.map((status) => <option key={status} value={status} className="bg-slate-900">{status}</option>)}
          </select>
          <select value={sortBy} onChange={setFilter(setSortBy)} className="glass-input rounded-lg px-3 py-2.5 text-white">
            <option value="fecha_desc" className="bg-slate-900">Mas recientes</option>
            <option value="fecha_asc" className="bg-slate-900">Mas antiguos</option>
            <option value="severidad_desc" className="bg-slate-900">Mayor severidad</option>
            <option value="severidad_asc" className="bg-slate-900">Menor severidad</option>
          </select>
          <input type="date" value={filterDateStart} onChange={setFilter(setFilterDateStart)} className="glass-input rounded-lg px-3 py-2.5 text-white" />
          <input type="date" value={filterDateEnd} onChange={setFilter(setFilterDateEnd)} className="glass-input rounded-lg px-3 py-2.5 text-white" />
          <label className="glass-input rounded-lg px-3 py-2.5 text-slate-300 flex items-center gap-2">
            <input type="checkbox" checked={excludeBlacklistMatches} onChange={setCheckboxFilter(setExcludeBlacklistMatches)} />
            <span className="text-sm">Excluir PCP</span>
          </label>
        </div>
      </div>

      <div className="space-y-4">
        {paginatedIncidentes.map((inc) => (
          <div key={inc.id} className="glass-panel rounded-2xl transition-all hover:border-blue-500/30 hover:shadow-xl group overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <div className="flex-1 p-5">
                <div className="flex items-center gap-2 mb-3 flex-wrap border-b border-white/5 pb-3">
                  <span className={`${getSeverityColor(inc.severidad)} px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border`}>{inc.severidad}</span>
                  <span className={`${getStatusColor(inc.status)} px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border`}>{inc.status}</span>
                  <span className="text-slate-400 text-xs font-mono bg-slate-900/50 px-2 py-1 rounded border border-white/5">{inc.ubicacion}</span>
                  <span className="text-slate-400 text-xs ml-auto font-mono">{inc.fecha}</span>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">{inc.titulo}</h3>
                <p className="text-slate-300 text-sm mb-4 leading-relaxed">{inc.descripcion}</p>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/30 p-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 flex-wrap flex-1">
                    <select
                      value={inc.status}
                      onChange={(e) => handleStatusChange(inc, e.target.value)}
                      disabled={!canEdit || savingMap[inc.id]}
                      className="glass-input input-sm text-xs text-white bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
                    </select>
                    <input
                      type="text"
                      value={localResponsable[inc.id] ?? inc.responsable}
                      onChange={(e) => setLocalResponsable((prev) => ({ ...prev, [inc.id]: e.target.value }))}
                      onBlur={() => handleResponsableBlur(inc)}
                      disabled={!canEdit || savingMap[inc.id]}
                      placeholder="Responsable"
                      className="glass-input input-sm text-xs text-white min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    {savingMap[inc.id] && <span className="text-xs text-slate-400 animate-pulse">Guardando...</span>}
                  </div>

                  <div className="flex items-center gap-2">
                    {canEdit && (
                      <button onClick={() => setEditingIncident(inc)} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition px-3 py-1.5 rounded bg-indigo-900/20 border border-indigo-900/50">
                        <Edit2 className="w-3 h-3" /> Editar
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => confirmDelete(inc.id)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition px-3 py-1.5 rounded bg-red-900/20 border border-red-900/50">
                        <Trash2 className="w-3 h-3" /> Eliminar
                      </button>
                    )}
                  </div>
                </div>

                <IncidentNotes incidente={inc} updateIncidente={updateIncidente} notify={notify} />
              </div>
              
              {(inc.imagenEvidencia || inc.imagenPersona) && (
                <div className="flex md:flex-col gap-2 p-5 bg-slate-900/50 border-t md:border-t-0 md:border-l border-white/5 md:w-40 justify-center">
                  {inc.imagenEvidencia && <img src={inc.imagenEvidencia} onClick={() => setLightboxImage(inc.imagenEvidencia)} className="w-full h-24 md:h-28 object-cover rounded-lg cursor-pointer border border-white/10 hover:opacity-80 transition hover:scale-105" alt="Evidencia" />}
                  {inc.imagenPersona && <img src={inc.imagenPersona} onClick={() => setLightboxImage(inc.imagenPersona)} className="w-full h-24 md:h-28 object-cover rounded-lg cursor-pointer border border-white/10 hover:opacity-80 transition hover:scale-105" alt="Persona" />}
                </div>
              )}
            </div>
          </div>
        ))}
        {paginatedIncidentes.length === 0 && (
          <div className="text-center py-16 glass-panel rounded-2xl flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-4">
              <FileText className="w-10 h-10 text-slate-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No se encontraron registros</h3>
            <p className="text-slate-400 max-w-sm">Prueba ajustando los filtros de busqueda, fecha o estado para ver mas resultados.</p>
          </div>
        )}
      </div>

      {totalIncPages > 1 && (
        <div className="flex justify-between items-center glass-panel p-4 rounded-xl">
          <button disabled={safeCurrentPage === 1} onClick={() => setCurrentPageInc((page) => Math.max(1, page - 1))} className="px-4 py-2 glass-input rounded-lg disabled:opacity-30 text-sm font-medium cursor-pointer">Anterior</button>
          <span className="text-slate-400 text-sm font-medium">Pagina {safeCurrentPage} de {totalIncPages}</span>
          <button disabled={safeCurrentPage === totalIncPages} onClick={() => setCurrentPageInc((page) => Math.min(totalIncPages, page + 1))} className="px-4 py-2 glass-input rounded-lg disabled:opacity-30 text-sm font-medium cursor-pointer">Siguiente</button>
        </div>
      )}

      {/* Gráfico oculto exclusivo para el renderizado del PDF mediante html2canvas */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '800px' }}>
        <IncidentChart incidentesPrepared={incidentesPrepared} containerId="hidden-chart-export" />
      </div>

      <EditIncidentModal
        isOpen={!!editingIncident}
        onClose={() => setEditingIncident(null)}
        incidente={editingIncident}
        updateIncidente={updateIncidente}
        notify={notify}
      />
    </div>
  );
}
