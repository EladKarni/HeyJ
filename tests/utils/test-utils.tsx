import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';

// Add custom render if needed for providers
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { ...options });

export * from '@testing-library/react-native';
export { customRender as render };
