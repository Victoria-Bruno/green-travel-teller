
import React, { useState } from 'react';
import ProduceForm from '../components/ProduceForm';
import ResultsDisplay from '../components/ResultsDisplay';
import LoadingState from '../components/LoadingState';
import { Leaf } from 'lucide-react';
import { type ProduceInfo, analyzeProduceSustainability } from '../services/produceAIService';
import { toast } from "@/components/ui/use-toast";

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ProduceInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: any) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Analyzing produce sustainability...");
      console.log("Form data:", formData);
      
      const data = await analyzeProduceSustainability(
        formData.produceName,
        formData.sourceLocation,
        formData.userLocation
      );
      
      console.log("Analysis results:", data);
      
      if (data.alternatives.length === 0) {
        toast({
          title: "No Alternatives Found",
          description: "We couldn't find specific alternatives for this produce. Consider searching for a different item.",
          variant: "default",
        });
      }
      
      setResults(data);
    } catch (err) {
      console.error('Error analyzing produce:', err);
      setError('Failed to analyze the produce. Please try again.');
      
      toast({
        title: "Analysis Error",
        description: "There was a problem analyzing your produce. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResults(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sage-50 to-white">
      <div className="container px-4 py-8 md:py-16 mx-auto max-w-4xl">
        <header className="text-center mb-8 md:mb-12">
          <div className="inline-flex items-center justify-center bg-sage-100 rounded-full p-2 mb-4">
            <Leaf className="w-5 h-5 text-sage-600" />
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-2">
            Sustainable Produce Tracker
          </h1>
          <p className="text-gray-600 max-w-lg mx-auto">
            Analyze the environmental impact of your produce and discover more sustainable alternatives.
          </p>
        </header>

        <main className="space-y-8">
          {!results && !isLoading && (
            <ProduceForm onSubmit={handleSubmit} isLoading={isLoading} />
          )}
          
          {isLoading && <LoadingState />}
          
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-center">
              {error}
            </div>
          )}
          
          {results && !isLoading && (
            <ResultsDisplay data={results} onReset={handleReset} />
          )}
        </main>
        
        <footer className="mt-12 text-center text-gray-500 text-xs">
          <p>Making sustainable choices easier, one produce at a time.</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
