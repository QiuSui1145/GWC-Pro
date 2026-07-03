import React from 'react';

const SettingSectionTitle = ({ title, extra }) => (
  <div className="flex flex-wrap items-center gap-4 mb-6">
    <h3 className="text-lg font-black text-[#ba3f42] tracking-widest whitespace-nowrap">{title}</h3>
    <div className="hidden sm:block flex-1 border-b-2 border-dashed border-[#e6d5b8] min-w-[20px]"></div>
    {extra && <div className="shrink-0 flex items-center gap-2">{extra}</div>}
  </div>
);

export default SettingSectionTitle;
