'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trash2, Upload } from 'lucide-react';
import {
  DEFAULT_FILTER,
  DEFAULT_FIT_MODE,
  DEFAULT_MIRROR,
  DEFAULT_SPEED,
  MAX_VIDEOS_PER_BATCH,
  parseUrlLines,
  type Speed,
  type Template,
} from '@editor/shared';
import { createClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Card, Input, Label, Spinner, Textarea } from '@/components/ui/primitives';
import { EditSettings, type EditValues } from '@/components/edit-settings';

interface UploadedItem {
  storagePath: string;
  originalFilename: string;
}

export default function NewBatchPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const sessionDir = useRef(`tmp-${Date.now()}`);

  const [name, setName] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<UploadedItem[]>([]);
  const [urlsText, setUrlsText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [driveReady, setDriveReady] = useState<boolean | null>(null);
  const [edit, setEdit] = useState<EditValues>({
    mirror: DEFAULT_MIRROR,
    speed: DEFAULT_SPEED,
    filter: DEFAULT_FILTER,
    fitMode: DEFAULT_FIT_MODE,
  });

  useEffect(() => {
    void (async () => {
      const [tplRes, setRes] = await Promise.all([
        fetch('/api/templates'),
        fetch('/api/settings'),
      ]);
      const tpls = (await tplRes.json()) as Template[];
      setTemplates(tpls);
      if (tpls[0]) setTemplateId(tpls[0].id);
      const s = await setRes.json();
      if (s) {
        setEdit({
          mirror: s.mirror,
          speed: Number(s.speed) as Speed,
          filter: s.filter,
          fitMode: s.fit_mode,
        });
        setDriveReady(!!s.drive_folder_id);
      } else {
        setDriveReady(false);
      }
    })();
  }, []);

  const validUrls = parseUrlLines(urlsText).valid;
  const total = uploaded.length + validUrls.length;
  const overLimit = total > MAX_VIDEOS_PER_BATCH;

  async function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão expirada.');
      const added: UploadedItem[] = [];
      for (const file of files) {
        if (uploaded.length + added.length + validUrls.length >= MAX_VIDEOS_PER_BATCH) break;
        const safe = file.name.replace(/[^\p{L}\p{N}.\-_]/gu, '_');
        const path = `${user.id}/${sessionDir.current}/${Date.now()}-${safe}`;
        const { error: upErr } = await supabase.storage
          .from('uploads')
          .upload(path, file, { contentType: file.type || 'video/mp4' });
        if (upErr) throw upErr;
        added.push({ storagePath: path, originalFilename: file.name });
      }
      setUploaded((prev) => [...prev, ...added]);
    } catch {
      setError('Falha ao enviar um dos arquivos. Arquivos muito grandes podem exceder o limite — tente por URL.');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function removeUploaded(idx: number) {
    const item = uploaded[idx];
    setUploaded((prev) => prev.filter((_, i) => i !== idx));
    await supabase.storage.from('uploads').remove([item.storagePath]).catch(() => undefined);
  }

  async function start() {
    setError(null);
    if (!name.trim()) return setError('Dê um nome ao lote.');
    if (!templateId) return setError('Escolha um template.');
    if (total === 0) return setError('Adicione pelo menos um vídeo.');
    if (overLimit) return setError(`Máximo de ${MAX_VIDEOS_PER_BATCH} vídeos por lote.`);
    if (driveReady === false) return setError('Conecte o Google Drive em Configurações antes de iniciar.');

    setStarting(true);
    try {
      const items = [
        ...uploaded.map((u) => ({ storagePath: u.storagePath, originalFilename: u.originalFilename })),
        ...validUrls.map((url) => ({ url })),
      ];
      const createRes = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          templateId,
          items,
          mirror: edit.mirror,
          speed: edit.speed,
          filter: edit.filter,
          fitMode: edit.fitMode,
        }),
      });
      const created = await createRes.json();
      if (!createRes.ok) throw new Error(created.error || 'Erro ao criar o lote.');

      const startRes = await fetch(`/api/batches/${created.id}/start`, { method: 'POST' });
      const startData = await startRes.json();
      if (!startRes.ok) throw new Error(startData.error || 'Erro ao iniciar.');

      router.push(`/batches/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao iniciar o lote.');
      setStarting(false);
    }
  }

  return (
    <AppShell title="Novo lote" backHref="/">
      <div className="flex flex-col gap-5">
        <Card>
          <Label htmlFor="bname">Nome do lote</Label>
          <Input
            id="bname"
            placeholder="Ex.: Futebol 02 Outubro"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Card>

        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Label className="mb-0">Vídeos</Label>
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                overLimit ? 'bg-red-100 text-red-700' : 'bg-brand-light text-brand-dark'
              }`}
              aria-live="polite"
            >
              {total} / {MAX_VIDEOS_PER_BATCH} vídeos
            </span>
          </div>

          <label className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 font-semibold text-slate-700">
            {uploading ? <Spinner /> : <Upload size={20} aria-hidden />}
            Enviar vídeos do celular
            <input
              ref={fileInput}
              type="file"
              accept="video/*"
              multiple
              className="sr-only"
              onChange={onPickFiles}
            />
          </label>

          {uploaded.length > 0 && (
            <ul className="flex flex-col gap-2">
              {uploaded.map((u, i) => (
                <li
                  key={u.storagePath}
                  className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2"
                >
                  <span className="truncate text-sm text-slate-700">{u.originalFilename}</span>
                  <button
                    type="button"
                    aria-label={`Remover ${u.originalFilename}`}
                    onClick={() => removeUploaded(i)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={18} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div>
            <Label htmlFor="urls">Ou cole um link por linha</Label>
            <Textarea
              id="urls"
              rows={4}
              placeholder={'https://...\nhttps://...'}
              value={urlsText}
              onChange={(e) => setUrlsText(e.target.value)}
            />
            <p className="mt-2 text-xs text-slate-400">
              Use apenas links de fontes das quais você tem permissão para baixar.
            </p>
          </div>
        </Card>

        <Card className="flex flex-col gap-3">
          <Label className="mb-0">Escolha um template</Label>
          {templates.length === 0 ? (
            <p className="text-slate-500">
              Nenhum template ainda.{' '}
              <Link href="/templates/new" className="font-semibold text-brand underline">
                Criar template
              </Link>
            </p>
          ) : (
            <div role="radiogroup" aria-label="Template" className="flex gap-3 overflow-x-auto pb-2">
              {templates.map((t) => {
                const active = t.id === templateId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTemplateId(t.id)}
                    className={`shrink-0 overflow-hidden rounded-2xl border-2 ${
                      active ? 'border-brand ring-4 ring-brand/30' : 'border-slate-200'
                    }`}
                  >
                    <div className="relative aspect-[9/16] w-24 bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={t.image_url} alt={t.name} className="h-full w-full object-cover" />
                    </div>
                    <span className="block max-w-24 truncate px-2 py-1 text-xs font-medium text-slate-700">
                      {t.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-bold text-slate-900">Configurações de edição</h2>
          <EditSettings value={edit} onChange={setEdit} />
        </Card>

        {driveReady === false && (
          <p className="rounded-2xl bg-amber-50 p-4 text-sm font-medium text-amber-800" role="alert">
            O Google Drive ainda não está conectado.{' '}
            <Link href="/settings" className="underline">
              Conectar agora
            </Link>
            .
          </p>
        )}

        {error && (
          <p className="text-center text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        )}

        <Button onClick={start} disabled={starting || uploading}>
          {starting ? <Spinner /> : null} Iniciar lote
        </Button>
      </div>
    </AppShell>
  );
}
