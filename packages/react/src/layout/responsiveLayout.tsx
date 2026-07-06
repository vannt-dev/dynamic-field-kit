import React, { useEffect, useState } from 'react';
import {
  LayoutConfig,
  ResponsiveLayout,
  layoutRegistry,
} from './layoutRegistry';

function resolve(layout: LayoutConfig) {
  if (typeof layout === 'string') {
    return { type: layout, config: {} };
  }
  return { type: layout.type, config: layout };
}

function checkIsMobile(breakpoint: number) {
  return typeof window !== 'undefined' && window.innerWidth < breakpoint;
}

layoutRegistry.register('responsive', ({ children, config }) => {
  const responsiveConfig = config as ResponsiveLayout;
  const breakpoint = responsiveConfig.breakpoint ?? 768;

  // Registered as a real component (invoked via JSX in MultiFieldInput), so
  // hooks are safe here and let the layout react to viewport resizes instead
  // of freezing whatever the width happened to be on first render.
  const [isMobile, setIsMobile] = useState(() => checkIsMobile(breakpoint));

  useEffect(() => {
    const handleResize = () => setIsMobile(checkIsMobile(breakpoint));
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  const current = isMobile ? responsiveConfig.mobile : responsiveConfig.desktop;
  if (!current) {
    return <>{children} </>;
  }

  const { type, config: childConfig } = resolve(current);
  const Renderer = layoutRegistry.get(type);

  if (!Renderer) {
    return <>{children} </>;
  }

  return <Renderer config={childConfig}>{children}</Renderer>;
});
