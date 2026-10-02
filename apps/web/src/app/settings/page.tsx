'use client';

import { useEffect, useState } from 'react';
import { Check, FolderPlus, RefreshCw } from 'lucide-react';
import {
  DEFAULT_FILTER,
  DEFAULT_FIT_MODE,
  DEFAULT_MIRROR,
  DEFAULT_SPEED,
  type DriveFolderMode,
  type Speed,
} from '@editor/shared';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Card, ChipGroup, Input, Label, Spinner, Toggle } from '@/components/ui/primitives';
import { EditSettings, type EditValues } from '@/components/edit-settings';
import { PushToggle } from '@/components/push-toggle';

interface Folder {
  id: string;
  name: string;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [connected, setConnected] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [newFolder, setNewFolder] = useState('');

  const [folderMode, setFolderMode] = useState<DriveFolderMode>('per_batch');
  const [keepOriginal, setKeepOriginal] = useState(false);
  const [edit, setEdit] = useState<EditValues>({
    mirror: DEFAULT_MIRROR,
    speed: DEFAULT_SPEED,
    filter: DEFAULT_FILTER,
    fitMode: DEFAULT_FIT_MODE,
  });

  useEffect(() => {
    // mensagens vindas do callback do OAuth
    const q = new URLSearchParams(window.location.search).get('drive');
    if (q === 'connected') setMsg('Google Drive conectado com sucesso!');
    if (q === 'error') setError('Não foi possível conectar o Google Drive. Tente de novo.');
    if (q === 'norefresh')
      setError('Conexão incompleta. Revogue o acesso do app em sua conta Google e conecte novamente.');

    void (async () => {
      const [statusRes, setRes] = await Promise.all([
        fetch('/api/drive/status'),
        fetch('/api/settings'),
      ]);
      const status = await statusRes.json();
      setConnected(status.connected);
      setEmail(status.email);
      const s = await setRes.json();
      if (s) {
        setEdit({ mirror: s.mirror, speed: Number(s.speed) as Speed, filter: s.filter, fitMode: s.fit_mode });
        setFolderMode(s.drive_folder_mode);
        setKeepOriginal(s.keep_original_name);
        setFolderId(s.drive_folder_id);
        setFolderName(s.drive_folder_name);
      }
      setLoading(false);
      if (status.connected) void loadFolders();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadFolders() {
    setLoadingFolders(true);
    try {
      const res = await fetch('/api/drive/folders');
      const data = await res.json();
      if (res.ok) setFolders(data.folders ?? []);
    } finally {
      setLoadingFolders(false);
    }
  }

  async function createFolder() {
    if (!newFolder.trim()) return;
    setLoadingFolders(true);
    try {
      const res = await fetch('/api/drive/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolder.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setFolders((f) => [data.folder, ...f]);
        setFolderId(data.folder.id);
        setFolderName(data.folder.name);
        setNewFolder('');
      }
    } finally {
      setLoadingFolders(false);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mirror: edit.mirror,
          speed: edit.speed,
          filter: edit.filter,
          fitMode: edit.fitMode,
          driveFolderMode: folderMode,
          keepOriginalName: keepOriginal,
          driveFolderId: folderId,
          driveFolderName: folderName,
        }),
      });
      if (!res.ok) throw new Error();
      setMsg('Configurações salvas!');
    } catch {
      setError('Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Configurações" backHref="/">
        <div className="flex justify-center py-10"><Spinner className="h-8 w-8 text-brand" /></div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Configurações" backHref="/">
      <div className="flex flex-col gap-5">
        {/* Google Drive */}
        <Card className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-slate-900">Google Drive</h2>
          {connected ? (
            <>
              <p className="flex items-center gap-2 font-semibold text-green-700">
                <Check size={20} aria-hidden /> Conectado{email ? ` (${email})` : ''}
              </p>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="mb-0">Pasta de destino</Label>
                  <button
                    type="button"
                    onClick={loadFolders}
                    className="flex items-center gap-1 text-sm font-semibold text-brand"
                    aria-label="Atualizar lista de pastas"
                  >
                    <RefreshCw size={16} aria-hidden /> Atualizar
                  </button>
                </div>
                {folderName && (
                  <p className="mb-2 text-sm text-slate-600">
                    Selecionada: <strong>{folderName}</strong>
                  </p>
                )}
                {loadingFolders ? (
                  <Spinner className="text-brand" />
                ) : folders.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Nenhuma pasta ainda. Crie uma abaixo (ex.: “Vídeos Editados”).
                  </p>
                ) : (
                  <div role="radiogroup" aria-label="Pasta do Drive" className="flex flex-col gap-2">
                    {folders.map((f) => {
                      const active = f.id === folderId;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => {
                            setFolderId(f.id);
                            setFolderName(f.name);
                          }}
                          className={`flex min-h-12 items-center justify-between rounded-2xl border-2 px-4 text-left font-medium ${
                            active ? 'border-brand bg-brand-light text-brand-dark' : 'border-slate-200'
                          }`}
                        >
                          {f.name}
                          {active && <Check size={18} aria-hidden />}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <Input
                    placeholder="Criar nova pasta"
                    value={newFolder}
                    onChange={(e) => setNewFolder(e.target.value)}
                  />
                  <Button type="button" size="md" variant="secondary" onClick={createFolder}>
                    <FolderPlus size={18} aria-hidden /> Criar
                  </Button>
                </div>
              </div>

              <div>
                <Label>Organização das pastas</Label>
                <ChipGroup
                  ariaLabel="Organização das pastas"
                  options={['per_batch', 'flat'] as const}
                  value={folderMode}
                  onChange={setFolderMode}
                  getLabel={(v) => (v === 'per_batch' ? 'Subpasta por lote' : 'Tudo na mesma pasta')}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="mb-0">Manter nome original</Label>
                  <p className="text-sm text-slate-500">Senão, usa video-001, video-002…</p>
                </div>
                <Toggle label="Manter nome original dos arquivos" checked={keepOriginal} onChange={setKeepOriginal} />
              </div>
            </>
          ) : (
            <a
              href="/api/drive/connect"
              className="flex min-h-14 items-center justify-center rounded-2xl bg-brand px-6 text-lg font-semibold text-white"
            >
              Conectar Google Drive
            </a>
          )}
        </Card>

        {/* Notificações */}
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-slate-900">Notificações</h2>
          <p className="text-sm text-slate-500">
            Receba um aviso no celular quando um lote terminar — mesmo com o app fechado.
          </p>
          <PushToggle />
        </Card>

        {/* Padrões de edição */}
        <Card>
          <h2 className="mb-4 text-lg font-bold text-slate-900">Configuração padrão de edição</h2>
          <EditSettings value={edit} onChange={setEdit} />
        </Card>

        {msg && <p className="text-center text-sm font-medium text-green-700" role="status">{msg}</p>}
        {error && <p className="text-center text-sm font-medium text-red-600" role="alert">{error}</p>}

        <Button onClick={save} disabled={saving}>
          {saving ? <Spinner /> : null} Salvar configurações
        </Button>
      </div>
    </AppShell>
  );
}
