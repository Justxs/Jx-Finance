import { LogOut } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useRevokeOtherSessions, useRevokeSession, useSessionsSuspense } from "@/api/generated";
import type { SessionResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { RowTransition } from "@/components/row-transition/row-transition";
import { Button } from "@/components/ui/button/button";
import { Rows } from "@/components/ui/rows/rows";
import { TitledSection } from "@/components/ui/section/section";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { Tag } from "@/components/ui/tag/tag";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { useDateTime } from "@/hooks/use-formatters";
import { describeUserAgent } from "@/lib/user-agent";

function useSessionLabel() {
  const { t } = useTranslation();

  return function sessionLabel(session: SessionResponse) {
    const { browser, os } = describeUserAgent(session.userAgent);
    if (browser && os) {
      return t("profile.sessions.browserOn", { browser, os });
    }
    return browser ?? os ?? t("profile.sessions.unknownBrowser");
  };
}

interface SessionRowProps {
  session: SessionResponse;
  pending: boolean;
  disabled: boolean;
  onSignOut: () => void;
}

function SessionRow({ session, pending, disabled, onSignOut }: Readonly<SessionRowProps>) {
  const { t } = useTranslation();
  const formatDateTime = useDateTime();
  const label = useSessionLabel()(session);

  return (
    <RowTransition>
      <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium wrap-break-word">
            {label}
            {session.isCurrent ? <Tag tone="accent">{t("profile.sessions.current")}</Tag> : null}
          </p>
          <dl className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
            <div className="flex gap-1">
              <dt>{t("profile.sessions.lastActive")}</dt>
              <dd className="tabular-nums">{formatDateTime(session.lastSeenAt)}</dd>
            </div>
            <div className="flex gap-1">
              <dt>{t("profile.sessions.signedIn")}</dt>
              <dd className="tabular-nums">{formatDateTime(session.createdAt)}</dd>
            </div>
            <div className="flex gap-1">
              <dt>{t("profile.sessions.expires")}</dt>
              <dd className="tabular-nums">{formatDateTime(session.expiresAt)}</dd>
            </div>
          </dl>
        </div>
        {session.isCurrent ? null : (
          <Button
            variant="outline"
            size="sm"
            className="self-start sm:self-auto"
            pending={pending}
            disabled={disabled}
            onClick={onSignOut}
            aria-label={`${t("profile.sessions.signOut")}: ${label}`}
          >
            <LogOut />
            {t("profile.sessions.signOut")}
          </Button>
        )}
      </li>
    </RowTransition>
  );
}

function SessionList() {
  const { t } = useTranslation();
  const sessions = useSessionsSuspense();
  const list = sessions.data;
  const sessionLabel = useSessionLabel();
  const [confirmingOthers, setConfirmingOthers] = useState<true | null>(null);

  const revokeMutation = useRevokeSession({
    mutation: {
      onSuccess: () => {
        toast.success(t("profile.sessions.signedOut"));
      },
    },
  });
  const revoke = useConfirmedDelete(revokeMutation, list, sessionLabel);

  const revokeOthersMutation = useRevokeOtherSessions({
    mutation: {
      onSuccess: () => {
        toast.success(t("profile.sessions.othersSignedOut"));
      },
    },
  });

  const busy = revoke.busy || revokeOthersMutation.isPending;
  const hasOthers = list.some((session) => !session.isCurrent);

  return (
    <>
      <Rows>
        {list.map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            pending={revoke.pendingId === session.id}
            disabled={busy}
            onSignOut={() => revoke.request(session.id)}
          />
        ))}
      </Rows>
      <div className="flex justify-end pt-3">
        <Button
          variant="outline"
          size="sm"
          pending={revokeOthersMutation.isPending}
          disabled={!hasOthers || busy}
          onClick={() => setConfirmingOthers(true)}
        >
          {t("profile.sessions.signOutOthers")}
        </Button>
      </div>
      <ConfirmDeleteDialog
        {...revoke.dialogProps}
        title={t("profile.sessions.confirmTitle")}
        description={t("profile.sessions.confirmDescription")}
        confirmLabel={t("profile.sessions.signOut")}
      />
      <ConfirmDeleteDialog
        target={confirmingOthers}
        title={t("profile.sessions.confirmOthersTitle")}
        description={t("profile.sessions.confirmOthersDescription")}
        confirmLabel={t("profile.sessions.signOutOthers")}
        onCancel={() => setConfirmingOthers(null)}
        onConfirm={() => revokeOthersMutation.mutate()}
      />
    </>
  );
}

export function SessionsSection() {
  const { t } = useTranslation();

  return (
    <TitledSection
      title={t("profile.sessions.title")}
      description={t("profile.sessions.description")}
    >
      <div className="mt-4">
        <QueryBoundary fallback={<Skeleton className="h-32 w-full" />}>
          <SessionList />
        </QueryBoundary>
      </div>
    </TitledSection>
  );
}
