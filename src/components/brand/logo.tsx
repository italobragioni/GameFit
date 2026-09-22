import { cn } from "@/lib/utils";

/** Logo do GameFit (imagem quadrada com a marca). */
export function Logo({ className, alt = "GameFit" }: { className?: string; alt?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.jpg" alt={alt} className={cn("w-auto object-contain", className)} />;
}
