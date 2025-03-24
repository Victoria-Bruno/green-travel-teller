
import React from 'react';
import type { ProduceInfo } from '../services/produceAIService';
import { Leaf, Route, Droplets, AlertCircle, ExternalLink, Info } from 'lucide-react';
import AlternativesSection from './AlternativesSection';

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
  
  // Check if we have any alternatives to display
  const hasAlternatives = (
    (data.seasonalAlternatives && data.seasonalAlternatives.length > 0) || 
    (data.localAlternatives && data.localAlternatives.length > 0)
  );
  
  return (
    <div className="space-y-6 animate-slide-up">
      <div className="glass-panel p-6">
        <div className="text-gray-600 mb-4 text-sm">
          Because you are located in {data.userLocation} and the {data.name} is imported from {data.source}, 
          here are some more sustainable choices that provide similar nutritional benefits:
        </div>
        
        <div className="flex justify-between items-start mb-4">
          <h2 className="font-semibold text-xl text-gray-800">{data.name}</h2>
          <span className="pill-tag">
            {data.inSeason ? 'In Season' : 'Out of Season'}
          </span>
        </div>
        
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-1 p-3 bg-white/50 rounded-xl">
            <div className="section-title flex items-center gap-1.5">
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
          
          <div className="space-y-1 p-3 bg-white/50 rounded-xl">
            <div className="section-title flex items-center gap-1.5">
              <Leaf className="w-3.5 h-3.5" />
              <span>CO2 Impact</span>
            </div>
            <p className={`text-2xl font-medium ${impactData.color}`}>
              {data.co2Impact} kg CO<sub>2</sub>
            </p>
            <p className="text-xs text-gray-500">{impactData.level} environmental impact</p>
            <div className="flex items-center mt-1 text-xs text-gray-400">
              <Info className="w-3 h-3 mr-1 flex-shrink-0" />
              <span>Calculated using AI analysis</span>
            </div>
          </div>
          
          <div className="space-y-1 p-3 bg-white/50 rounded-xl">
            <div className="section-title flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5" />
              <span>Ripening</span>
            </div>
            {data.ripeningMethod ? (
              <>
                <p className="text-sm font-medium text-gray-700">Artificial Ripening</p>
                <p className="text-xs text-gray-500">Uses post-harvest treatments</p>
                <div className="flex items-center mt-1 text-xs text-gray-400">
                  <Info className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span>Determined by AI analysis</span>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700">Natural Ripening</p>
                <p className="text-xs text-gray-500">No artificial process detected</p>
                <div className="flex items-center mt-1 text-xs text-gray-400">
                  <Info className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span>Determined by AI analysis</span>
                </div>
              </>
            )}
          </div>
        </div>
        
        {data.ripeningMethod && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-700">{data.ripeningMethod}</p>
            </div>
          </div>
        )}
      </div>
      
      {hasAlternatives && (
        <div className="glass-panel p-6">
          <h3 className="font-semibold text-lg text-gray-800 mb-4">More Sustainable Alternatives</h3>
          <div className="text-xs text-gray-500 mb-4">
            Alternatives are ranked based on nutritional similarity (70%), locality (20%), and environmental impact (10%).
          </div>
          
          {data.seasonalAlternatives && data.seasonalAlternatives.length > 0 && (
            <div className="mb-6">
              <AlternativesSection 
                title="Seasonal Options" 
                alternatives={data.seasonalAlternatives} 
              />
            </div>
          )}
          
          {data.localAlternatives && data.localAlternatives.length > 0 && (
            <div>
              <AlternativesSection 
                title="Local Options" 
                alternatives={data.localAlternatives} 
              />
            </div>
          )}
        </div>
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
