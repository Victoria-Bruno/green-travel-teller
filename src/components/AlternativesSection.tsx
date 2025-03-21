
import React from 'react';
import type { AlternativeOption } from '../services/bertService';
import { Leaf, TrendingDown } from 'lucide-react';

interface AlternativesSectionProps {
  title: string;
  alternatives: AlternativeOption[];
}

const AlternativesSection: React.FC<AlternativesSectionProps> = ({ title, alternatives }) => {
  if (!alternatives || alternatives.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-gray-700 flex items-center gap-1.5">
        <Leaf className="w-4 h-4 text-sage-500" />
        <span>{title}</span>
      </h3>
      
      <div className="space-y-2">
        {alternatives.map((alternative, index) => (
          <div 
            key={index}
            className="bg-white/60 rounded-lg p-3 border border-sage-100 hover:border-sage-200 transition-all"
          >
            <div className="flex justify-between items-start mb-1">
              <span className="font-medium text-gray-800">{alternative.name}</span>
              <div className="flex items-center text-green-600 text-xs font-medium">
                <TrendingDown className="w-3 h-3 mr-1" />
                <span>{alternative.distanceReduction}% emissions</span>
              </div>
            </div>
            
            <div className="text-xs text-gray-600 mt-1">
              {alternative.benefits && alternative.benefits.map((benefit, i) => (
                <p key={i} className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1 h-1 rounded-full bg-sage-400 inline-block flex-shrink-0" />
                  <span>{benefit}</span>
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlternativesSection;
