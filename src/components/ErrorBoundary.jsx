import { Component } from 'react';

/**
 * Catches render errors anywhere in the component tree and shows
 * a graceful fallback instead of a blank white screen.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // TODO: send to error reporting service (Sentry, etc.)
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
            <span className="text-3xl">!</span>
          </div>
          <h1 className="text-3xl font-[Outfit] font-extrabold mb-4">Something Went Wrong</h1>
          <p className="text-gray-400 mb-8 max-w-md">
            An unexpected error occurred. Try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-[var(--color-brand-gold)] text-black font-[Outfit] font-bold tracking-wider rounded-sm hover:scale-105 transition-transform"
          >
            REFRESH PAGE
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
