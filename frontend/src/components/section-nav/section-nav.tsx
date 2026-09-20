import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { ProfileSection } from "@/features/profile/profile-nav/profile-nav";
import type { SettingsSection } from "@/features/settings/settings-nav/settings-nav";
import { cn } from "@/lib/utils";

interface SectionNavItem<TSection extends string> {
  id: TSection;
  label: string;
  icon: LucideIcon;
}

interface NavProps<TTo extends string, TSection extends string> {
  to: TTo;
  label: string;
  current: TSection;
  items: readonly SectionNavItem<TSection>[];
}

type Props = NavProps<"/settings", SettingsSection> | NavProps<"/profile", ProfileSection>;

type Target =
  | { to: "/settings"; section: SettingsSection }
  | { to: "/profile"; section: ProfileSection };

interface SectionLinkProps {
  target: Target;
  active: boolean;
  children: ReactNode;
}

function SectionLink({ target, active, children }: Readonly<SectionLinkProps>) {
  const shared = {
    replace: true,
    "aria-current": active ? ("page" as const) : undefined,
    className: cn(
      "flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground pointer-coarse:py-3",
      active && "bg-muted font-semibold text-foreground dark:bg-card",
    ),
  };

  if (target.to === "/settings") {
    return (
      <Link to="/settings" search={{ section: target.section }} {...shared}>
        {children}
      </Link>
    );
  }

  return (
    <Link to="/profile" search={{ section: target.section }} {...shared}>
      {children}
    </Link>
  );
}

function sectionTargets(props: Readonly<Props>) {
  if (props.to === "/settings") {
    return props.items.map((item) => ({
      item,
      target: { to: props.to, section: item.id } satisfies Target,
    }));
  }
  return props.items.map((item) => ({
    item,
    target: { to: props.to, section: item.id } satisfies Target,
  }));
}

export function SectionNav(props: Readonly<Props>) {
  return (
    <nav
      aria-label={props.label}
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:sticky lg:top-6 lg:mx-0 lg:flex-col lg:self-start lg:overflow-visible lg:p-0"
    >
      {sectionTargets(props).map(({ item, target }) => (
        <SectionLink key={item.id} target={target} active={item.id === props.current}>
          <item.icon aria-hidden="true" className="size-4 shrink-0" />
          {item.label}
        </SectionLink>
      ))}
    </nav>
  );
}
