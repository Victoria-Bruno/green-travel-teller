
import React from 'react';
import type { ProduceInfo } from '../services/produceAIService';
import { Leaf, Route, Droplets, ExternalLink, Info, Heart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface ResultsDisplayProps {
  data: ProduceInfo;
  onReset: () => void;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ data, onReset }) => {
  // Impact level calculation
  const getImpactLevel = (co2: number) => {
    if (co2 < 0.3) return { level: 'Low', color: 'text-green-500' };
    if (co2 < 0.7) return { level: 'Medium', color: 'text-amber-500' };
    return { level: 'High', color: 'text-red-500' };
  };
  
  const impactData = getImpactLevel(data.co2Impact);
  
  // Check if we have valid data for the ripening method
  const hasRipeningData = data.ripeningMethod && 
                         data.ripeningMethod !== "Information not available" &&
                         data.ripeningMethod !== "Information not available due to an error.";
                         
  // Check if we have valid alternatives data                
  const hasAlternativesData = data.rawAlternativesText && 
                             data.rawAlternativesText !== "No alternatives available" &&
                             !data.rawAlternativesText.includes("Error generating alternatives");
  
  console.log("ResultsDisplay rendering with data:", data);
  
  return (
    <div className="space-y-6 animate-slide-up">
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-xl text-gray-800">{data.name}</CardTitle>
            <span className="bg-sage-100 text-sage-700 px-2 py-1 rounded-full text-xs font-medium">
              From {data.source}
            </span>
          </div>
          <CardDescription>
            Because you are located in {data.userLocation}, here's some information about this produce:
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-1 p-3 bg-white/50 rounded-xl border border-gray-100">
              <div className="section-title flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Route className="w-3.5 h-3.5" />
                <span>Travel Distance</span>
              </div>
              <p className="text-2xl font-medium text-gray-900">{data.travelDistance.toLocaleString()} km</p>
              <p className="text-xs text-gray-500">From {data.source}</p>
              <div className="flex items-center mt-1 text-xs text-gray-400">
                <Info className="w-3 h-3 mr-1 flex-shrink-0" />
                <span>Distance calculated using Google Maps API</span>
              </div>
            </div>
            
            <div className="space-y-1 p-3 bg-white/50 rounded-xl border border-gray-100">
              <div className="section-title flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Leaf className="w-3.5 h-3.5" />
                <span>CO2 Impact</span>
              </div>
              <p className={`text-2xl font-medium ${impactData.color}`}>
                {data.co2Impact} kg CO<sub>2</sub>
              </p>
              <p className="text-xs text-gray-500">{impactData.level} environmental impact</p>
              <div className="flex items-center mt-1 text-xs text-gray-400">
                <Info className="w-3 h-3 mr-1 flex-shrink-0" />
                <span>Calculated based on distance</span>
              </div>
            </div>
            
            <div className="space-y-1 p-3 bg-white/50 rounded-xl border border-gray-100">
              <div className="section-title flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Droplets className="w-3.5 h-3.5" />
                <span>Ripening</span>
              </div>
              <p className="text-sm font-medium text-gray-700">
                {hasRipeningData ? "Ripening Information Available" : "No Ripening Data"}
              </p>
              <div className="flex items-center mt-1 text-xs text-gray-400">
                <Info className="w-3 h-3 mr-1 flex-shrink-0" />
                <span>{hasRipeningData ? "Method info available below" : "AI data not available"}</span>
              </div>
            </div>
          </div>
          
          {/* Ripening Method - Only show if we have valid data */}
          {hasRipeningData && (
            <div className="mt-6 p-4 bg-white/50 rounded-xl border border-gray-100">
              <h3 className="text-md font-medium text-gray-700 mb-2">Ripening Method Information:</h3>
              <div className="whitespace-pre-wrap text-sm text-gray-600 bg-gray-50 p-3 rounded border border-gray-200 max-h-[200px] overflow-y-auto">
                {data.ripeningMethod}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Sustainable Alternatives Section - Only show if we have valid data */}
      {hasAlternativesData ? (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg text-gray-800">Sustainable Alternatives</CardTitle>
            <CardDescription>
              AI-generated alternatives to {data.name} for your location
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border border-gray-200 text-gray-700 text-sm max-h-[400px] overflow-y-auto">
              {data.rawAlternativesText}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-md bg-gray-50/50">
          <CardHeader>
            <CardTitle className="text-lg text-gray-800">Sustainable Alternatives</CardTitle>
            <CardDescription>
              No AI-generated alternatives available
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="text-center py-6">
              <p className="text-gray-500">
                AI data could not be generated. Please try again or check your Hugging Face API key.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="flex flex-col items-center space-y-3">
        <button
          onClick={onReset}
          className="bg-white hover:bg-gray-50 text-sage-700 py-2 px-4 rounded-xl font-medium text-sm transition-colors duration-200 border border-sage-200"
        >
          Analyze Another Produce
        </button>
        
        <a 
          href="https://www.seasonalfoodguide.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-sage-600 hover:text-sage-800 flex items-center gap-1 transition-colors"
        >
          <span>Learn more about seasonal food guides</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};

export default ResultsDisplay;
