import React from 'react';

const Placeholder = ({ title }) => {
  return (
    <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">{title}</h1>
      <p className="text-slate-500">This page is under construction.</p>
    </div>
  );
};

export default Placeholder;