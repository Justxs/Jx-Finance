import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card/card";
import { cn } from "@/lib/utils";

interface AuthCardProps {
  title: string;
  subtitle?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export function AuthCard({ title, subtitle, footer, children }: Readonly<AuthCardProps>) {
  return (
    <div className="w-full max-w-sm">
      <Card className="p-6 sm:p-8">
        <h1 className="text-lg font-semibold">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        {children}
      </Card>
      {footer}
    </div>
  );
}

export function BackToSignIn({ className }: Readonly<{ className?: string }>) {
  const { t } = useTranslation();

  return (
    <Link to="/login" className={cn("inline-block text-sm font-medium underline", className)}>
      {t("auth.backToSignIn")}
    </Link>
  );
}

interface AuthNoticeProps {
  icon: LucideIcon;
  className?: string;
  children: ReactNode;
}

export function AuthNotice({ icon: Icon, className, children }: Readonly<AuthNoticeProps>) {
  return (
    <p
      ref={(node) => node?.focus()}
      tabIndex={-1}
      className={cn(
        "flex gap-3 rounded-md bg-background px-4 py-3 text-sm outline-none",
        className,
      )}
      role="status"
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      {children}
    </p>
  );
}
