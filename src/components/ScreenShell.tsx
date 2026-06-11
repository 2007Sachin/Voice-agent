import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface ScreenShellProps {
  children: ReactNode;
  width?: 'narrow' | 'wide';
  headerRight?: ReactNode;
}

export function ScreenShell({ children, width = 'narrow', headerRight }: ScreenShellProps) {
  return (
    <div className="shell">
      <header className="shell__header no-print">
        <Link to="/" className="wordmark">
          <span className="wordmark__dot" aria-hidden="true" />
          Interview Studio
        </Link>
        {headerRight}
      </header>
      <main className={`shell__main shell__main--${width}`}>{children}</main>
    </div>
  );
}
