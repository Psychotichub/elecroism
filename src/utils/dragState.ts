let currentDragComponentType: string | undefined;

export function setDragComponentType(type: string | undefined): void {
  currentDragComponentType = type;
}

export function getDragComponentType(): string | undefined {
  return currentDragComponentType;
}

export function clearDragComponentType(): void {
  currentDragComponentType = undefined;
}
