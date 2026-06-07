import { describe, expect, it } from 'vitest';
import { BUNDLED_ORGANIZATION_TEMPLATES } from '../../templates/bundledOrganizationTemplates';
import {
  buildProjectFromOrganizationTemplate,
  checkOrgTemplateCompatibility,
  parseOrganizationTemplate,
} from '../organizationTemplates';

describe('organizationTemplates', () => {
  it('parses the bundled panel shop template', () => {
    const template = parseOrganizationTemplate(
      BUNDLED_ORGANIZATION_TEMPLATES[0]
    );
    expect(template?.id).toBe('com.electrosim.panel-shop-standard');
    expect(template?.sheets).toHaveLength(3);
  });

  it('checks template version compatibility', () => {
    const template = BUNDLED_ORGANIZATION_TEMPLATES[0];
    expect(checkOrgTemplateCompatibility(template).compatible).toBe(true);
    expect(
      checkOrgTemplateCompatibility({ ...template, version: '9.0' }).compatible
    ).toBe(false);
  });

  it('builds a multi-sheet project with title block and library pack', async () => {
    const template = {
      ...BUNDLED_ORGANIZATION_TEMPLATES[0],
      libraryPackUrl: undefined,
      library: [
        {
          id: 'macro-1',
          name: 'Test macro',
          createdAt: '2026-06-07T00:00:00.000Z',
          updatedAt: '2026-06-07T00:00:00.000Z',
          components: [],
          wires: [],
        },
      ],
    };
    const project = await buildProjectFromOrganizationTemplate(template);
    expect(project.name).toBe('Panel Project');
    expect(project.sheets).toHaveLength(3);
    expect(project.sheets.map((s) => s.name)).toEqual([
      'Power distribution',
      'Control circuits',
      'SLD overview',
    ]);
    expect(project.titleBlock?.brandName).toBe('ElectroSim Panel Shop');
    expect(project.titleBlock?.logoUrl).toBe('/templates/panel-shop-logo.svg');
    expect(project.library).toHaveLength(1);
    for (const sheet of project.sheets) {
      expect(sheet.circuit.drawingNumber).toBe('EL-001');
      expect(sheet.circuit.drawingScale).toBe('1:50');
    }
  });
});
