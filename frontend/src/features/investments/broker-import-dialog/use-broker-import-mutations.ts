import { useIsMutating } from "@tanstack/react-query";
import {
  getDeleteBrokerConnectionMutationKey,
  getImportBrokerReportMutationKey,
  getImportTradeCsvMutationKey,
  getSaveBrokerConnectionMutationKey,
  getSyncBrokerConnectionMutationKey,
  useDeleteBrokerConnection,
  useImportBrokerReport,
  useImportTradeCsv,
  useSaveBrokerConnection,
  useSyncBrokerConnection,
} from "@/api/generated";
import { silentMutation } from "@/lib/mutations";

const brokerImportMutationNames = new Set<unknown>([
  getImportBrokerReportMutationKey()[0],
  getSaveBrokerConnectionMutationKey()[0],
  getDeleteBrokerConnectionMutationKey()[0],
  getSyncBrokerConnectionMutationKey()[0],
  getImportTradeCsvMutationKey()[0],
]);

export function useBrokerImportMutations() {
  const importReport = useImportBrokerReport({ mutation: silentMutation });
  const saveConnection = useSaveBrokerConnection({
    mutation: { gcTime: 0 },
  });
  const deleteConnection = useDeleteBrokerConnection();
  const syncConnection = useSyncBrokerConnection({ mutation: silentMutation });
  const importTradeCsv = useImportTradeCsv({ mutation: silentMutation });

  const busy = useBrokerImportBusy();

  return { importReport, saveConnection, deleteConnection, syncConnection, importTradeCsv, busy };
}

export function useBrokerImportBusy() {
  const running = useIsMutating({
    predicate: (mutation) => brokerImportMutationNames.has(mutation.options.mutationKey?.[0]),
  });

  return running > 0;
}

export type BrokerImportMutations = ReturnType<typeof useBrokerImportMutations>;
