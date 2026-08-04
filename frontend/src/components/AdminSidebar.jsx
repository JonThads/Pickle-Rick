import React from 'react';
import { NavLink } from 'react-router-dom';

/**
 * Admin section nav: "Courts" (add/manage), "Reports" (revenue), and
 * "Profile" (account settings) - per the UI mockup's Admin Dashboard
 * sidebar.
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
      <NavLink to="/profile" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
        Profile
      </NavLink>
    </nav>
  );
}
