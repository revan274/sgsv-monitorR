import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Incidente, PersonaInteres } from '../types/index';

export interface KpiPdfOptions {
  incidentes: Incidente[];
  personasInteres: PersonaInteres[];
  dateRange: number;
  reportData: {
    total: number;
    criticos: number;
    abiertos: number;
    cerrados: number;
    resolucion: number;
    tiempoPromedio: number;
    byLocation: Record<string, number>;
    byType: Record<string, number>;
    topCriticos: Incidente[];
    incidentesPeriodo: Incidente[];
  };
}

type RGB = [number, number, number];

const C: Record<string, RGB> = {
  header:  [15, 23, 42],
  accent:  [79, 70, 229],
  danger:  [220, 38, 38],
  warning: [234, 88, 12],
  success: [5, 150, 105],
  amber:   [217, 119, 6],
  text:    [30, 41, 59],
  muted:   [100, 116, 139],
  light:   [248, 250, 252],
  border:  [226, 232, 240],
  white:   [255, 255, 255],
};

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;

const sf = (doc: jsPDF, c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
const sd = (doc: jsPDF, c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);
const st = (doc: jsPDF, c: RGB) => doc.setTextColor(c[0], c[1], c[2]);

const drawPageHeader = (doc: jsPDF, title: string, subtitle: string) => {
  sf(doc, C.header);
  doc.rect(0, 0, PAGE_W, 22, 'F');
  st(doc, C.white);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('SGSV Monitor', MARGIN, 13);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 175, 200);
  doc.text(title, MARGIN, 19);
  doc.text(subtitle, PAGE_W - MARGIN, 13, { align: 'right' });
  doc.text(`Generado: ${new Date().toLocaleString()}`, PAGE_W - MARGIN, 19, { align: 'right' });
};

const addFooters = (doc: jsPDF) => {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    sf(doc, C.light);
    doc.rect(0, PAGE_H - 9, PAGE_W, 9, 'F');
    sd(doc, C.border);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, PAGE_H - 9, PAGE_W - MARGIN, PAGE_H - 9);
    doc.setFontSize(6.5);
    st(doc, C.muted);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'Documento Confidencial — Uso Interno | SGSV Sistema de Gestión de Siniestros y Videovigilancia',
      MARGIN,
      PAGE_H - 3.5,
    );
    doc.text(`Pág. ${i} / ${pages}`, PAGE_W - MARGIN, PAGE_H - 3.5, { align: 'right' });
  }
};

const drawKpiCard = (
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  label: string, value: string,
  color: RGB,
  subLabel?: string,
) => {
  sf(doc, C.white);
  sd(doc, C.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, 'FD');
  sf(doc, color);
  doc.rect(x, y, w, 1.8, 'F');
  st(doc, C.muted);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text(label.toUpperCase(), x + 4, y + 9);
  st(doc, color);
  doc.setFontSize(17);
  doc.setFont('helvetica', 'bold');
  doc.text(value, x + 4, y + h - 5);
  if (subLabel) {
    const vw = doc.getTextWidth(value);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    st(doc, C.muted);
    doc.text(subLabel, x + 4 + vw + 1, y + h - 5);
  }
};

const drawSectionTitle = (doc: jsPDF, x: number, y: number, title: string) => {
  st(doc, C.header);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(title, x, y);
  sd(doc, C.accent);
  doc.setLineWidth(0.5);
  doc.line(x, y + 1, x + doc.getTextWidth(title), y + 1);
  doc.setLineWidth(0.2);
};

const drawHorizontalBars = (
  doc: jsPDF,
  x: number, y: number, w: number,
  data: { label: string; value: number; color?: RGB }[],
  defaultColor: RGB,
  rowH = 8,
): number => {
  if (!data.length) {
    st(doc, C.muted);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.text('Sin datos en este período', x + 2, y + 6);
    return y + rowH;
  }
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const labelW = 42;
  const numW = 10;
  const barAreaW = w - labelW - numW - 4;

  data.slice(0, 10).forEach((item, i) => {
    const ry = y + i * rowH;
    if (i % 2 === 0) { sf(doc, C.light); doc.rect(x, ry, w, rowH, 'F'); }
    const col = item.color ?? defaultColor;
    st(doc, C.text);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const lbl = item.label.length > 18 ? `${item.label.substring(0, 17)}…` : item.label;
    doc.text(lbl, x + 2, ry + rowH - 2);
    doc.setFont('helvetica', 'bold');
    st(doc, col);
    doc.text(String(item.value), x + labelW + numW, ry + rowH - 2, { align: 'right' });
    const bw = (item.value / maxVal) * barAreaW;
    if (bw > 0.5) { sf(doc, col); doc.rect(x + labelW + numW + 2, ry + 2.5, bw, rowH - 5, 'F'); }
  });
  return y + Math.min(data.length, 10) * rowH;
};

// ─── KPI multi-page report ────────────────────────────────────────────────────
export const generateKpiPdf = (options: KpiPdfOptions): Blob => {
  const { personasInteres, dateRange, reportData } = options;
  const {
    total, criticos, abiertos, cerrados, resolucion, tiempoPromedio,
    byLocation, byType, topCriticos, incidentesPeriodo,
  } = reportData;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // ── Page 1: Dashboard ───────────────────────────────────────────────────────
  drawPageHeader(doc, 'Reporte KPI Ejecutivo', `Últimos ${dateRange} días`);
  let y = 28;

  // Row 1 – 4 main KPI cards
  const c4W = (CONTENT_W - 6) / 4;
  const c4H = 22;
  drawKpiCard(doc, MARGIN,             y, c4W, c4H, 'Total Eventos',  String(total),    C.accent);
  drawKpiCard(doc, MARGIN + (c4W+2),   y, c4W, c4H, 'Alta Prioridad', String(criticos), C.danger);
  drawKpiCard(doc, MARGIN + (c4W+2)*2, y, c4W, c4H, 'Abiertos',       String(abiertos), C.warning);
  drawKpiCard(doc, MARGIN + (c4W+2)*3, y, c4W, c4H, 'Resueltos',      String(cerrados), C.success);
  y += c4H + 3;

  // Row 2 – 3 secondary KPI cards
  const c3W = (CONTENT_W - 4) / 3;
  const c3H = 18;
  drawKpiCard(doc, MARGIN,              y, c3W, c3H, 'Tasa de Resolución',   String(resolucion),     C.accent,  '%');
  drawKpiCard(doc, MARGIN + c3W + 2,    y, c3W, c3H, 'Tiempo Prom. Cierre', String(tiempoPromedio), C.header,  ' hrs');
  drawKpiCard(doc, MARGIN + (c3W+2)*2,  y, c3W, c3H, 'PCP Activos',         String(personasInteres.length), C.amber);
  y += c3H + 7;

  // Two-column horizontal bar charts
  const halfW = (CONTENT_W - 5) / 2;
  const rightX = MARGIN + halfW + 5;
  drawSectionTitle(doc, MARGIN,  y, 'Distribución por Ubicación');
  drawSectionTitle(doc, rightX, y, 'Distribución por Tipo');
  y += 5;

  const locEndY  = drawHorizontalBars(doc, MARGIN,  y, halfW,
    Object.entries(byLocation).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })),
    C.accent);
  const typeEndY = drawHorizontalBars(doc, rightX, y, halfW,
    Object.entries(byType).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })),
    C.warning);
  y = Math.max(locEndY, typeEndY) + 7;

  // Severity distribution cards
  const sevData = [
    { label: 'Crítica', count: incidentesPeriodo.filter(i => i.severidad === 'Critica').length, color: C.danger },
    { label: 'Alta',    count: incidentesPeriodo.filter(i => i.severidad === 'Alta').length,  color: C.warning },
    { label: 'Media',   count: incidentesPeriodo.filter(i => i.severidad === 'Media').length, color: C.amber },
    { label: 'Baja',    count: incidentesPeriodo.filter(i => i.severidad === 'Baja').length,  color: C.success },
  ].filter(s => s.count > 0);

  if (sevData.length > 0) {
    drawSectionTitle(doc, MARGIN, y, 'Distribución por Severidad');
    y += 5;
    const sW = (CONTENT_W - (sevData.length - 1) * 3) / sevData.length;
    sevData.forEach((s, i) => drawKpiCard(doc, MARGIN + i * (sW + 3), y, sW, 18, s.label, String(s.count), s.color));
    y += 25;
  }

  // Top critical incidents table
  if (topCriticos.length > 0) {
    drawSectionTitle(doc, MARGIN, y, 'Eventos de Alta Prioridad Recientes');
    autoTable(doc, {
      startY: y + 4,
      margin: { bottom: 14 },
      head: [['Fecha', 'Título', 'Ubicación', 'Tipo', 'Severidad', 'Estado']],
      body: topCriticos.slice(0, 8).map((inc) => [
        inc.fecha.split(',')[0] ?? inc.fecha,
        inc.titulo, inc.ubicacion, inc.tipo, inc.severidad, inc.status,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      styles: { fontSize: 7, cellPadding: 2 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { cellWidth: 26 }, 2: { cellWidth: 26 }, 4: { cellWidth: 18 }, 5: { cellWidth: 22 } },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const s = data.cell.raw as string;
          if (s === 'Critica' || s === 'Crítica') { data.cell.styles.textColor = [220,38,38]; data.cell.styles.fontStyle = 'bold'; }
          else if (s === 'Alta') { data.cell.styles.textColor = [234,88,12]; data.cell.styles.fontStyle = 'bold'; }
        }
      },
      didDrawPage: () => drawPageHeader(doc, 'Reporte KPI Ejecutivo', `Últimos ${dateRange} días`),
    });
  }

  // ── Page 2: Full incidents list ─────────────────────────────────────────────
  if (incidentesPeriodo.length > 0) {
    doc.addPage();
    autoTable(doc, {
      startY: 28,
      margin: { top: 28, bottom: 14 },
      head: [['ID', 'Fecha', 'Título', 'Tipo', 'Severidad', 'Ubicación', 'Estado', 'Responsable']],
      body: incidentesPeriodo.map((inc) => [
        inc.id.substring(0, 8), inc.fecha, inc.titulo, inc.tipo,
        inc.severidad, inc.ubicacion, inc.status, inc.responsable,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { cellWidth: 18 }, 1: { cellWidth: 28 }, 4: { cellWidth: 18 }, 5: { cellWidth: 22 }, 6: { cellWidth: 22 } },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const s = data.cell.raw as string;
          if (s === 'Critica' || s === 'Crítica') { data.cell.styles.textColor = [220,38,38]; data.cell.styles.fontStyle = 'bold'; }
          else if (s === 'Alta') { data.cell.styles.textColor = [234,88,12]; data.cell.styles.fontStyle = 'bold'; }
        }
      },
      didDrawPage: () => drawPageHeader(doc, 'Listado de Incidentes', `${incidentesPeriodo.length} registros — Últimos ${dateRange} días`),
    });
  }

  // ── Page 3: PCP list ────────────────────────────────────────────────────────
  if (personasInteres.length > 0) {
    doc.addPage();
    autoTable(doc, {
      startY: 28,
      margin: { top: 28, bottom: 14 },
      head: [['Nombre', 'Motivo de Veto', 'Descripción', 'Fecha Registro', 'Fotos']],
      body: personasInteres.map((p) => [
        p.nombre, p.terminos,
        p.descripcion.length > 60 ? `${p.descripcion.substring(0, 59)}…` : p.descripcion,
        p.fechaRegistro,
        String(p.imagenes?.length ?? 0),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: [254, 252, 232] },
      columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' }, 1: { cellWidth: 40 }, 3: { cellWidth: 28 }, 4: { cellWidth: 14, halign: 'center' } },
      didDrawPage: () => drawPageHeader(doc, 'Personas de Control Preventivo (PCP)', `${personasInteres.length} registros activos`),
    });
  }

  addFooters(doc);
  return doc.output('blob');
};

// ─── Incidents-only table export (HistoryView) ────────────────────────────────
export const generateIncidentsPdf = ({ incidentes }: { incidentes: Incidente[] }): Blob => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  autoTable(doc, {
    startY: 28,
    margin: { top: 28, bottom: 14 },
    head: [['ID', 'Fecha', 'Título', 'Tipo', 'Severidad', 'Ubicación', 'Estado', 'Responsable']],
    body: incidentes.map((inc) => [
      inc.id.substring(0, 8), inc.fecha, inc.titulo, inc.tipo,
      inc.severidad, inc.ubicacion, inc.status, inc.responsable,
    ]),
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { cellWidth: 18 }, 1: { cellWidth: 28 }, 4: { cellWidth: 18 }, 5: { cellWidth: 22 }, 6: { cellWidth: 22 } },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const s = data.cell.raw as string;
        if (s === 'Critica' || s === 'Crítica') { data.cell.styles.textColor = [220,38,38]; data.cell.styles.fontStyle = 'bold'; }
        else if (s === 'Alta') { data.cell.styles.textColor = [234,88,12]; data.cell.styles.fontStyle = 'bold'; }
      }
    },
    didDrawPage: () => drawPageHeader(doc, 'Bitácora de Incidentes', `${incidentes.length} registros exportados`),
  });

  addFooters(doc);
  return doc.output('blob');
};
