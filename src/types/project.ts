import type { Circuit } from './index';
import type { ComponentMacro } from '../utils/componentMacros';

/** Circuit payload stored inside a project sheet (full circuit document). */
export type SheetCircuitData = Circuit;

export interface ProjectSheet {
  id: string;
  name: string;
  sortOrder: number;
  circuit: SheetCircuitData;
}

export interface ElectroProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  activeSheetId: string;
  sheets: ProjectSheet[];
  /** Shared macro library saved with the project file. */
  library: ComponentMacro[];
}

export interface RecentProjectEntry {
  name: string;
  updatedAt: string;
  sheetCount: number;
}

export const PROJECT_FILE_VERSION = '2.0';

export interface ProjectFileDocument {
  version: string;
  name: string;
  created: string;
  updated: string;
  activeSheetId: string;
  sheets: ProjectSheet[];
  library: ComponentMacro[];
}
