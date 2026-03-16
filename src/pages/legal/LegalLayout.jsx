import PremiumLayout from '../../components/PremiumLayout';

export default function LegalLayout({ title, lastUpdated, children }) {
  return (
    <PremiumLayout>
      <div className="legal-container">
        <header className="legal-header reveal">
          <div className="eyebrow">Legal</div>
          <h1>{title}</h1>
          <p className="last-updated">Last Updated: {lastUpdated}</p>
        </header>
        <div className="legal-content reveal reveal-delay-1">
          {children}
        </div>
      </div>
    </PremiumLayout>
  );
}
