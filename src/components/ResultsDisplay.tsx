
import React from 'react';
import type { ProduceInfo } from '../services/produceAIService';
import { Leaf, Route, Droplets, AlertCircle, ExternalLink, Info, Heart } from 'lucide-react';
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
  
  // Check if we have any alternatives to display
  const hasAlternatives = data.alternatives && data.alternatives.length > 0;
  
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
              {!data.isNaturalRipening ? (
                <>
                  <p className="text-sm font-medium text-gray-700">Artificial Ripening</p>
                  <p className="text-xs text-gray-500">Uses post-harvest treatments</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-700">Natural Ripening</p>
                  <p className="text-xs text-gray-500">No artificial process detected</p>
                </>
              )}
              <div className="flex items-center mt-1 text-xs text-gray-400">
                <Info className="w-3 h-3 mr-1 flex-shrink-0" />
                <span>Method: {data.ripeningMethod}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 grid md:grid-cols-4 gap-4">
            <div className="p-3 bg-white/50 rounded-xl border border-gray-100">
              <div className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                <Heart className="w-3.5 h-3.5 mr-1.5 text-pink-500" />
                Calories
              </div>
              <p className="text-xl font-medium">{data.nutritionalInfo.calories} kcal</p>
            </div>
            
            <div className="p-3 bg-white/50 rounded-xl border border-gray-100">
              <div className="text-sm font-medium text-gray-700 mb-1">Protein</div>
              <p className="text-xl font-medium">{data.nutritionalInfo.protein}g</p>
            </div>
            
            <div className="p-3 bg-white/50 rounded-xl border border-gray-100">
              <div className="text-sm font-medium text-gray-700 mb-1">Carbs</div>
              <p className="text-xl font-medium">{data.nutritionalInfo.carbs}g</p>
            </div>
            
            <div className="p-3 bg-white/50 rounded-xl border border-gray-100">
              <div className="text-sm font-medium text-gray-700 mb-1">Main Vitamin</div>
              <p className="text-xl font-medium">{data.nutritionalInfo.primaryVitamin}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {hasAlternatives && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg text-gray-800">More Sustainable Alternatives</CardTitle>
            <CardDescription>
              These alternatives provide similar nutritional benefits with a lower environmental impact.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              {data.alternatives.map((alternative, index) => (
                <div 
                  key={index}
                  className="bg-white rounded-lg p-4 border border-sage-100 hover:border-sage-200 transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-lg text-gray-800">{alternative.name}</span>
                    <div className="bg-green-50 text-green-600 text-xs font-medium px-2 py-1 rounded-full">
                      {alternative.distanceReduction}% lower emissions
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">
                    {alternative.sustainabilityReason}
                  </p>
                  
                  <div className="flex items-center gap-2 text-xs text-purple-600 mb-2">
                    <Heart className="w-3 h-3" />
                    <span>{alternative.nutritionalSimilarity}</span>
                  </div>
                  
                  <div className="text-xs text-gray-500 flex flex-wrap gap-2 mt-2">
                    {alternative.benefits.map((benefit, i) => (
                      <span key={i} className="bg-sage-50 text-sage-700 px-2 py-1 rounded-full">
                        {benefit}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
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
