import React from 'react';

const SettingSlider = ({ label, value, min, max, step, suffix = '', onChange }) => (
  <div className="flex flex-col gap-2 w-full">
    <div className="flex justify-between text-[#ba3f42] font-bold">
      <label className="flex items-center gap-1"><span className="text-sm">✱</span> {label}</label>
      <span className="text-[#4a4036] bg-[#e8decb] px-2 py-0.5 rounded text-sm">{value}{suffix}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} className="w-full h-2 bg-[#d9c5b2] rounded-lg appearance-none cursor-pointer accent-[#ba3f42]" />
  </div>
);

export default SettingSlider;
