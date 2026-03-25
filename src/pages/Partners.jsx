import { useState, useEffect } from 'react';
import { getFeaturedPartners } from '../data/store';
import { SchoolIcon, FlagIcon, StarIcon } from '../components/CommonIcons';
import './Partners.css';

export default function Partners() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await getFeaturedPartners();
      setPartners(data);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="partners-container animate-in">
      <header className="partners-hero">
        <h1 className="hero-title">Our <span className="text-gradient">Partners</span></h1>
        <p className="hero-subtitle">Trusted by over 500+ leading institutions across Kenya. Join the community of schools transforming education.</p>
      </header>

      {loading ? (
        <div className="partners-loading">
          <div className="spinner"></div>
          <p>Loading our partner network...</p>
        </div>
      ) : (
        <div className="partners-grid">
          {partners.map(p => (
            <div key={p.id} className="partner-card">
              <div className="partner-image-wrap">
                <img src={p.image} alt={p.name} />
                <div className="partner-overlay">
                  <div className="partner-since">Partner since {p.since}</div>
                </div>
              </div>
              <div className="partner-body">
                <div className="partner-header">
                  <h3 className="partner-name">{p.name}</h3>
                  <div className="partner-rating">
                    <StarIcon size={14} color="#F59E0B" />
                    <span>{p.rating}</span>
                  </div>
                </div>
                <div className="partner-loc">
                  <FlagIcon size={12} />
                  <span>{p.location}</span>
                </div>
                <p className="partner-desc">{p.description}</p>
                <div className="partner-badges">
                  <span className="p-badge">CBC Certified</span>
                  <span className="p-badge">Digital-First</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="partners-cta">
        <div className="cta-glass">
          <SchoolIcon size={48} color="var(--primary)" />
          <h2>Want your school featured here?</h2>
          <p>Join ShuleSoft today and get recognized as a leader in educational technology.</p>
          <a href="/register" className="btn btn-primary">Get Started Now</a>
        </div>
      </section>
    </div>
  );
}
