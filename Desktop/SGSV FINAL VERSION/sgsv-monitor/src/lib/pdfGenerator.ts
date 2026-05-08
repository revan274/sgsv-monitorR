import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import type { Incidente } from '../types';

export const generateIncidentsPdf = async ({
  incidentes,
  chartElementId,
}: {
  incidentes: Incidente[];
  chartElementId?: string;
}): Promise<void> => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SGSV Monitor - Reporte Oficial', 14, 16);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado: ${new Date().toLocaleString()}`, pageWidth - 14, 16, { align: 'right' });

  let startY = 35;

  if (chartElementId) {
    const chartEl = document.getElementById(chartElementId);
    if (chartEl) {
      try {
        const canvas = await html2canvas(chartEl, {
          backgroundColor: '#0f172a',
          scale: 2,
          logging: false,
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.8);
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('KPI: Actividad de Incidentes (60 días)', 14, startY);
        const imgWidth = pageWidth - 28;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        doc.addImage(imgData, 'JPEG', 14, startY + 5, imgWidth, imgHeight);
        startY = startY + imgHeight + 20;
      } catch (err) {
        console.error('Error capturando el gráfico:', err);
      }
    }
  }

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Registro de Incidentes', 14, startY);

  const tableData = incidentes.map((inc) => [
    inc.id.substring(0, 8),
    inc.fecha,
    inc.titulo,
    inc.tipo,
    inc.severidad,
    inc.ubicacion,
  ]);

  autoTable(doc, {
    startY: startY + 5,
    head: [['ID', 'Fecha', 'Título', 'Tipo', 'Severidad', 'Ubicación']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const sev = data.cell.raw as string;
        if (sev === 'Critica' || sev === 'Crítica') {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        } else if (sev === 'Alta') {
          data.cell.styles.textColor = [234, 88, 12];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  doc.save(`SGSV_Reporte_${Date.now()}.pdf`);
};
