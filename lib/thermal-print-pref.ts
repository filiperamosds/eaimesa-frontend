const KEY = "eaimesa.kanban.autoPrint";

export function isThermalAutoPrintEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "1" || sessionStorage.getItem(KEY) === "1";
}

export function setThermalAutoPrintEnabled(on: boolean) {
  if (typeof window === "undefined") return;
  if (on) {
    localStorage.setItem(KEY, "1");
    sessionStorage.setItem(KEY, "1");
    return;
  }
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
}
