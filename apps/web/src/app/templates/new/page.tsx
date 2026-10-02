'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OUTPUT_HEIGHT, OUTPUT_WIDTH } from '@editor/shared';
import { createClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Card, Input, Label, Spinner } from '@/components/ui/primitives';

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(v)));

export default function NewTemplatePage() {
  const router = useRouter();
  const supabase = createClient();
  const previewRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [area, setArea] = useState<Area>({ x: 80, y: 300, width: 920, height: 1400 });

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão expirada.');
      const ext = file.name.split('.').pop() || 'png';
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('templates')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('templates').getPublicUrl(path);
      setImageUrl(data.publicUrl);
    } catch {
      setError('Não foi possível enviar a imagem. Tente outra.');
    } finally {
      setUploading(false);
    }
  }

  // arrastar para mover a área (opcional — os campos numéricos também funcionam)
  function onPointerDownMove(e: React.PointerEvent) {
    const box = previewRef.current?.getBoundingClientRect();
    if (!box) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const scale = OUTPUT_WIDTH / box.width;
    const startX = e.clientX;
    const startY = e.clientY;
    const orig = { ...area };
    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) * scale;
      const dy = (ev.clientY - startY) * scale;
      setArea((a) => ({
        ...a,
        x: clamp(orig.x + dx, 0, OUTPUT_WIDTH - a.width),
        y: clamp(orig.y + dy, 0, OUTPUT_HEIGHT - a.height),
      }));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function setField(key: keyof Area, raw: string) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    setArea((a) => {
      const next = { ...a, [key]: clamp(n, key === 'width' || key === 'height' ? 2 : 0, key === 'x' || key === 'width' ? OUTPUT_WIDTH : OUTPUT_HEIGHT) };
      // mantém a área dentro do canvas
      next.width = clamp(next.width, 2, OUTPUT_WIDTH - next.x);
      next.height = clamp(next.height, 2, OUTPUT_HEIGHT - next.y);
      return next;
    });
  }

  async function save() {
    setError(null);
    if (!name.trim()) return setError('Dê um nome ao template.');
    if (!imageUrl) return setError('Envie a imagem do template.');
    setSaving(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          imageUrl,
          videoX: area.x,
          videoY: area.y,
          videoWidth: area.width,
          videoHeight: area.height,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar.');
      router.push('/templates');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.');
      setSaving(false);
    }
  }

  const pct = (v: number, total: number) => `${(v / total) * 100}%`;

  return (
    <AppShell title="Novo template" backHref="/templates">
      <div className="flex flex-col gap-5">
        <Card>
          <Label htmlFor="tname">Nome do template</Label>
          <Input
            id="tname"
            placeholder="Ex.: Template futebol"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Card>

        <Card className="flex flex-col gap-3">
          <Label>Imagem do template (PNG ou JPG, vertical 1080×1920)</Label>
          <label className="flex min-h-14 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 text-center font-semibold text-slate-600">
            {uploading ? <Spinner /> : imageUrl ? 'Trocar imagem' : 'Escolher imagem'}
            <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={onPickImage} />
          </label>

          {imageUrl && (
            <div
              ref={previewRef}
              className="relative mx-auto aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-100 touch-none"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Pré-visualização do template" className="h-full w-full object-cover" />
              <div
                role="button"
                tabIndex={0}
                aria-label="Área do vídeo — arraste para mover"
                onPointerDown={onPointerDownMove}
                className="absolute cursor-move border-2 border-brand bg-brand/25"
                style={{
                  left: pct(area.x, OUTPUT_WIDTH),
                  top: pct(area.y, OUTPUT_HEIGHT),
                  width: pct(area.width, OUTPUT_WIDTH),
                  height: pct(area.height, OUTPUT_HEIGHT),
                }}
              />
            </div>
          )}
        </Card>

        <Card className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="ax">X</Label>
            <Input id="ax" type="number" inputMode="numeric" value={area.x} onChange={(e) => setField('x', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ay">Y</Label>
            <Input id="ay" type="number" inputMode="numeric" value={area.y} onChange={(e) => setField('y', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="aw">Largura</Label>
            <Input id="aw" type="number" inputMode="numeric" value={area.width} onChange={(e) => setField('width', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ah">Altura</Label>
            <Input id="ah" type="number" inputMode="numeric" value={area.height} onChange={(e) => setField('height', e.target.value)} />
          </div>
          <p className="col-span-2 text-sm text-slate-500">
            Valores em pixels no canvas final de 1080×1920. Você pode digitar ou arrastar a área azul.
          </p>
        </Card>

        {error && (
          <p className="text-center text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        )}

        <Button onClick={save} disabled={saving || uploading}>
          {saving ? <Spinner /> : null} Salvar template
        </Button>
      </div>
    </AppShell>
  );
}
