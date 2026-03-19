import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, PieChart, AlertCircle, TrendingUp, CalendarDays } from 'lucide-react';

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
        <NavLink to="/trends" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <TrendingUp size={18} />
          Trends
        </NavLink>
        <NavLink to="/retention" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <CalendarDays size={18} />
          Retention
        </NavLink>
        <NavLink to="/risk" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <AlertCircle size={18} />
          Risk
        </NavLink>
      </nav>
    </aside>
  );
}
