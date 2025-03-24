import React from 'react';
import type { AlternativeOption } from '../services/produceAIService';
import { Leaf, TrendingDown, Heart, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

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
              <span className="font-medium text-lg text-gray-800">{alternative.name}</span>
              <div className="flex items-center text-green-600 text-xs font-medium">
                <TrendingDown className="w-3 h-3 mr-1" />
                <span>{alternative.distanceReduction}% lower emissions</span>
              </div>
            </div>
            
            {alternative.nutritionalSimilarity && (
              <div className="flex items-center text-xs text-purple-600 mt-1 mb-1">
                <Heart className="w-3 h-3 mr-1" />
                <span className="font-medium">Nutritional Profile:</span>
                <span className="ml-1">{alternative.nutritionalSimilarity}</span>
              </div>
            )}
            
            <div className="text-xs text-gray-600 mt-2">
              <div className="flex items-start gap-1.5 mt-0.5">
                <Info className="w-3 h-3 text-sage-600 mt-0.5 flex-shrink-0" />
                <span className="font-medium">Why this is a good alternative:</span>
              </div>
              {alternative.benefits && alternative.benefits.map((benefit, i) => (
                <p key={i} className="flex items-center gap-1.5 mt-1 ml-4">
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
