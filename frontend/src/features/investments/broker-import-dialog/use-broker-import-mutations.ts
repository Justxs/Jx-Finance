import { useIsMutating } from "@tanstack/react-query";
import {
  getDeleteBrokerConnectionMutationKey,
  getImportBrokerReportMutationKey,
  getSaveBrokerConnectionMutationKey,
  getSyncBrokerConnectionMutationKey,
  useDeleteBrokerConnection,
  useImportBrokerReport,
  useSaveBrokerConnection,
  useSyncBrokerConnection,
} from "@/api/generated";
import { silent } from "@/lib/mutations";

const brokerImportMutationNames = new Set<unknown>([
  getImportBrokerReportMutationKey()[0],
  getSaveBrokerConnectionMutationKey()[0],
  getDeleteBrokerConnectionMutationKey()[0],
  getSyncBrokerConnectionMutationKey()[0],
]);

export function useBrokerImportMutations() {
  const importReport = useImportBrokerReport(silent());
  const saveConnection = useSaveBrokerConnection({
    mutation: { gcTime: 0 },
  });
  const deleteConnection = useDeleteBrokerConnection();
  const syncConnection = useSyncBrokerConnection(silent());

  const busy = useBrokerImportBusy();

  return { importReport, saveConnection, deleteConnection, syncConnection, busy };
}

export function useBrokerImportBusy() {
  const running = useIsMutating({
    predicate: (mutation) => brokerImportMutationNames.has(mutation.options.mutationKey?.[0]),
  });

  return running > 0;
}

export type BrokerImportMutations = ReturnType<typeof useBrokerImportMutations>;
