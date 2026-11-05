import React from 'react';
import { Menu, UserCircle, LogOut } from 'lucide-react';
export default function Topbar({ user, onLogout }) {
  return (
    <header className="topbar">
      <Menu size={22} />
      <div className="top-brand">
        AD<span>v</span>TECH <small>| SHUTTLE TRACKER</small>
      </div>
      <div className="profile">
        <UserCircle size={25} />{' '}
        {user.role === 'admin'
          ? 'Shuttle Administrator'
          : user.role === 'driver'
            ? 'Driver'
            : 'Passenger'}{' '}
        <button onClick={onLogout} title="Sign out">
          <LogOut size={17} />
        </button>
      </div>
    </header>
  );
}
