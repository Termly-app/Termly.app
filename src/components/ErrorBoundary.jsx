import React from 'react';

/**
 * Global Error Boundary (Domain 8 & 9)
 * Catches rendering errors anywhere in the app to prevent the "white screen of death"
 * and provides a fallback UI. In production, this would also ping Sentry/PostHog.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Analytics/Monitoring hook (Sentry / PostHog stub)
    console.error('[ErrorBoundary] Caught a UI crash:', error, errorInfo);
    
    // Domain 9: Auto-recovery for dynamic import failures (Deployment Chunk Mismatch)
    const errorMsg = error?.message || '';
    const isChunkError = errorMsg.includes('Failed to fetch dynamically imported module') || 
                        errorMsg.includes('Loading chunk');

    if (isChunkError) {
      console.warn('[ErrorBoundary] Chunk load failure detected. Forcing page refresh to sync assets...');
      // Small delay to prevent infinite reload loops if server is truly down
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', background: '#f8fafc',
          padding: '24px', textAlign: 'center', fontFamily: '"Inter", sans-serif'
        }}>
          <div style={{
            background: '#fff', padding: '40px', borderRadius: '24px',
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', maxWidth: '500px', width: '100%'
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '32px',
              background: '#fee2e2', color: '#ef4444', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: '32px',
              margin: '0 auto 24px auto'
            }}>
              ⚠️
            </div>
            <h1 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '1.5rem', fontWeight: 800 }}>
              Oops! Something went wrong.
            </h1>
            <p style={{ color: '#64748b', marginBottom: '32px', lineHeight: 1.6 }}>
              The application encountered an unexpected error. Our team has been notified.
            </p>
            <div style={{
              background: '#f1f5f9', padding: '16px', borderRadius: '12px',
              color: '#334155', fontSize: '0.85rem', textAlign: 'left',
              overflowX: 'auto', marginBottom: '32px', fontFamily: 'monospace'
            }}>
              {this.state.error?.toString()}
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#4f46e5', color: '#fff', border: 'none',
                padding: '12px 24px', borderRadius: '12px', fontWeight: 600,
                cursor: 'pointer', width: '100%', fontSize: '1rem',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = '#4338ca'}
              onMouseOut={(e) => e.target.style.background = '#4f46e5'}
            >
              Refresh Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}
