import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import UiGallery from './UiGallery';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UiGallery />
  </StrictMode>
);
