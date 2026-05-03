import { usePPCtx } from '../PropertyPanelContext';

// eslint-disable-next-line react-hooks/rules-of-hooks
export const renderTerminalBlockProps = () => { const { tc } = usePPCtx(); return (
    <>
      <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
        Terminal block provides a simple pass-through from <strong>IN</strong>{' '}
        to <strong>OUT</strong>. Use it to keep wiring organized in panel
        schematics and marshalling layouts.
      </p>
    </>
  );};

