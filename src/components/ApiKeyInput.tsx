
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound } from 'lucide-react';

interface ApiKeyInputProps {
  onApiKeySubmit: (apiKey: string) => void;
  apiKey: string;
}

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ onApiKeySubmit, apiKey }) => {
  const [key, setKey] = useState(apiKey);
  const [isSaved, setIsSaved] = useState(!!apiKey);

  useEffect(() => {
    // When the parent's apiKey changes, update the local state
    setKey(apiKey);
    setIsSaved(!!apiKey);
  }, [apiKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApiKeySubmit(key);
    setIsSaved(true);
    
    // Store in env-like variable that can be accessed by the AI service
    window.localStorage.setItem('VITE_HUGGING_FACE_TOKEN', key);
    
    // Make it available to the current session
    window.dispatchEvent(new CustomEvent('huggingface-token-updated'));
  };

  return (
    <div className="border border-sage-100 rounded-xl p-4 mb-5 bg-white/50">
      <div className="flex items-center mb-3">
        <KeyRound className="w-4 h-4 text-sage-600 mr-2" />
        <h3 className="text-sm font-medium text-gray-700">Hugging Face API Key</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-2">
        <Input
          type="password"
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            setIsSaved(false);
          }}
          placeholder="Enter your Hugging Face API key"
          className="bg-white/80 border-sage-200 text-sm"
        />
        <div className="flex justify-between items-center">
          <p className="text-xs text-gray-500">
            Your API key is stored locally in your browser and never sent to our servers.
          </p>
          <Button 
            type="submit" 
            size="sm"
            variant={isSaved ? "outline" : "default"}
            className={isSaved ? "border-sage-200 text-sage-700" : "bg-sage-600 text-white"}
            disabled={!key || key.length < 10}
          >
            {isSaved ? "Saved" : "Save Key"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ApiKeyInput;
