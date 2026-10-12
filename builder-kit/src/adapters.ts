/** Current adapter labels, with read support for older captured profiles. */
interface AdapterState {
  status: string;
  connection?: string | null;
}
export function adapter_status(adapter?: AdapterState): 'OK' | 'ACTION_NEEDED' {
  return adapter?.status === 'OK' || adapter?.status === 'COMPATIBLE' ? 'OK' : 'ACTION_NEEDED';
}
export function connection_ready(adapter?: AdapterState): boolean {
  return (
    adapter_status(adapter) === 'OK' &&
    typeof adapter?.connection === 'string' &&
    adapter.connection.trim().length > 0
  );
}
