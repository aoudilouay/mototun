import { Component } from 'react';

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('AppErrorBoundary caught a render error', error, errorInfo);
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 px-6 py-10 text-slate-900">
          <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white/90 p-8 text-center shadow-xl shadow-slate-200/60">
            <div className="mb-5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
              Temporary issue
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">
              The page hit an unexpected error
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              The app shell is still safe to reload. This prevents the blank-screen experience on fragile mobile browsers.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700"
            >
              Reload app
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
