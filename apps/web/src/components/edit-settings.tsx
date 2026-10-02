'use client';

import {
  FILTER_LABELS,
  FILTER_OPTIONS,
  FIT_MODE_LABELS,
  FIT_MODES,
  SPEED_OPTIONS,
  type FilterName,
  type FitMode,
  type Speed,
} from '@editor/shared';
import { ChipGroup, Label, Toggle } from '@/components/ui/primitives';

export interface EditValues {
  mirror: boolean;
  speed: Speed;
  filter: FilterName;
  fitMode: FitMode;
}

export function EditSettings({
  value,
  onChange,
}: {
  value: EditValues;
  onChange: (v: EditValues) => void;
}) {
  const set = <K extends keyof EditValues>(key: K, v: EditValues[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label className="mb-0">Espelhar vídeo</Label>
          <p className="text-sm text-slate-500">Inverte da esquerda para a direita.</p>
        </div>
        <Toggle
          label="Espelhar vídeo horizontalmente"
          checked={value.mirror}
          onChange={(v) => set('mirror', v)}
        />
      </div>

      <div>
        <Label>Velocidade</Label>
        <ChipGroup
          ariaLabel="Velocidade"
          options={SPEED_OPTIONS}
          value={value.speed}
          onChange={(v) => set('speed', v)}
          getLabel={(v) => `${v.toFixed(2)}x`}
        />
      </div>

      <div>
        <Label>Filtro</Label>
        <ChipGroup
          ariaLabel="Filtro de cor"
          options={FILTER_OPTIONS}
          value={value.filter}
          onChange={(v) => set('filter', v)}
          getLabel={(v) => FILTER_LABELS[v]}
        />
      </div>

      <div>
        <Label>Modo de encaixe</Label>
        <ChipGroup
          ariaLabel="Modo de encaixe"
          options={FIT_MODES}
          value={value.fitMode}
          onChange={(v) => set('fitMode', v)}
          getLabel={(v) => FIT_MODE_LABELS[v]}
        />
        <p className="mt-2 text-sm text-slate-500">
          {value.fitMode === 'fill'
            ? 'Preencher: ocupa toda a área, podendo cortar as bordas.'
            : 'Conter: mostra o vídeo inteiro, com espaço ao redor.'}
        </p>
      </div>
    </div>
  );
}
