
import React from 'react';

const Logo: React.FC = () => {
  return (
    <div className="flex items-center gap-2">
      <div className="font-bold text-2xl bg-gradient-to-r from-cejam-blue to-cejam-green bg-clip-text text-transparent">
        CEJAM
      </div>
      <span className="text-cejam-gray font-medium">Rateio Inteligente</span>
    </div>
  );
};

export default Logo;
