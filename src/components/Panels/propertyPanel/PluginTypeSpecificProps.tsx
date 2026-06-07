import React from 'react';
import { useCircuitStore } from '../../../store/circuitStore';
import { resolvePluginTypeForComponent } from '../../../utils/pluginComponents';
import { usePPCtx } from './PropertyPanelContext';
import { PluginComponentProps } from './PluginComponentProps';

export const PluginTypeSpecificProps: React.FC = () => {
  const { selectedComp } = usePPCtx();
  const plugins = useCircuitStore((s) => s.project.plugins ?? []);
  if (!selectedComp || selectedComp.type !== 'plugin_component') return null;
  const typeDef = resolvePluginTypeForComponent(plugins, selectedComp);
  if (!typeDef) {
    return (
      <p className="es-typo-caption text-amber-500">
        Plugin type not found — load the plugin manifest for this project.
      </p>
    );
  }
  return <PluginComponentProps typeDef={typeDef} />;
};
