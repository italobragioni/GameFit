/**
 * Logs claros com horário, no formato pedido:
 *   [18:31] Iniciando video-001
 */
function ts(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function line(level: string, msg: string): string {
  return `[${ts()}] ${level}${msg}`;
}

export const log = {
  info(msg: string): void {
    console.log(line('', msg));
  },
  warn(msg: string): void {
    console.warn(line('⚠ ', msg));
  },
  error(msg: string, err?: unknown): void {
    const detail = err instanceof Error ? ` — ${err.message}` : err ? ` — ${String(err)}` : '';
    console.error(line('✖ ', msg + detail));
  },
};
