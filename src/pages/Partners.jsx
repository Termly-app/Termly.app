import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getFeaturedPartners } from '../data/coreStore';;
import { SchoolIcon, FlagIcon, StarIcon, HomeIcon } from '../components/CommonIcons';
import { Helmet } from 'react-helmet-async';
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
      <Helmet>
        <title>Partner Schools | Termly — Trusted by Schools Across Kenya</title>
        <meta name="description" content="See the forward-thinking institutions across Kenya that trust Termly. Join the community of schools transforming education." />
        <link rel="canonical" href="https://Termly.com/partners" />
      </Helmet>
      <nav style={{ 
        position: 'sticky', top: 0, zIndex: 100, 
        padding: '14px 32px', 
        background: 'rgba(255,255,255,0.85)', 
        backdropFilter: 'blur(16px)', 
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: '#5B3EF5', fontWeight: 700, fontSize: '0.9rem' }}>
          <HomeIcon size={16} /> ← Back to Home
        </Link>
        <Link to="/register" className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.8rem', borderRadius: 100 }}>Get Started</Link>
      </nav>
      <header className="partners-hero">
        <h1 className="hero-title">Our <span className="text-gradient">Partners</span></h1>
        <p className="hero-subtitle">Trusted by forward-thinking institutions across Kenya. Join the community of schools transforming education with Termly.</p>
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
          <p>Join Termly today and get recognized as a leader in educational technology.</p>
          <a href="/register" className="btn btn-primary">Get Started Now</a>
        </div>
      </section>
    </div>
  );
}
