import {
  useDeleteBrokerConnectionEndpoint,
  useImportBrokerReportEndpoint,
  useSaveBrokerConnectionEndpoint,
  useSyncBrokerConnectionEndpoint,
} from "@/api/generated";
import { useInvalidateInvestments } from "../use-invalidate-investments";

export function useBrokerImportMutations() {
  const { invalidateConnections, invalidateImport } = useInvalidateInvestments();

  const importReport = useImportBrokerReportEndpoint({
    mutation: { onSettled: invalidateImport },
  });
  const saveConnection = useSaveBrokerConnectionEndpoint({
    mutation: { gcTime: 0, onSettled: invalidateConnections },
  });
  const deleteConnection = useDeleteBrokerConnectionEndpoint({
    mutation: { onSettled: invalidateConnections },
  });
  const syncConnection = useSyncBrokerConnectionEndpoint({
    mutation: { onSettled: invalidateImport },
  });

  const busy =
    importReport.isPending ||
    saveConnection.isPending ||
    deleteConnection.isPending ||
    syncConnection.isPending;

  return { importReport, saveConnection, deleteConnection, syncConnection, busy };
}

export type BrokerImportMutations = ReturnType<typeof useBrokerImportMutations>;
