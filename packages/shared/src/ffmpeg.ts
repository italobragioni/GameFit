import {
  OUTPUT_HEIGHT,
  OUTPUT_WIDTH,
  type FilterName,
  type FitMode,
} from './constants.js';

export interface VideoArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BuildFfmpegOptions {
  /** Caminho da imagem do template (PNG/JPG vertical). */
  templatePath: string;
  /** Caminho do arquivo de vídeo de entrada (já baixado localmente). */
  inputPath: string;
  /** Caminho do arquivo MP4 de saída. */
  outputPath: string;
  /** Área onde o vídeo é posicionado sobre o template. */
  area: VideoArea;
  /** Espelhar horizontalmente (hflip). */
  mirror: boolean;
  /** Velocidade de reprodução (1.0 a 1.2). */
  speed: number;
  /** Filtro de cor discreto. */
  filter: FilterName;
  /** Modo de encaixe. */
  fitMode: FitMode;
  /** Se o vídeo de entrada possui faixa de áudio (via ffprobe). */
  hasAudio: boolean;
}

/** Arredonda para o inteiro par mais próximo (libx264/yuv420p preferem dimensões pares). */
function even(n: number): number {
  const r = Math.round(n);
  return r % 2 === 0 ? r : r - 1;
}

/**
 * Cadeia de filtros de cor por filtro. Alterações discretas de brilho,
 * contraste, saturação e temperatura. Nada exagerado.
 */
function colorFilterChain(filter: FilterName): string[] {
  switch (filter) {
    case 'filtro1': // quente, leve
      return ['eq=contrast=1.05:brightness=0.02:saturation=1.08', 'colortemperature=temperature=5600'];
    case 'filtro2': // frio, leve
      return ['eq=contrast=1.04:brightness=0.0:saturation=1.05', 'colortemperature=temperature=7200'];
    case 'filtro3': // vibrante, leve
      return ['eq=contrast=1.08:brightness=0.01:saturation=1.12'];
    case 'none':
    default:
      return [];
  }
}

/**
 * Constrói a lista de argumentos do FFmpeg (sem o binário "ffmpeg").
 *
 * Estratégia do filtro:
 *  - o template (1080x1920) é o fundo;
 *  - o vídeo é redimensionado para a área (fill = cobre e corta / contain = cabe inteiro);
 *  - o vídeo é sobreposto dentro da área definida;
 *  - velocidade ajusta vídeo (setpts) e áudio (atempo) juntos, sem dessincronizar.
 *
 * Função pura e determinística — testável sem executar o FFmpeg.
 */
export function buildFfmpegArgs(opts: BuildFfmpegOptions): string[] {
  const { area, speed, filter, fitMode, mirror, hasAudio } = opts;
  const rw = even(area.width);
  const rh = even(area.height);
  const x = Math.round(area.x);
  const y = Math.round(area.y);

  // ---- cadeia do vídeo (entrada 1) --------------------------------------
  const vChain: string[] = [];
  // velocidade: setpts=PTS/speed deixa o vídeo mais rápido quando speed > 1
  if (speed !== 1) vChain.push(`setpts=PTS/${speed}`);
  if (mirror) vChain.push('hflip');
  vChain.push(...colorFilterChain(filter));

  // encaixe na área
  if (fitMode === 'contain') {
    // cabe inteiro dentro da área, mantendo proporção (sem cortar)
    vChain.push(`scale=${rw}:${rh}:force_original_aspect_ratio=decrease`);
  } else {
    // preencher: cobre toda a área e corta o excedente (centralizado)
    vChain.push(`scale=${rw}:${rh}:force_original_aspect_ratio=increase`);
    vChain.push(`crop=${rw}:${rh}`);
  }
  vChain.push('setsar=1');

  // posição do overlay: no modo "contain" centralizamos dentro da área,
  // pois o vídeo pode ser menor que o retângulo (letterbox com o template ao fundo).
  const overlayX = fitMode === 'contain' ? `${x}+(${rw}-w)/2` : `${x}`;
  const overlayY = fitMode === 'contain' ? `${y}+(${rh}-h)/2` : `${y}`;

  const filterComplexParts = [
    // fundo = template escalado para o canvas final
    `[0:v]scale=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT},setsar=1[bg]`,
    `[1:v]${vChain.join(',')}[fg]`,
    `[bg][fg]overlay=x=${overlayX}:y=${overlayY}:shortest=1,format=yuv420p[v]`,
  ];

  // ---- cadeia do áudio (entrada 1) --------------------------------------
  // atempo aceita 0.5..2.0; nossos valores (1.0..1.2) estão sempre na faixa.
  const mapAudioLabel = '[a]';
  if (hasAudio) {
    if (speed !== 1) {
      filterComplexParts.push(`[1:a]atempo=${speed}${mapAudioLabel}`);
    } else {
      filterComplexParts.push(`[1:a]anull${mapAudioLabel}`);
    }
  }

  const filterComplex = filterComplexParts.join(';');

  const args: string[] = [
    '-y',
    // entrada 0: template (imagem em loop para durar o vídeo inteiro)
    '-loop', '1',
    '-i', opts.templatePath,
    // entrada 1: vídeo
    '-i', opts.inputPath,
    '-filter_complex', filterComplex,
    '-map', '[v]',
  ];

  if (hasAudio) {
    args.push('-map', mapAudioLabel);
  }

  args.push(
    // vídeo: H.264, compatível com Reels/TikTok/Shorts
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '20',
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'high',
    '-level', '4.1',
    '-r', '30',
  );

  if (hasAudio) {
    args.push('-c:a', 'aac', '-b:a', '128k', '-ar', '44100');
  }

  args.push(
    // encerra quando o vídeo acaba (o template em loop é infinito)
    '-shortest',
    '-movflags', '+faststart',
    opts.outputPath,
  );

  return args;
}
