
import React from 'react';

const ProcessingAnimation: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="flex space-x-2 justify-center items-center">
        <div className="h-4 w-4 bg-cejam-blue rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="h-4 w-4 bg-cejam-blue rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="h-4 w-4 bg-cejam-green rounded-full animate-bounce"></div>
      </div>
      <p className="mt-4 text-lg font-medium">Processando dados...</p>
      <p className="text-sm text-muted-foreground">Isso pode levar alguns instantes</p>
    </div>
  );
};

export default ProcessingAnimation;
