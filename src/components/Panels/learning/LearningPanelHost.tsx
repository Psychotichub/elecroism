import React from 'react';
import { useUiStore } from '../../../store/uiStore';
import AssignmentPanel from '../AssignmentPanel';
import ChallengePanel from '../ChallengePanel';
import TutorialPanel from '../TutorialPanel';

type Slot = 'dock' | 'floating';

type Props = {
  slot: Slot;
};

function resolveActiveSlot(
  placement: 'dock' | 'floating',
  pinned: boolean,
  inspectorCollapsed: boolean
): Slot {
  if (inspectorCollapsed && placement === 'dock') return 'floating';
  return pinned ? 'dock' : placement;
}

const LearningPanelHost: React.FC<Props> = ({ slot }) => {
  const activeTutorialId = useUiStore((s) => s.activeTutorialId);
  const activeChallengeId = useUiStore((s) => s.activeChallengeId);
  const activeAssignment = useUiStore((s) => s.activeAssignment);
  const placement = useUiStore((s) => s.learningPanelPlacement);
  const pinned = useUiStore((s) => s.learningPanelPinned);
  const propertyCollapsed = useUiStore((s) => s.propertyPanelCollapsed);

  const hasSession =
    !!activeTutorialId || !!activeChallengeId || !!activeAssignment;
  if (!hasSession) return null;

  const activeSlot = resolveActiveSlot(placement, pinned, propertyCollapsed);
  if (slot !== activeSlot) return null;

  if (activeAssignment) {
    return <AssignmentPanel docked={slot === 'dock'} />;
  }
  if (activeChallengeId) {
    return <ChallengePanel docked={slot === 'dock'} />;
  }
  return <TutorialPanel docked={slot === 'dock'} />;
};

export default LearningPanelHost;
