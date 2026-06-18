// Slugs de clase para pills y franjas, según severidad / estado.

export const severitySlug = (sev) => {
  switch (sev) {
    case 'Critica':
    case 'Crítica':
      return 'critica';
    case 'Alta':
      return 'alta';
    case 'Media':
      return 'media';
    default:
      return 'baja';
  }
};

export const statusSlug = (status) => {
  switch (status) {
    case 'Cerrado':
      return 'cerrado';
    case 'En seguimiento':
      return 'seguimiento';
    default:
      return 'abierto';
  }
};
