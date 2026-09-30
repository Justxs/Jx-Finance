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

export const notificationKinds = Object.values(NotificationType);

type Channel = "email" | "discord";

const channels: readonly Channel[] = ["email", "discord"];

const channelsFieldGroup = defineAppFieldGroup(({ strict }) => ({
  email: strict<NotificationType[]>(),
  discord: strict<NotificationType[]>(),
}));

interface Props {
  fields: typeof channelsFieldGroup.fields;
  off: Record<Channel, boolean>;
}

function toggled(list: readonly NotificationType[], kind: NotificationType, on: boolean) {
  return notificationKinds.filter((entry) => (entry === kind ? on : list.includes(entry)));
}

function NotificationChannelsGroup({ fields, off }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <div className="-mx-3 mt-4 max-w-3xl">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead>{t("profile.notifications.kind")}</TableHead>
            <TableHead className="w-16 text-center sm:w-24">
              {t("profile.notifications.inApp")}
            </TableHead>
            {channels.map((channel) => (
              <TableHead key={channel} className="w-16 text-center sm:w-24">
                {t(`profile.notifications.${channel}`)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {notificationKinds.map((kind) => {
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
                          aria-label={t(
                            channel === "email"
                              ? "profile.notifications.byEmail"
                              : "profile.notifications.byDiscord",
                            { kind: name },
                          )}
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
