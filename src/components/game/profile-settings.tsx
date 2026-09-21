"use client";

import * as React from "react";
import Link from "next/link";
import {
  User,
  Bell,
  CreditCard,
  Scale,
  Shield,
  FileText,
  LogOut,
  ChevronRight,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfileName, updateNotifications, signOut } from "@/lib/actions";
import { useFeedback } from "@/components/game/feedback-provider";
import type { NotificationPreferences } from "@/lib/types/database";

interface Props {
  fullName: string;
  isPremium: boolean;
  notifications: NotificationPreferences | null;
}

export function ProfileSettings({ fullName, isPremium, notifications }: Props) {
  const { toast } = useFeedback();
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(fullName);
  const [prefs, setPrefs] = React.useState({
    push: notifications?.push ?? true,
    email: notifications?.email ?? true,
    whatsapp: notifications?.whatsapp ?? false,
  });
  const [loadingPortal, setLoadingPortal] = React.useState(false);

  async function saveName() {
    const res = await updateProfileName(name);
    if (res.success) {
      toast("Perfil atualizado", { variant: "success" });
      setEditing(false);
    } else toast(res.error ?? "Erro ao salvar", { variant: "error" });
  }

  async function toggle(key: "push" | "email" | "whatsapp") {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    await updateNotifications(next);
  }

  async function openPortal() {
    setLoadingPortal(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast(data.error ?? "Nenhuma assinatura para gerenciar", { variant: "error" });
    } finally {
      setLoadingPortal(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Editar nome */}
      <section className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold">
          <User className="h-4 w-4" /> Editar perfil
        </div>
        {editing ? (
          <div className="space-y-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveName}>Salvar</Button>
              <Button size="sm" variant="outline" onClick={() => { setName(fullName); setEditing(false); }}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <button className="flex w-full items-center justify-between" onClick={() => setEditing(true)}>
            <span className="text-sm">{name || "Adicionar nome"}</span>
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </section>

      {/* Notificações */}
      <section className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Bell className="h-4 w-4" /> Notificações
        </div>
        <div className="space-y-3">
          {([
            ["push", "Push"],
            ["email", "E-mail"],
            ["whatsapp", "WhatsApp"],
          ] as const).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm">{label}</span>
              <Switch on={prefs[key]} onClick={() => toggle(key)} />
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Lembretes de sequência e missões chegam em breve.
        </p>
      </section>

      {/* Assinatura */}
      <section className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold">
          <CreditCard className="h-4 w-4" /> Minha assinatura
        </div>
        {isPremium ? (
          <>
            <p className="text-sm text-muted-foreground">Você é Premium ✨</p>
            <Button className="mt-3 w-full" variant="outline" onClick={openPortal} disabled={loadingPortal}>
              {loadingPortal ? "Abrindo..." : "Gerenciar / cancelar assinatura"}
            </Button>
          </>
        ) : (
          <Link href="/premium">
            <Button className="w-full">Assinar Premium — R$19/mês</Button>
          </Link>
        )}
      </section>

      {/* Links */}
      <section className="rounded-2xl border bg-card shadow-sm">
        <LinkRow href="/weight" icon={<Scale className="h-4 w-4" />} label="Meu peso (opcional)" />
        <LinkRow href="/privacy" icon={<Shield className="h-4 w-4" />} label="Privacidade" />
        <LinkRow href="/terms" icon={<FileText className="h-4 w-4" />} label="Termos" last />
      </section>

      <form action={signOut}>
        <Button type="submit" variant="ghost" className="w-full text-destructive">
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </form>
    </div>
  );
}

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-primary" : "bg-muted"}`}
      aria-pressed={on}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`}
      />
    </button>
  );
}

function LinkRow({
  href,
  icon,
  label,
  last,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  last?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 p-4 ${!last ? "border-b" : ""}`}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 text-sm">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
