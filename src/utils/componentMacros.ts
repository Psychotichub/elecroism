import type { CircuitComponent, Wire } from '../types';

export interface ComponentMacro {
  id: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
  /** Optional notes shown in the library manager. */
  description?: string;
  tags?: string[];
  author?: string;
  components: CircuitComponent[];
  wires: Wire[];
}

const STORAGE_KEY = 'electrosim.componentMacros.v1';

export function loadComponentMacros(): ComponentMacro[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is ComponentMacro =>
        m != null &&
        typeof m === 'object' &&
        typeof (m as ComponentMacro).id === 'string' &&
        Array.isArray((m as ComponentMacro).components)
    );
  } catch {
    return [];
  }
}

export function saveComponentMacros(macros: ComponentMacro[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(macros));
  } catch {
    // ignore quota
  }
}

export function addComponentMacro(
  name: string,
  components: CircuitComponent[],
  wires: Wire[]
): ComponentMacro {
  const macros = loadComponentMacros();
  const macro: ComponentMacro = {
    id: crypto.randomUUID(),
    name: name.trim() || 'Macro',
    createdAt: new Date().toISOString(),
    components: structuredClone(components),
    wires: structuredClone(wires),
  };
  saveComponentMacros([macro, ...macros].slice(0, 32));
  return macro;
}

export function deleteComponentMacro(id: string): void {
  saveComponentMacros(loadComponentMacros().filter((m) => m.id !== id));
}
