import React from 'react';

const SettingToggle = ({ label, value, onChange }) => (
  <div className="flex flex-col gap-2">
    <label className="text-[#ba3f42] font-bold flex items-center gap-1"><span className="text-sm">✱</span> {label}</label>
    <div className="flex bg-[#e8decb] rounded-full p-1 w-max shadow-inner">
      <button onClick={() => onChange(true)} className={`px-6 py-1.5 rounded-full text-sm font-bold transition-all ${value ? 'bg-[#ba3f42] text-white shadow-md' : 'text-[#7a6b5d] hover:bg-white/50'}`}>ON</button>
      <button onClick={() => onChange(false)} className={`px-6 py-1.5 rounded-full text-sm font-bold transition-all ${!value ? 'bg-[#ba3f42] text-white shadow-md' : 'text-[#7a6b5d] hover:bg-white/50'}`}>OFF</button>
    </div>
  </div>
);

export default SettingToggle;
