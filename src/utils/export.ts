import Konva from 'konva';

export function exportToPNG(stage: Konva.Stage, filename: string): void {
  const uri = stage.toDataURL({ pixelRatio: 2 });
  const link = document.createElement('a');
  link.download = filename || 'circuit.png';
  link.href = uri;
  link.click();
}
