/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useUiStore } from '../../../../store/uiStore';
import LearningPanelHost from '../LearningPanelHost';

describe('LearningPanelHost', () => {
  beforeEach(() => {
    useUiStore.setState({
      activeTutorialId: null,
      activeChallengeId: null,
      activeAssignment: null,
      learningPanelPlacement: 'dock',
      learningPanelPinned: true,
      learningPanelMinimized: false,
      propertyPanelCollapsed: false,
    });
  });

  it('renders tutorial panel in dock slot when pinned', () => {
    useUiStore.setState({ activeTutorialId: 'dol-starter-1p' });
    render(
      <>
        <LearningPanelHost slot="dock" />
        <LearningPanelHost slot="floating" />
      </>
    );
    expect(screen.getByLabelText(/Tutorial:/)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Tutorial:/)).toHaveLength(1);
  });

  it('renders floating slot when unpinned', () => {
    useUiStore.setState({
      activeTutorialId: 'dol-starter-1p',
      learningPanelPlacement: 'floating',
      learningPanelPinned: false,
    });
    render(
      <>
        <LearningPanelHost slot="dock" />
        <LearningPanelHost slot="floating" />
      </>
    );
    expect(screen.getByLabelText(/Tutorial:/)).toBeInTheDocument();
  });
});
