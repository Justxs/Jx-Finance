import { type ReactNode, ViewTransition } from "react";
import { useTranslation } from "react-i18next";
import type { UserProfileResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { SelectColumnFilter, TextColumnFilter } from "@/components/ui/column-filter/column-filter";
import { SortableTableHead } from "@/components/ui/column-header/column-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableEmptyRow,
  ScrollRegion,
} from "@/components/ui/table/table";
import { ResetPasswordDialog } from "@/features/users/reset-password-dialog/reset-password-dialog";
import { useSearchTable } from "@/hooks/use-search-table";
import { cn } from "@/lib/utils";
import { useUserRowControls } from "./use-user-row-controls";
import { UsersFilterBar, useUserFilters } from "./user-filters";
import { UserRoleSelect, UserRowActions, UserStatusTag } from "./user-row-parts";
import { UsersMobileList } from "./users-mobile-list";

interface Props {
  users: UserProfileResponse[];
  stale: boolean;
}

export function UsersTable({ users, stale }: Readonly<Props>) {
  const { t } = useTranslation();
  const filters = useUserFilters();
  const table = useSearchTable(filters.search, filters.patchSearch);
  const { controls, deactivateDialogProps, resetUser, closeReset } = useUserRowControls(users);

  let body: ReactNode;
  if (users.length === 0) {
    body = (
      <TableEmptyRow colSpan={4} filtered={filters.filtered}>
        {t("users.empty")}
      </TableEmptyRow>
    );
  } else {
    body = users.map((user) => {
      return (
        <TableRow key={user.id}>
          <TableCell>
            <p className="font-medium">{user.displayName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{user.email}</p>
          </TableCell>
          <TableCell>
            <UserRoleSelect user={user} controls={controls} />
          </TableCell>
          <TableCell>
            <UserStatusTag user={user} />
          </TableCell>
          <TableCell>
            <div className="flex justify-end gap-1">
              <UserRowActions user={user} controls={controls} />
            </div>
          </TableCell>
        </TableRow>
      );
    });
  }

  return (
    <>
      <UsersFilterBar filters={filters} className="mb-2 md:hidden" />
      <UsersMobileList
        users={users}
        stale={stale}
        filtered={filters.filtered}
        controls={controls}
      />
      <section className="-mx-3 hidden md:block">
        <ViewTransition name="users-rows" enter="none" exit="none">
          <ScrollRegion aria-label={t("users.title")}>
            <Table className={cn("min-w-160", stale && "stale")} aria-busy={stale}>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    label={t("users.displayName")}
                    {...table.sortProps("displayName")}
                    filter={
                      <TextColumnFilter
                        label={t("users.displayName")}
                        value={filters.text.value}
                        onChange={filters.text.set}
                      />
                    }
                  />
                  <SortableTableHead
                    label={t("users.role")}
                    {...table.sortProps("role")}
                    filter={
                      <SelectColumnFilter
                        label={t("users.role")}
                        value={filters.role.value}
                        onChange={filters.role.set}
                        options={filters.role.options}
                      />
                    }
                  />
                  <SortableTableHead
                    label={t("users.status")}
                    {...table.sortProps("status")}
                    filter={
                      <SelectColumnFilter
                        label={t("users.status")}
                        value={filters.status.value}
                        onChange={filters.status.set}
                        options={filters.status.options}
                      />
                    }
                  />
                  <TableHead>
                    <span className="sr-only">{t("common.actions")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{body}</TableBody>
            </Table>
          </ScrollRegion>
        </ViewTransition>
      </section>

      <ConfirmDeleteDialog
        {...deactivateDialogProps}
        title={t("users.deactivateConfirm.title")}
        description={t("users.deactivateConfirm.description")}
        confirmLabel={t("users.deactivate")}
      />

      <ResetPasswordDialog user={resetUser} onClose={closeReset} />
    </>
  );
}
