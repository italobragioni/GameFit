import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VideoItem } from '@editor/shared';

// ---- mocks dos módulos de I/O --------------------------------------------
vi.mock('./config.js', () => ({
  config: { tmpDir: '/tmp/editor-test', maxAttempts: 3, uploadsBucket: 'uploads', retryBackoffMs: 0 },
}));

const updateVideo = vi.fn(async () => undefined);
const removeFromStorage = vi.fn(async () => undefined);

vi.mock('./supabase.js', () => ({
  updateVideo: (...a: unknown[]) => updateVideo(...a),
  removeFromStorage: (...a: unknown[]) => removeFromStorage(...a),
  getBatch: vi.fn(async () => ({
    id: 'b1',
    user_id: 'u1',
    name: 'Futebol 02 Outubro',
    template_id: 't1',
    mirror: true,
    speed: 1.1,
    filter: 'filtro1',
    fit_mode: 'fill',
    drive_folder_mode: 'per_batch',
    keep_original_name: false,
  })),
  getTemplate: vi.fn(async () => ({
    id: 't1',
    image_url: 'https://x/template.png',
    video_x: 80,
    video_y: 300,
    video_width: 920,
    video_height: 1400,
  })),
  getDriveConnection: vi.fn(async () => ({ user_id: 'u1' })),
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { drive_folder_id: 'folder-root', drive_folder_name: 'Vídeos' } }),
        }),
      }),
    }),
  },
}));

vi.mock('./download.js', () => ({
  downloadStorage: vi.fn(async () => undefined),
  downloadUrl: vi.fn(async () => undefined),
  downloadTemplateImage: vi.fn(async () => undefined),
}));

const runFfmpeg = vi.fn(async () => undefined);
vi.mock('./media.js', () => ({
  hasAudioStream: vi.fn(async () => true),
  runFfmpeg: (...a: unknown[]) => runFfmpeg(...a),
}));

const uploadFile = vi.fn(async () => 'drive-file-123');
const ensureFolder = vi.fn(async () => 'sub-folder-id');
vi.mock('./drive.js', () => ({
  createOAuthClient: vi.fn(() => ({})),
  driveClient: vi.fn(() => ({})),
  ensureFolder: (...a: unknown[]) => ensureFolder(...a),
  uploadFile: (...a: unknown[]) => uploadFile(...a),
}));

import { processVideo } from './processor.js';

function makeVideo(overrides: Partial<VideoItem> = {}): VideoItem {
  return {
    id: 'v1',
    batch_id: 'b1',
    position: 1,
    original_url: null,
    storage_path: 'u1/b1/orig.mp4',
    original_filename: 'orig.mp4',
    status: 'downloading',
    progress: 0,
    attempts: 0,
    drive_file_id: null,
    error_message: null,
    locked_by: 'w',
    locked_at: null,
    created_at: '',
    finished_at: null,
    ...overrides,
  };
}

function statusesSet(): string[] {
  return updateVideo.mock.calls
    .map((c) => (c[1] as { status?: string }).status)
    .filter((s): s is string => !!s);
}

beforeEach(() => {
  vi.clearAllMocks();
  runFfmpeg.mockImplementation(async () => undefined);
  uploadFile.mockImplementation(async () => 'drive-file-123');
});
afterEach(() => vi.clearAllMocks());

describe('processVideo', () => {
  it('caminho feliz: passa por downloading→processing→uploading→completed e limpa a origem', async () => {
    await processVideo(makeVideo());
    const statuses = statusesSet();
    expect(statuses).toEqual(expect.arrayContaining(['downloading', 'processing', 'uploading', 'completed']));
    expect(statuses).not.toContain('failed');
    expect(uploadFile).toHaveBeenCalledTimes(1);
    // cria subpasta do lote no modo per_batch
    expect(ensureFolder).toHaveBeenCalledWith(expect.anything(), 'folder-root', 'Futebol 02 Outubro');
    // só apaga a origem do Storage DEPOIS de concluir
    expect(removeFromStorage).toHaveBeenCalledTimes(1);
  });

  it('erro no FFmpeg: tenta de novo e conclui na 2ª tentativa', async () => {
    runFfmpeg.mockRejectedValueOnce(new Error('ffmpeg boom'));
    await processVideo(makeVideo());
    expect(runFfmpeg).toHaveBeenCalledTimes(2);
    expect(statusesSet()).toContain('completed');
  });

  it('falha no upload do Drive esgota tentativas e marca como failed, sem apagar a origem', async () => {
    uploadFile.mockRejectedValue(new Error('drive down'));
    await processVideo(makeVideo());
    expect(uploadFile).toHaveBeenCalledTimes(3); // maxAttempts
    expect(statusesSet()).toContain('failed');
    // nunca confirma upload -> nunca apaga a origem
    expect(removeFromStorage).not.toHaveBeenCalled();
    const lastCall = updateVideo.mock.calls.at(-1)?.[1] as { status?: string; error_message?: string };
    expect(lastCall.status).toBe('failed');
    expect(lastCall.error_message).toContain('drive down');
  });

  it('usa a URL quando não há arquivo no Storage', async () => {
    await processVideo(makeVideo({ storage_path: null, original_url: 'https://x/v.mp4' }));
    expect(statusesSet()).toContain('completed');
    // sem storage_path não há origem no Storage para apagar
    expect(removeFromStorage).not.toHaveBeenCalled();
  });
});
