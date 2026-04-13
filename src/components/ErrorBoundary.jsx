import React, { Component } from 'react';
import { AlertIcon, RefreshIcon } from './Common/Icons';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Check if it's a network-like error
      const isNetworkError = this.state.error?.message?.toLowerCase().includes('failed to fetch') || 
                             this.state.error?.message?.toLowerCase().includes('network');

      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '400px', padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', margin: '20px'
        }}>
          <AlertIcon size={48} style={{ color: '#ef4444', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
            {isNetworkError ? 'Connection Lost' : 'Something went wrong'}
          </h2>
          <p style={{ color: 'var(--text-light)', maxWidth: '400px', marginBottom: '24px' }}>
            {isNetworkError 
              ? 'We could not reach the server. Please check your internet connection and try again.' 
              : 'An unexpected error occurred while loading this module. Our team has been notified.'}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}
          >
            <RefreshIcon size={18} /> Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
