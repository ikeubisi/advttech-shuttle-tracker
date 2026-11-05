import React from 'react';
export default function StatusButtons({ data, onStatus }) {
  return (
      <div className="status-buttons">
        {[
          ['On Route', 'OK'],
          ['At Stop', '>'],
          ['Delayed', '!'],
          ['Out of Service', 'X'],
        ].map(([s, icon]) => (
          <button
            className={
              (data?.status === s ? 'selected ' : '') + s.toLowerCase().replaceAll(' ', '-')
            }
            key={s}
            onClick={() => onStatus(s)}
          >
            <strong>{icon}</strong>
            {s}
          </button>
        ))}
      </div>

  );
}
