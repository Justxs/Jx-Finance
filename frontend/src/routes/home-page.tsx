import { useTranslation } from "react-i18next";
import { useGetPingEndpoint } from "../api/generated";
import { useDate, useMoney } from "../hooks/use-formatters";

export const HomePage = () => {
  const { t } = useTranslation();
  const money = useMoney();
  const date = useDate();
  const ping = useGetPingEndpoint();

  let status = t("status.ok");
  if (ping.isLoading) {
    status = t("status.loading");
  } else if (ping.isError) {
    status = t("status.error");
  }

  let statusTone = "bg-emerald-500";
  if (ping.isLoading) {
    statusTone = "bg-amber-400";
  } else if (ping.isError) {
    statusTone = "bg-rose-500";
  }

  return (
    <div className="space-y-12">
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-accent">
            Ledger-first MVP
          </p>
          <h1 className="font-display text-4xl leading-tight text-ink md:text-5xl">
            {t("hero.title")}
          </h1>
          <p className="max-w-xl text-lg text-ink/70">{t("hero.subtitle")}</p>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-full bg-ink px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:-translate-y-0.5 hover:bg-ink/90">
              {t("cta.add")}
            </button>
            <button className="rounded-full border border-line bg-white/70 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-ink transition hover:-translate-y-0.5 hover:border-ink">
              {t("cta.view")}
            </button>
          </div>
        </div>

        <div className="card relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/40 to-white/10" />
          <div className="relative space-y-5 p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-ink/50">Balance</p>
                <p className="mt-2 text-3xl font-semibold text-ink">{money.format(1240.5)}</p>
                <p className="mt-1 text-sm text-ink/60">{date.format(new Date())}</p>
              </div>
              <div className="rounded-full border border-line bg-white/80 px-4 py-2 text-xs uppercase tracking-[0.28em] text-ink/70">
                Draft
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl border border-line bg-white/80 p-4 text-sm">
              <div className="flex items-center justify-between text-ink/70">
                <span>Income (month)</span>
                <span className="font-semibold text-ink">{money.format(0)}</span>
              </div>
              <div className="flex items-center justify-between text-ink/70">
                <span>Expenses (month)</span>
                <span className="font-semibold text-ink">{money.format(0)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-line bg-white/80 p-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-ink/50">
                  {t("status.label")}
                </p>
                <p className="mt-1 text-sm font-semibold text-ink">{status}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-ink/60">
                <span className={`h-2 w-2 rounded-full ${statusTone}`} />
                <span>{t("statusMeta.time")}</span>
                <span className="font-mono">
                  {ping.data?.utcNow
                    ? new Date(ping.data.utcNow).toISOString().slice(11, 19)
                    : "--:--:--"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="card p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-ink/50">01</p>
          <h2 className="mt-3 font-display text-xl text-ink">{t("principles.fast.title")}</h2>
          <p className="mt-2 text-sm text-ink/70">{t("principles.fast.body")}</p>
        </div>
        <div className="card p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-ink/50">02</p>
          <h2 className="mt-3 font-display text-xl text-ink">{t("principles.trust.title")}</h2>
          <p className="mt-2 text-sm text-ink/70">{t("principles.trust.body")}</p>
        </div>
        <div className="card p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-ink/50">03</p>
          <h2 className="mt-3 font-display text-xl text-ink">{t("principles.private.title")}</h2>
          <p className="mt-2 text-sm text-ink/70">{t("principles.private.body")}</p>
        </div>
      </section>
    </div>
  );
};
