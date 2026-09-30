// Заглушка для предпросмотра: там нет service worker, плашка обновления не нужна
export function useRegisterSW(_opts?: unknown) {
  const noop = () => {};
  return { needRefresh: [false, noop] as const, offlineReady: [false, noop] as const, updateServiceWorker: async (_reload?: boolean) => {} };
}
