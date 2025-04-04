
import React from 'react';

const Logo: React.FC = () => {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-auto">
        <img 
          src="/lovable-uploads/a5328b80-2eec-46bb-8e49-4169ebe223bb.png"
          alt="CEJAM Logo" 
          className="h-full w-auto"
        />
      </div>
      <span className="text-cejam-gray font-medium">Rateio Inteligente</span>
    </div>
  );
};

export default Logo;
