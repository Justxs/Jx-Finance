import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { FieldShell } from "@/components/form/field-shell/field-shell";
import { SelectField } from "@/components/select-field/select-field";
import { Input } from "@/components/ui/input/input";
import { roleOptions } from "@/features/users/user-queries";
import { useDebouncedDraft } from "@/hooks/use-debounced-draft";
import type { SelectOption } from "@/lib/options";
import type { UserRole } from "@/lib/user-role";
import { cn } from "@/lib/utils";

const SEARCH_WAIT = 300;

type StatusFilter = "" | "true" | "false";

function statusFilter(isActive: boolean | undefined): StatusFilter {
  if (isActive === undefined) {
    return "";
  }
  return isActive ? "true" : "false";
}

export function useUserFilters() {
  const { t } = useTranslation();
  const search = useSearch({ from: "/users" });
  const navigate = useNavigate({ from: "/users" });

  function patchSearch(patch: Partial<typeof search>) {
    void navigate({ search: (prev) => ({ ...prev, ...patch }) });
  }

  const role: UserRole | "" = search.role ?? "";
  const roles: SelectOption<UserRole | "">[] = [
    { value: "", label: t("users.allRoles") },
    ...roleOptions(t),
  ];
  const statuses: SelectOption<StatusFilter>[] = [
    { value: "", label: t("users.allStatuses") },
    { value: "true", label: t("users.active") },
    { value: "false", label: t("users.deactivated") },
  ];

  return {
    search,
    patchSearch,
    filtered: Boolean(search.search) || Boolean(search.role) || search.isActive !== undefined,
    text: {
      value: search.search ?? "",
      set: (value: string) => patchSearch({ search: value || undefined }),
    },
    role: {
      value: role,
      set: (next: UserRole | "") => patchSearch({ role: next || undefined }),
      options: roles,
    },
    status: {
      value: statusFilter(search.isActive),
      set: (value: StatusFilter) =>
        patchSearch({ isActive: value === "" ? undefined : value === "true" }),
      options: statuses,
    },
  };
}

interface Props {
  filters: ReturnType<typeof useUserFilters>;
  className?: string;
}

export function UsersFilterBar({ filters, className }: Readonly<Props>) {
  const { t } = useTranslation();
  const text = useDebouncedDraft(filters.text.value, filters.text.set, SEARCH_WAIT);

  return (
    <div
      role="group"
      aria-label={t("filters.label")}
      className={cn("grid gap-3 sm:grid-cols-3", className)}
    >
      <FieldShell id="users-filter-search" label={t("common.search")}>
        <Input
          id="users-filter-search"
          type="search"
          value={text.draft}
          onChange={(event) => text.change(event.target.value)}
        />
      </FieldShell>
      <FieldShell id="users-filter-role" label={t("users.role")}>
        <SelectField
          id="users-filter-role"
          value={filters.role.value}
          onChange={filters.role.set}
          options={filters.role.options}
        />
      </FieldShell>
      <FieldShell id="users-filter-status" label={t("users.status")}>
        <SelectField
          id="users-filter-status"
          value={filters.status.value}
          onChange={filters.status.set}
          options={filters.status.options}
        />
      </FieldShell>
    </div>
  );
}
