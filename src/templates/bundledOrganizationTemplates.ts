import type { OrganizationTemplateManifest } from '../types/organizationTemplate';

/** Bundled templates — also published under `public/templates/`. */
export const BUNDLED_ORGANIZATION_TEMPLATES: OrganizationTemplateManifest[] = [
  {
    version: '1.0',
    id: 'com.electrosim.panel-shop-standard',
    name: 'Panel Shop Standard',
    author: 'ElectroSim',
    description:
      'Three-sheet panel project with IEC symbol library, branded title block, and revision defaults.',
    minAppVersion: '0.0.0',
    projectName: 'Panel Project',
    logoUrl: '/templates/panel-shop-logo.svg',
    titleBlock: {
      brandName: 'ElectroSim Panel Shop',
      logoUrl: '/templates/panel-shop-logo.svg',
      client: 'Client / Site',
      drawingNumber: 'EL-001',
      revision: 'A',
      scale: '1:50',
      drawnBy: 'Designer',
      checkedBy: 'Checker',
      approvedBy: 'Approver',
      revisionHistory: [
        {
          revision: 'A',
          date: new Date().toLocaleDateString(),
          description: 'Initial issue',
          drawnBy: 'Designer',
        },
      ],
    },
    sheets: [
      { name: 'Power distribution', sortOrder: 0 },
      { name: 'Control circuits', sortOrder: 1 },
      { name: 'SLD overview', sortOrder: 2 },
    ],
    libraryPackUrl: '/library-packs/iec-symbols-starter.elib.json',
  },
];
