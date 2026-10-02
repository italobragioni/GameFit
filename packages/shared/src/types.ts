import type { FilterName, FitMode, Speed } from './constants.js';

/** Status possíveis de um lote. */
export type BatchStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'completed_with_errors'
  | 'failed';

/** Status possíveis de um vídeo dentro da fila. */
export type VideoStatus =
  | 'pending'
  | 'downloading'
  | 'processing'
  | 'uploading'
  | 'completed'
  | 'failed';

/** Como criar as pastas de destino no Google Drive. */
export type DriveFolderMode = 'flat' | 'per_batch';

export interface Template {
  id: string;
  user_id: string;
  name: string;
  image_url: string;
  /** Área (retângulo) onde o vídeo é posicionado, em px do canvas 1080x1920. */
  video_x: number;
  video_y: number;
  video_width: number;
  video_height: number;
  created_at: string;
}

export interface Batch {
  id: string;
  user_id: string;
  name: string;
  template_id: string | null;
  status: BatchStatus;
  total_videos: number;
  completed_videos: number;
  failed_videos: number;
  /** Configurações de edição "congeladas" no momento de iniciar o lote. */
  mirror: boolean;
  speed: Speed;
  filter: FilterName;
  fit_mode: FitMode;
  drive_folder_mode: DriveFolderMode;
  keep_original_name: boolean;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface VideoItem {
  id: string;
  batch_id: string;
  position: number;
  /** URL de origem (quando o vídeo foi colado como link). */
  original_url: string | null;
  /** Caminho no Supabase Storage (quando enviado pelo celular). */
  storage_path: string | null;
  original_filename: string | null;
  status: VideoStatus;
  progress: number;
  attempts: number;
  drive_file_id: string | null;
  error_message: string | null;
  /** Trava otimista para a fila: worker que está processando este item. */
  locked_by: string | null;
  locked_at: string | null;
  created_at: string;
  finished_at: string | null;
}

export interface UserSettings {
  user_id: string;
  mirror: boolean;
  speed: Speed;
  filter: FilterName;
  fit_mode: FitMode;
  drive_folder_id: string | null;
  drive_folder_name: string | null;
  drive_folder_mode: DriveFolderMode;
  keep_original_name: boolean;
  updated_at: string;
}

/** Conexão OAuth com o Google Drive (tokens armazenados criptografados). */
export interface DriveConnection {
  user_id: string;
  /** Token de acesso criptografado. */
  access_token_enc: string;
  /** Refresh token criptografado. */
  refresh_token_enc: string;
  /** Epoch (ms) de expiração do access token. */
  expiry: number;
  email: string | null;
  updated_at: string;
}
