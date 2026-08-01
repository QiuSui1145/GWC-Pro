import React, { useState, useEffect } from 'react';

const TypewriterPreview = ({ speed, text, textStyle }) => {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed(''); let i = 0;
    const timer = setInterval(() => { setDisplayed(text.slice(0, i + 1)); i++; if (i >= text.length) clearInterval(timer); }, speed);
    return () => clearInterval(timer);
  }, [speed, text]);
  return (
    <div style={textStyle} className="whitespace-pre-wrap flex-1 break-words">
      {displayed}<span className="inline-block w-2.5 h-5 ml-1 bg-white/70 animate-pulse align-middle rounded-sm"></span>
    </div>
  );
};

export default TypewriterPreview;
