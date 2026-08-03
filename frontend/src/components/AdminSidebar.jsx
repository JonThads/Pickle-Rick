import React from 'react';
import { NavLink } from 'react-router-dom';

/**
 * Admin section nav: "Courts" (add/manage) and "Reports" (revenue) - per
 * the UI mockup's Admin Dashboard comment 1.
 */
export default function AdminSidebar() {
  return (
    <nav className="sidebar">
      <NavLink to="/admin" end className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
        Courts
      </NavLink>
      <NavLink to="/admin/reports" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
        Reports
      </NavLink>
    </nav>
  );
}
