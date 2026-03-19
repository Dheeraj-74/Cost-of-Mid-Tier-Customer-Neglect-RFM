import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, PieChart, AlertCircle } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Home size={18} />
          Home
        </NavLink>
        <NavLink to="/segments" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <PieChart size={18} />
          Segments
        </NavLink>
        <NavLink to="/risk" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <AlertCircle size={18} />
          Risk
        </NavLink>
      </nav>
    </aside>
  );
}
