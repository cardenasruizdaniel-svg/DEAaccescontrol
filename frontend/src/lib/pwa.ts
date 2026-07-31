export function forceUpdate(): void {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg?.waiting) {
        reg.waiting.postMessage("SKIP_WAITING");
      }
    });
  }
}

export function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if ("serviceWorker" in navigator && "Notification" in window) {
    return navigator.serviceWorker.register("/sw.js");
  }
  return Promise.resolve(null);
}

export const registerServiceWorker = registerSW;
