export interface ErrorContext {
  component?: string;
  action?: string;
  entityId?: string;
  [key: string]: unknown;
}

const fmt = (context?: ErrorContext): string =>
  context
    ? ` [${Object.entries(context)
        .map(([k, v]) => `${k}=${String(v)}`)
        .join(' ')}]`
    : '';

/**
 * Captura un error con contexto estructurado.
 * Para migrar a Sentry: reemplazar el console.error con
 *   Sentry.captureException(error, { extra: context })
 */
export const captureError = (error: unknown, context?: ErrorContext): void => {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error(`[SGSV ERROR]${fmt(context)}`, {
    message,
    stack,
    ts: new Date().toISOString(),
  });
};

/**
 * Captura un aviso no crítico.
 * Para migrar a Sentry: reemplazar con
 *   Sentry.captureMessage(message, { level: 'warning', extra: context })
 */
export const captureWarning = (message: string, context?: ErrorContext): void => {
  console.warn(`[SGSV WARN]${fmt(context)}`, {
    message,
    ts: new Date().toISOString(),
  });
};