import { Mail, MessagesSquare, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TitledSection } from "@/components/ui/section/section";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs/tabs";
import { DiscordSection } from "@/features/settings/discord-section/discord-section";
import { SmtpSection } from "@/features/settings/smtp-section/smtp-section";
import { TelegramSection } from "@/features/settings/telegram-section/telegram-section";

export function NotificationProviderTabs() {
  const { t } = useTranslation();

  return (
    <Tabs defaultValue="email">
      <TabsList>
        <TabsTab value="email">
          <Mail aria-hidden="true" className="size-4 shrink-0" />
          {t("settings.smtp.title")}
        </TabsTab>
        <TabsTab value="discord">
          <MessagesSquare aria-hidden="true" className="size-4 shrink-0" />
          {t("settings.discord.title")}
        </TabsTab>
        <TabsTab value="telegram">
          <Send aria-hidden="true" className="size-4 shrink-0" />
          {t("settings.telegram.title")}
        </TabsTab>
      </TabsList>
      <TabsPanel value="email">
        <SmtpSection />
      </TabsPanel>
      <TabsPanel value="discord">
        <DiscordSection />
      </TabsPanel>
      <TabsPanel value="telegram">
        <TelegramSection />
      </TabsPanel>
    </Tabs>
  );
}

export function NotificationProvidersSection() {
  const { t } = useTranslation();

  return (
    <TitledSection title={t("settings.notificationProviders.title")} bodyGap="md">
      <NotificationProviderTabs />
    </TitledSection>
  );
}
