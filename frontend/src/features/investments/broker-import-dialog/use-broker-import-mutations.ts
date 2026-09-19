import {
  useDeleteBrokerConnection,
  useImportBrokerReport,
  useSaveBrokerConnection,
  useSyncBrokerConnection,
} from "@/api/generated";

export function useBrokerImportMutations() {
  const importReport = useImportBrokerReport();
  const saveConnection = useSaveBrokerConnection({
    mutation: { gcTime: 0 },
  });
  const deleteConnection = useDeleteBrokerConnection();
  const syncConnection = useSyncBrokerConnection();

  const busy =
    importReport.isPending ||
    saveConnection.isPending ||
    deleteConnection.isPending ||
    syncConnection.isPending;

  return { importReport, saveConnection, deleteConnection, syncConnection, busy };
}

export type BrokerImportMutations = ReturnType<typeof useBrokerImportMutations>;
