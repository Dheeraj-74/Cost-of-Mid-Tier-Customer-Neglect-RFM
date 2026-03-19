import React from 'react';
import { Target } from 'lucide-react';

export default function Header() {
  return (
    <header className="header">
      <div className="header-logo">
        <Target size={24} className="header-logo-icon" />
        <span>RFM <span style={{color: '#ff4d4f'}}>DASHBOARD</span></span>
      </div>
    </header>
  );
}
