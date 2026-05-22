import React, { ComponentType, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors in child components and displays fallback UI
 * instead of crashing the entire application
 */
class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ERROR BOUNDARY] Caught error:', error);
    console.error('[ERROR BOUNDARY] Component stack:', errorInfo.componentStack);

    this.setState({ errorInfo });

    // Send to error tracking service (Sentry, etc.)
    if (typeof window !== 'undefined' && window.__SENTRY__) {
      window.__SENTRY__.captureException(error, { contexts: { react: errorInfo } });
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            {/* Error Icon */}
            <div className="mb-4 flex justify-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4v2m0 4v2M6.343 3.665c-1.341.519-2.611 1.372-3.653 2.414-2.083 2.083-3.181 4.949-3.181 7.921s1.098 5.838 3.181 7.921c2.083 2.083 4.949 3.181 7.921 3.181s5.838-1.098 7.921-3.181c2.083-2.083 3.181-4.949 3.181-7.921s-1.098-5.838-3.181-7.921c-1.042-1.042-2.312-1.895-3.653-2.414"
                  />
                </svg>
              </div>
            </div>

            {/* Error Message */}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Oops! Something went wrong
            </h1>

            <p className="text-gray-600 mb-4">
              We encountered an unexpected error. Our team has been notified.
            </p>

            {/* Error Details (Development Only) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 text-left">
                <p className="text-xs font-mono text-red-800 break-words">
                  <strong>Error:</strong> {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-700 cursor-pointer font-semibold">
                      Stack Trace
                    </summary>
                    <pre className="mt-2 text-xs text-red-600 overflow-auto whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Reload Page
              </button>
              <a
                href="/"
                className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Go Home
              </a>
            </div>

            {/* Support Message */}
            <p className="text-xs text-gray-500 mt-6">
              If this problem persists, please contact{' '}
              <a href="mailto:support@siteforge.ai" className="text-blue-600 hover:underline">
                support@siteforge.ai
              </a>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
