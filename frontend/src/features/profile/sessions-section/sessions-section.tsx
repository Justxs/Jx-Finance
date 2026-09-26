import { LogOut } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRevokeOtherSessions, useRevokeSession, useSessionsSuspense } from "@/api/generated";
import type { SessionResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Button } from "@/components/ui/button/button";
import { Rows } from "@/components/ui/rows/rows";
import { TitledSection } from "@/components/ui/section/section";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { Tag } from "@/components/ui/tag/tag";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { useDateTime } from "@/hooks/use-formatters";
import { notify } from "@/lib/mutations";
import { describeUserAgent } from "@/lib/user-agent";
import { ActionRow } from "../action-row/action-row";

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

  const times = [
    ["lastActive", session.lastSeenAt],
    ["signedIn", session.createdAt],
    ["expires", session.expiresAt],
  ] as const;

  return (
    <ActionRow
      title={
        <>
          {label}
          {session.isCurrent ? <Tag tone="accent">{t("profile.sessions.current")}</Tag> : null}
        </>
      }
      details={
        <dl className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
          {times.map(([key, at]) => (
            <div key={key} className="flex gap-1">
              <dt>{t(`profile.sessions.${key}`)}</dt>
              <dd className="tabular-nums">{formatDateTime(at)}</dd>
            </div>
          ))}
        </dl>
      }
      icon={LogOut}
      actionLabel={t("profile.sessions.signOut")}
      itemLabel={label}
      pending={pending}
      disabled={disabled}
      onAction={session.isCurrent ? undefined : onSignOut}
    />
  );
}

function SessionList() {
  const { t } = useTranslation();
  const sessions = useSessionsSuspense();
  const list = sessions.data;
  const sessionLabel = useSessionLabel();
  const [confirmingOthers, setConfirmingOthers] = useState<true | null>(null);

  const revokeMutation = useRevokeSession(notify(t("profile.sessions.signedOut")));
  const revoke = useConfirmedDelete(revokeMutation, list, sessionLabel);

  const revokeOthersMutation = useRevokeOtherSessions(
    notify(t("profile.sessions.othersSignedOut")),
  );

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
      bodyGap="md"
    >
      <QueryBoundary fallback={<Skeleton className="h-32 w-full" />}>
        <SessionList />
      </QueryBoundary>
    </TitledSection>
  );
}
