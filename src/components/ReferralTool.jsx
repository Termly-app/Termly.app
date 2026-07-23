import { useState } from 'react';
import { sendSchoolInvite } from '../data/coreStore';;;
import { RocketIcon, CheckIcon, ShareIcon } from '../components/CommonIcons';
import './ReferralTool.css';

export default function ReferralTool() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    await sendSchoolInvite(email, name);
    setSent(true);
    setLoading(false);
    setTimeout(() => {
      setSent(false);
      setEmail('');
      setName('');
    }, 3000);
  };

  const shareText = "I'm using Termly to manage my school and it's incredible. You should check it out for your institution: https://Termly-app.vercel.app";
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="referral-tool animate-in">
      <div className="ref-header">
        <RocketIcon size={24} color="var(--primary)" />
        <div className="ref-title-wrap">
          <h3 className="ref-title">Invite a Colleague</h3>
          <p className="ref-sub">Help another principal automate their school.</p>
        </div>
      </div>

      <form className="ref-form" onSubmit={handleInvite}>
        <div className="ref-inputs">
          <input 
            type="text" 
            placeholder="Recipient Name" 
            className="ref-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input 
            type="email" 
            placeholder="Email Address" 
            className="ref-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary ref-btn" disabled={loading || sent}>
          {sent ? <><CheckIcon size={16} /> Sent!</> : 'Send Invite'}
        </button>
      </form>

      <div className="ref-divider">
        <span>or share via</span>
      </div>

      <div className="ref-social">
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost ref-social-btn whatsapp">
          <ShareIcon size={16} />
          WhatsApp
        </a>
      </div>
    </div>
  );
}
