
import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload } from "lucide-react";

interface FileUploadProps {
  label: string;
  description: string;
  onFileSelected: (file: File) => void;
  selectedFile: File | null;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  label, 
  description, 
  onFileSelected, 
  selectedFile 
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelected(e.target.files[0]);
    }
  };

  return (
    <Card className="border-dashed border-2 p-4 hover:bg-muted/50 transition-colors cursor-pointer" onClick={handleClick}>
      <input
        type="file"
        ref={inputRef}
        className="hidden"
        accept=".xlsx, .xls"
        onChange={handleFileChange}
      />
      <div className="flex flex-col items-center justify-center gap-2 py-4">
        <Upload className="h-10 w-10 text-cejam-blue" />
        <div className="text-center">
          <p className="font-medium text-lg">{label}</p>
          <p className="text-muted-foreground text-sm">{description}</p>
          {selectedFile ? (
            <p className="text-sm mt-2 text-cejam-green font-medium">
              Arquivo selecionado: {selectedFile.name}
            </p>
          ) : (
            <Button 
              variant="outline" 
              className="mt-2 border-cejam-blue text-cejam-blue hover:bg-cejam-blue hover:text-white"
            >
              Selecionar arquivo
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default FileUpload;
