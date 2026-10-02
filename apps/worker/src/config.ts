import 'dotenv/config';
import { DEFAULT_MAX_ATTEMPTS } from '@editor/shared';

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Variável de ambiente obrigatória ausente: ${name}. Confira o seu arquivo .env (veja .env.example).`,
    );
  }
  return v;
}

export const config = {
  supabaseUrl: required('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  uploadsBucket: process.env.SUPABASE_STORAGE_BUCKET || 'uploads',

  google: {
    clientId: required('GOOGLE_CLIENT_ID'),
    clientSecret: required('GOOGLE_CLIENT_SECRET'),
    redirectUri: required('GOOGLE_REDIRECT_URI'),
  },

  tokenEncryptionKey: required('TOKEN_ENCRYPTION_KEY'),

  ffmpegPath: process.env.FFMPEG_PATH || '',
  tmpDir: process.env.WORKER_TMP_DIR || './tmp',
  pollIntervalMs: Number(process.env.WORKER_POLL_INTERVAL_MS || 5000),
  maxAttempts: Number(process.env.WORKER_MAX_ATTEMPTS || DEFAULT_MAX_ATTEMPTS),
  retryBackoffMs: Number(process.env.WORKER_RETRY_BACKOFF_MS || 2000),
  cleanupAgeHours: Number(process.env.WORKER_CLEANUP_AGE_HOURS || 24),

  /** Identificador deste worker (para a trava da fila). */
  workerId: `${process.env.HOSTNAME || 'worker'}-${process.pid}`,
};

export type Config = typeof config;
