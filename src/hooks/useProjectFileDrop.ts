import { useEffect, useRef, useState } from 'react';
import {
  isAssignmentFileName,
  openAssignmentDocument,
  parseAssignmentDocument,
} from '../utils/assignmentMode';
import { useCircuitStore } from '../store/circuitStore';
import { useUiStore } from '../store/uiStore';
import {
  firstProjectFile,
  isExternalProjectFileDrag,
  openProjectFromFile,
  readProjectFileAsText,
} from '../utils/projectOpen';

/** Window-level drag-and-drop for `.eproj` / `.esim` / `.json` project files. */
export function useProjectFileDrop(): boolean {
  const [active, setActive] = useState(false);
  const depthRef = useRef(0);

  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      if (!isExternalProjectFileDrag(e)) return;
      e.preventDefault();
      depthRef.current += 1;
      setActive(true);
    };

    const onDragLeave = (e: DragEvent) => {
      if (!isExternalProjectFileDrag(e)) return;
      depthRef.current = Math.max(0, depthRef.current - 1);
      if (depthRef.current === 0) setActive(false);
    };

    const onDragOver = (e: DragEvent) => {
      if (!isExternalProjectFileDrag(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };

    const onDrop = (e: DragEvent) => {
      depthRef.current = 0;
      setActive(false);
      if (!isExternalProjectFileDrag(e)) return;
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer?.files
        ? Array.from(e.dataTransfer.files)
        : [];
      const assignmentFile = files.find((f) => isAssignmentFileName(f.name));
      if (assignmentFile) {
        void (async () => {
          try {
            const text = await readProjectFileAsText(assignmentFile);
            const doc = parseAssignmentDocument(JSON.parse(text) as unknown);
            if (!doc) {
              window.alert('Invalid assignment file.');
              return;
            }
            const { loadCircuit, runSimulation, setSelected } =
              useCircuitStore.getState();
            const { startAssignment, setLearningMode } = useUiStore.getState();
            openAssignmentDocument(doc, {
              loadCircuit,
              runSimulation,
              setSelected,
              startAssignment,
              setLearningMode,
            });
          } catch {
            window.alert('Could not open assignment file.');
          }
        })();
        return;
      }
      const file = files.length ? firstProjectFile(files) : null;
      if (!file) {
        window.alert(
          'Drop a .eproj / .esim project file or a .eassign assignment file.'
        );
        return;
      }
      void openProjectFromFile(file).then((result) => {
        if (!result.ok) window.alert(result.error ?? 'Could not open file.');
      });
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  return active;
}
