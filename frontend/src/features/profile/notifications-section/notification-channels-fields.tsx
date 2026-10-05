import { Check, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NotificationType } from "@/api/generated/model";
import { defineAppFieldGroup } from "@/components/form";
import { Checkbox } from "@/components/ui/checkbox/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table/table";
import { cn } from "@/lib/utils";

export const notificationKinds = Object.values(NotificationType);

export const notificationChannels = ["email", "discord", "telegram"] as const;

type Channel = (typeof notificationChannels)[number];

const channelLabels = {
  email: "profile.notifications.byEmail",
  discord: "profile.notifications.byDiscord",
  telegram: "profile.notifications.byTelegram",
} as const satisfies Record<Channel, string>;

const channelsFieldGroup = defineAppFieldGroup(({ strict }) => ({
  email: strict<NotificationType[]>(),
  discord: strict<NotificationType[]>(),
  telegram: strict<NotificationType[]>(),
}));

interface Props {
  fields: typeof channelsFieldGroup.fields;
  channels: readonly Channel[];
  off: Record<Channel, boolean>;
}

function toggled(list: readonly NotificationType[], kind: NotificationType, on: boolean) {
  return notificationKinds.filter((entry) => (entry === kind ? on : list.includes(entry)));
}

function NotificationChannelsGroup({ fields, channels, off }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <div className="mt-4 max-w-3xl">
      <Table
        label={t("profile.notifications.title")}
        className={cn(
          "table-fixed",
          channels.length === 1 && "min-w-76",
          channels.length === 2 && "min-w-94",
          channels.length === 3 && "min-w-112",
        )}
      >
        <TableHeader>
          <TableRow>
            <TableHead>{t("profile.notifications.kind")}</TableHead>
            <TableHead wrap className="w-18 px-1 text-center sm:w-24">
              {t("profile.notifications.inApp")}
            </TableHead>
            {channels.map((channel) => (
              <TableHead key={channel} wrap className="w-18 px-1 text-center sm:w-24">
                {t(`profile.notifications.${channel}`)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {notificationKinds
            .filter((kind) => channels.length > 0 || kind !== NotificationType.monthlyDigest)
            .map((kind) => {
              const name = t(`notifications.kinds.${kind}`);
              const Icon = kind === NotificationType.monthlyDigest ? Minus : Check;
              return (
                <TableRow key={kind}>
                  <TableCell className="whitespace-normal">{name}</TableCell>
                  <TableCell>
                    <Icon
                      role="img"
                      aria-label={t(
                        kind === NotificationType.monthlyDigest
                          ? "profile.notifications.digestOnlyOutside"
                          : "profile.notifications.alwaysInApp",
                      )}
                      className="mx-auto size-4 text-muted-foreground"
                    />
                  </TableCell>
                  {channels.map((channel) => (
                    <TableCell key={channel}>
                      <fields.Field name={channel}>
                        {(field) => (
                          <Checkbox
                            className="mx-auto"
                            aria-label={t(channelLabels[channel], { kind: name })}
                            disabled={off[channel]}
                            checked={field.value.includes(kind)}
                            onCheckedChange={(on) =>
                              field.handleChange(toggled(field.value, kind, on))
                            }
                          />
                        )}
                      </fields.Field>
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
    </div>
  );
}

export const NotificationChannelsFields = channelsFieldGroup.bindComponent(
  NotificationChannelsGroup,
  "fields",
);
