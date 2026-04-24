// ============================================================================
// SKELETON LOADER — Domain 8
// Approximate shape loaders for data tables, cards, and form layouts.
// Pure CSS + React — no external dependencies.
// ============================================================================

import React from 'react';

const shimmer = {
  background: 'linear-gradient(90deg, var(--bg, #f1f5f9) 25%, var(--bg-card, #e2e8f0) 50%, var(--bg, #f1f5f9) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
};

const baseStyle = {
  borderRadius: 8,
  ...shimmer,
};

/**
 * A pulsing rectangular skeleton block
 */
export function SkeletonBlock({ width = '100%', height = 16, style = {} }) {
  return <div style={{ ...baseStyle, width, height, ...style }} />;
}

/**
 * Skeleton for a data table with configurable rows and columns
 */
export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SkeletonBlock width={180} height={20} />
        <SkeletonBlock width={100} height={32} style={{ borderRadius: 6 }} />
      </div>
      <div style={{ padding: 0 }}>
        {/* Header row */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border, #e2e8f0)' }}>
          {Array.from({ length: cols }).map((_, i) => (
            <SkeletonBlock key={i} width={`${100 / cols}%`} height={14} />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: rows }).map((_, ri) => (
          <div key={ri} style={{ display: 'flex', gap: 8, padding: '14px 16px', borderBottom: '1px solid var(--border, #f1f5f9)' }}>
            {Array.from({ length: cols }).map((_, ci) => (
              <SkeletonBlock key={ci} width={`${100 / cols}%`} height={12} style={{ opacity: 0.7 + Math.random() * 0.3 }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for KPI stat cards (Dashboard, Fees summary)
 */
export function SkeletonCards({ count = 4 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))`, gap: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card" style={{ padding: 20 }}>
          <SkeletonBlock width={80} height={12} style={{ marginBottom: 12 }} />
          <SkeletonBlock width={120} height={28} style={{ marginBottom: 8 }} />
          <SkeletonBlock width={60} height={10} />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for a form layout
 */
export function SkeletonForm({ fields = 4 }) {
  return (
    <div className="card" style={{ padding: 24 }}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} style={{ marginBottom: 20 }}>
          <SkeletonBlock width={100} height={12} style={{ marginBottom: 8 }} />
          <SkeletonBlock width="100%" height={38} style={{ borderRadius: 8 }} />
        </div>
      ))}
      <SkeletonBlock width={140} height={40} style={{ borderRadius: 8, marginTop: 8 }} />
    </div>
  );
}

/**
 * Full-page skeleton with card KPIs + table
 */
export function SkeletonPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SkeletonCards count={4} />
      <SkeletonTable rows={8} cols={6} />
    </div>
  );
}

/**
 * Error card with retry button
 */
export function ErrorCard({ message, onRetry }) {
  return (
    <div className="card" style={{
      padding: 40,
      textAlign: 'center',
      borderLeft: '4px solid #ef4444',
    }}>
      <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚠️</div>
      <h3 style={{ color: '#ef4444', marginBottom: 8 }}>Something went wrong</h3>
      <p style={{ color: 'var(--text-light)', marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
        {message || 'We couldn\'t load this data. Please check your connection and try again.'}
      </p>
      {onRetry && (
        <button className="btn btn-primary" onClick={onRetry}>
          ↻ Try Again
        </button>
      )}
    </div>
  );
}

/**
 * Empty state card with icon and action
 */
export function EmptyState({ icon = '📭', title, message, actionLabel, onAction }) {
  return (
    <div className="card" style={{
      padding: 60,
      textAlign: 'center',
      background: 'var(--bg)',
      border: '2px dashed var(--border)',
    }}>
      <div style={{ fontSize: '3rem', marginBottom: 16 }}>{icon}</div>
      <h3 style={{ marginBottom: 8, color: 'var(--text)' }}>{title || 'Nothing here yet'}</h3>
      <p style={{ color: 'var(--text-light)', marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
        {message}
      </p>
      {actionLabel && onAction && (
        <button className="btn btn-primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// Inject shimmer keyframes into the document once
if (typeof document !== 'undefined') {
  const styleId = 'skeleton-shimmer-css';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`;
    document.head.appendChild(style);
  }
}
