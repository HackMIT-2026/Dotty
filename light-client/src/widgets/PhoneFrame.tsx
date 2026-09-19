import type { CSSProperties, ReactNode } from 'react';

import underwater from '../assets/background/underwater.png';
import underwaterWide from '../assets/background/underwater_wide.png';
import './PhoneFrame.css';

interface PhoneFrameProps {
  children: ReactNode;
  underwater?: boolean;
}

/**
 * Keeps content at the 393 px design width when the app runs in a wide browser window.
 * With `underwater` set, Pip's pond scene fills the phone column, and on a wide window
 * a landscape version of the scene fills the space around it.
 */
export function PhoneFrame({ children, underwater: showScene = false }: PhoneFrameProps) {
  return (
    <div
      className={`phone-frame${showScene ? ' phone-frame--scene' : ''}`}
      style={showScene ? ({ '--scene-wide': `url(${underwaterWide})` } as CSSProperties) : undefined}
    >
      <main
        className="phone-frame__column"
        style={showScene ? { backgroundImage: `url(${underwater})` } : undefined}
      >
        {children}
      </main>
    </div>
  );
}
