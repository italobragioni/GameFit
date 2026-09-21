import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Data de "hoje" em UTC no formato YYYY-MM-DD (mesma referência usada no banco). */
export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatXP(xp: number): string {
  return new Intl.NumberFormat("pt-BR").format(xp);
}

export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}
