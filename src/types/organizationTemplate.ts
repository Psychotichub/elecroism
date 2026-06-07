import type { ComponentMacro } from '../utils/componentMacros';
import type { PluginManifest } from './plugin';
import type { ProjectTitleBlock } from './project';

/** JSON organization template format (`.orgtemplate.json`) — v1. */

export const ORG_TEMPLATE_VERSION = '1.0';

export type OrganizationTemplateSheetDef = {
  name: string;
  sortOrder?: number;
};

export type OrganizationTemplateManifest = {
  version: string;
  id: string;
  name: string;
  author?: string;
  description?: string;
  minAppVersion?: string;
  /** Default project name when created from this template. */
  projectName?: string;
  /** Brand logo URL (app-relative path or data URL). */
  logoUrl?: string;
  titleBlock?: ProjectTitleBlock;
  sheets?: OrganizationTemplateSheetDef[];
  /** Inline macro library shipped with the template. */
  library?: ComponentMacro[];
  /** Fetch macros from a `.elib.json` pack URL on project creation. */
  libraryPackUrl?: string;
  plugins?: PluginManifest[];
};
