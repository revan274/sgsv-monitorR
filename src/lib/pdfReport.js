import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { INCIDENT_TYPES, SEVERITY_OPTIONS, STATUS_OPTIONS, LOCATION_OPTIONS } from '../domain/constants.js';

// Paleta (RGB) alineada con el sistema de diseño.
const COL = {
  bg: [14, 19, 34],
  accent: [61, 123, 255],
  red: [255, 77, 94],
  cyan: [52, 198, 255],
  green: [31, 214, 160],
  amber: [240, 130, 15],
  text: [40, 48, 66],
  dim: [120, 130, 150],
  line: [222, 227, 238],
};

const countBy = (items, key) =>
  items.reduce((acc, it) => {
    const k = it[key] || '—';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

const orderedCounts = (items, key, order) => {
  const counts = countBy(items, key);
  const rows = order.filter((o) => counts[o]).map((o) => [o, String(counts[o])]);
  Object.keys(counts)
    .filter((k) => !order.includes(k))
    .forEach((k) => rows.push([k, String(counts[k])]));
  return rows;
};

export function generatePdfReport(incidents, meta = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  const generatedAt = new Date().toLocaleString();

  // ---- Cabecera ----
  doc.setFillColor(...COL.bg);
  doc.rect(0, 0, W, 84, 'F');
  doc.setFillColor(...COL.accent);
  doc.roundedRect(M, 26, 32, 32, 7, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('SGSV Monitor', M + 44, 44);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(170, 182, 205);
  doc.text(meta.title || 'Reporte de Siniestros', M + 44, 62);
  doc.setFontSize(9);
  doc.text(`Generado: ${generatedAt}`, W - M, 44, { align: 'right' });
  if (meta.filterSummary) doc.text(meta.filterSummary, W - M, 60, { align: 'right' });

  let y = 110;

  // ---- KPIs ----
  const criticos = incidents.filter((i) => i.severidad === 'Critica' || i.severidad === 'Alta').length;
  const abiertos = incidents.filter((i) => i.status === 'Abierto').length;
  const cerrados = incidents.filter((i) => i.status === 'Cerrado').length;
  const kpis = [
    { label: 'TOTAL', value: incidents.length, color: COL.accent },
    { label: 'ALTA PRIORIDAD', value: criticos, color: COL.red },
    { label: 'ABIERTOS', value: abiertos, color: COL.cyan },
    { label: 'CERRADOS', value: cerrados, color: COL.green },
  ];
  const gap = 12;
  const boxW = (W - M * 2 - gap * 3) / 4;
  kpis.forEach((k, i) => {
    const x = M + i * (boxW + gap);
    doc.setDrawColor(...COL.line);
    doc.setFillColor(248, 249, 252);
    doc.roundedRect(x, y, boxW, 56, 6, 6, 'FD');
    doc.setFontSize(7.5);
    doc.setTextColor(...COL.dim);
    doc.text(k.label, x + 10, y + 18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...k.color);
    doc.text(String(k.value), x + 10, y + 44);
    doc.setFont('helvetica', 'normal');
  });
  y += 80;

  // ---- Desgloses ----
  const breakdowns = [
    ['Por tipo', orderedCounts(incidents, 'tipo', INCIDENT_TYPES)],
    ['Por severidad', orderedCounts(incidents, 'severidad', SEVERITY_OPTIONS)],
    ['Por estado', orderedCounts(incidents, 'status', STATUS_OPTIONS)],
    ['Por ubicación', orderedCounts(incidents, 'ubicacion', LOCATION_OPTIONS)],
  ];
  // 2x2 de tablas pequeñas (dos columnas, dos filas).
  const colW = (W - M * 2 - gap) / 2;
  const drawBreakdown = ([title, rows], x, startY) => {
    autoTable(doc, {
      startY,
      margin: { left: x },
      tableWidth: colW,
      head: [[title, 'Conteo']],
      body: rows.length ? rows : [['—', '0']],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 4, lineColor: COL.line, textColor: COL.text },
      headStyles: { fillColor: COL.bg, textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right', cellWidth: 60 } },
    });
    return doc.lastAutoTable.finalY;
  };
  const leftX = M;
  const rightX = M + colW + gap;
  const r0a = drawBreakdown(breakdowns[0], leftX, y);
  const r0b = drawBreakdown(breakdowns[1], rightX, y);
  const row1Y = Math.max(r0a, r0b) + 14;
  const r1a = drawBreakdown(breakdowns[2], leftX, row1Y);
  const r1b = drawBreakdown(breakdowns[3], rightX, row1Y);
  y = Math.max(r1a, r1b) + 22;

  // ---- Detalle ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...COL.text);
  doc.text('Detalle de incidentes', M, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['Fecha', 'Título', 'Tipo', 'Severidad', 'Estado', 'Ubicación', 'Responsable']],
    body: incidents.map((i) => [i.fecha, i.titulo, i.tipo, i.severidad, i.status, i.ubicacion, i.responsable]),
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak', textColor: COL.text },
    headStyles: { fillColor: COL.accent, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [246, 248, 251] },
    columnStyles: {
      0: { cellWidth: 78 },
      1: { cellWidth: 110 },
      3: { cellWidth: 56 },
      4: { cellWidth: 64 },
    },
  });

  // ---- Pie de página ----
  const pages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    const H = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(...COL.dim);
    doc.text('SGSV Monitor · Documento confidencial', M, H - 18);
    doc.text(`Página ${p} de ${pages}`, W - M, H - 18, { align: 'right' });
  }

  doc.save(`reporte_sgsv_${Date.now()}.pdf`);
}
