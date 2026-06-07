import { Component, type ErrorInfo, type ReactNode } from 'react';
import { captureErrorReport } from '../../utils/errorReporting';

export interface AppErrorBoundaryProps {
  children: ReactNode;
  /** Short name for the UI region (toolbar, canvas, …). */
  areaName: string;
  /**
   * Classes for the fallback root when an error is shown (layout differs by
   * region: canvas wants flex-1, toolbar wants full width, fault dialog fixed overlay).
   */
  fallbackClassName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches render errors in a subtree so one broken panel does not blank the
 * whole app. Matches improvement doc: canvas, properties, faults, file IO.
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    const tag = `[ElectroSim · ${this.props.areaName}]`;
    console.error(tag, error);
    if (info.componentStack) {
      console.error(`${tag} component stack`, info.componentStack);
    }
    void captureErrorReport({
      kind: 'react',
      message: error.message,
      stack: error.stack,
      area: this.props.areaName,
      componentStack: info.componentStack ?? undefined,
    });
  }

  private handleTryAgain = (): void => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  public render(): ReactNode {
    const { children, areaName } = this.props;
    const { hasError, error } = this.state;

    if (hasError && error) {
      const showDetails = import.meta.env.DEV;
      const rootClass =
        this.props.fallbackClassName ??
        'flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-3 border border-amber-600/40 bg-amber-950/90 p-4 text-center text-amber-50';
      return (
        <div role="alert" className={rootClass}>
          <h2 className="text-sm font-semibold tracking-wide text-amber-200">
            Something went wrong in {areaName}
          </h2>
          <p className="max-w-md text-xs leading-relaxed text-amber-100/90">
            A part of the interface crashed. Your circuit file is still on
            disk if you saved it. You can try rendering this area again or
            reload the application.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={this.handleTryAgain}
              className="rounded bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded border border-amber-500/60 px-3 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-900/50"
            >
              Reload app
            </button>
          </div>
          {showDetails && (
            <details className="mt-1 max-h-40 w-full max-w-lg overflow-auto rounded border border-amber-800/60 bg-black/30 p-2 text-left text-[10px] text-amber-200/80">
              <summary className="cursor-pointer select-none text-amber-300">
                Technical details (dev only)
              </summary>
              <pre className="mt-2 whitespace-pre-wrap break-words font-mono">
                {error.name}: {error.message}
                {error.stack ? `\n\n${error.stack}` : ''}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return children;
  }
}
