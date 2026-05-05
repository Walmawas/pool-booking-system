import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error(error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div dir="rtl" lang="ar" className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
          <div className="mx-auto max-w-lg rounded-2xl border border-slate-700 bg-slate-900/80 p-6 text-center">
            <p className="text-lg font-semibold text-gold-300">حدث خطأ غير متوقع</p>
            <p className="mt-2 text-sm text-slate-400">حدّث الصفحة أو راجع وحدة التحكم في المتصفح.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
