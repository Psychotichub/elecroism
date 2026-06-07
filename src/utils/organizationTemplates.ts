import { v4 as uuid } from 'uuid';
import { APP_VERSION } from '../constants/appVersion';
import type { ElectroProject } from '../types/project';
import type {
  OrganizationTemplateManifest,
  OrganizationTemplateSheetDef,
} from '../types/organizationTemplate';
import { ORG_TEMPLATE_VERSION } from '../types/organizationTemplate';
import type { ComponentMacro } from './componentMacros';
import { parseLibraryPack } from './componentLibraryPack';
import {
  circuitToSheetData,
  createEmptyProject,
} from './projectPersistence';
import { createEmptyCircuit } from '../store/circuitDefaults';
import { applyProjectTitleBlock } from './projectTitleBlock';

export type OrgTemplateCompatibilityResult = {
  compatible: boolean;
  reason?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function parseSheetDefs(
  raw: unknown
): OrganizationTemplateManifest['sheets'] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const sheets = raw
    .filter((s): s is OrganizationTemplateSheetDef => {
      if (!isRecord(s)) return false;
      return typeof s.name === 'string' && s.name.trim().length > 0;
    })
    .map((s, i) => ({
      name: s.name.trim(),
      sortOrder: typeof s.sortOrder === 'number' ? s.sortOrder : i,
    }))
    .slice(0, 24);
  return sheets.length > 0 ? sheets : undefined;
}

function isMacro(value: unknown): value is ComponentMacro {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    Array.isArray(value.components)
  );
}

export function parseOrganizationTemplate(
  data: unknown
): OrganizationTemplateManifest | null {
  if (!isRecord(data)) return null;
  if (typeof data.id !== 'string' || typeof data.name !== 'string') return null;

  const library = Array.isArray(data.library)
    ? data.library.filter(isMacro)
    : undefined;

  const plugins = Array.isArray(data.plugins)
    ? (data.plugins as OrganizationTemplateManifest['plugins'])
    : undefined;

  const titleBlock =
    data.titleBlock && isRecord(data.titleBlock)
      ? (data.titleBlock as OrganizationTemplateManifest['titleBlock'])
      : undefined;

  return {
    version:
      typeof data.version === 'string' ? data.version : ORG_TEMPLATE_VERSION,
    id: data.id,
    name: data.name,
    author: typeof data.author === 'string' ? data.author : undefined,
    description:
      typeof data.description === 'string' ? data.description : undefined,
    minAppVersion:
      typeof data.minAppVersion === 'string' ? data.minAppVersion : undefined,
    projectName:
      typeof data.projectName === 'string' ? data.projectName : undefined,
    logoUrl: typeof data.logoUrl === 'string' ? data.logoUrl : undefined,
    titleBlock,
    sheets: parseSheetDefs(data.sheets),
    library: library?.length ? library : undefined,
    libraryPackUrl:
      typeof data.libraryPackUrl === 'string' ? data.libraryPackUrl : undefined,
    plugins,
  };
}

function compareSimpleVersion(a: string, b: string): number {
  const pa = a.split('.').map((n) => Number(n) || 0);
  const pb = b.split('.').map((n) => Number(n) || 0);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

export function checkOrgTemplateCompatibility(
  template: OrganizationTemplateManifest,
  appVersion = APP_VERSION
): OrgTemplateCompatibilityResult {
  if (template.version !== ORG_TEMPLATE_VERSION) {
    return {
      compatible: false,
      reason: `Template v${template.version} is not supported (app expects v${ORG_TEMPLATE_VERSION}).`,
    };
  }
  if (
    template.minAppVersion &&
    compareSimpleVersion(appVersion, template.minAppVersion) < 0
  ) {
    return {
      compatible: false,
      reason: `Requires ElectroSim ${template.minAppVersion} or newer.`,
    };
  }
  return { compatible: true };
}

export async function fetchTemplateLibraryPack(
  url: string
): Promise<ComponentMacro[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not fetch library pack (${res.status}).`);
  const pack = parseLibraryPack((await res.json()) as unknown);
  if (!pack) throw new Error('Invalid library pack in template.');
  return pack.macros;
}

export async function buildProjectFromOrganizationTemplate(
  template: OrganizationTemplateManifest
): Promise<ElectroProject> {
  const sheetDefs = template.sheets?.length
    ? [...template.sheets].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
      )
    : [{ name: 'Sheet 1', sortOrder: 0 }];

  let library = template.library ? [...template.library] : [];
  if (template.libraryPackUrl) {
    library = await fetchTemplateLibraryPack(template.libraryPackUrl);
  }

  const now = new Date().toISOString();
  const sheets = sheetDefs.map((def, index) => {
    const sheetId = uuid();
    const circuit = createEmptyCircuit();
    circuit.name = def.name;
    return {
      id: sheetId,
      name: def.name,
      sortOrder: def.sortOrder ?? index,
      circuit: circuitToSheetData(circuit),
    };
  });

  const titleBlockPatch = {
    ...template.titleBlock,
    logoUrl: template.titleBlock?.logoUrl ?? template.logoUrl,
    brandName:
      template.titleBlock?.brandName ?? template.name,
  };

  let project: ElectroProject = {
    id: uuid(),
    name: template.projectName?.trim() || template.name,
    createdAt: now,
    updatedAt: now,
    activeSheetId: sheets[0].id,
    sheets,
    library,
    plugins: template.plugins,
    titleBlock: titleBlockPatch,
  };

  project = applyProjectTitleBlock(project, titleBlockPatch);
  return project;
}

/** Resolve a bundled template id or fetch a remote `.orgtemplate.json` URL. */
export async function resolveOrganizationTemplate(
  idOrUrl: string,
  bundled: OrganizationTemplateManifest[]
): Promise<OrganizationTemplateManifest | null> {
  const local = bundled.find((t) => t.id === idOrUrl);
  if (local) return local;
  if (!/^https?:\/\//i.test(idOrUrl) && !idOrUrl.startsWith('/')) {
    return null;
  }
  const res = await fetch(idOrUrl);
  if (!res.ok) return null;
  return parseOrganizationTemplate((await res.json()) as unknown);
}

export function listBundledOrganizationTemplates(
  bundled: OrganizationTemplateManifest[]
): OrganizationTemplateManifest[] {
  return bundled;
}

/** Empty project baseline for tests. */
export function emptyProjectBaseline(): ElectroProject {
  return createEmptyProject('Baseline');
}
