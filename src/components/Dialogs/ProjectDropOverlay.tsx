import React from 'react';
import { FiUpload } from 'react-icons/fi';

type Props = {
  active: boolean;
};

const ProjectDropOverlay: React.FC<Props> = ({ active }) => {
  if (!active) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center bg-blue-950/55 p-6 backdrop-blur-[1px]"
      aria-hidden
    >
      <div className="flex max-w-md flex-col items-center gap-3 rounded-xl border-2 border-dashed border-sky-400/80 bg-slate-900/80 px-8 py-10 text-center shadow-2xl">
        <FiUpload size={36} className="text-sky-300" />
        <p className="text-base font-semibold text-slate-100">
          Drop project file to open
        </p>
        <p className="text-xs text-slate-400">
          Supported: .eproj, .esim, .json
        </p>
      </div>
    </div>
  );
};

export default ProjectDropOverlay;
