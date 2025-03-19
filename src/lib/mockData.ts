
export interface ProduceInfo {
  name: string;
  source: string;
  co2Impact: number; // kg of CO2 per kg of produce
  travelDistance: number; // km
  ripeningMethod: string | null;
  inSeason: boolean;
  seasonalAlternatives: AlternativeOption[];
  localAlternatives: AlternativeOption[];
}

export interface AlternativeOption {
  name: string;
  co2Impact: number;
  distanceReduction: number;
  benefits: string[];
}

// This function simulates what would normally be an API call to an LLM
export const fetchProduceInfo = async (
  produceName: string,
  sourceLocation: string,
  userLocation: { city: string | null; country: string | null }
): Promise<ProduceInfo> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Simplified logic - in a real app, this would be an API call to an LLM
  const lowerCaseProduce = produceName.toLowerCase();
  
  // Check if it's an out-of-season produce
  const isOutOfSeason = [
    'strawberry', 'blueberry', 'raspberry', 'watermelon', 'asparagus'
  ].includes(lowerCaseProduce) && 
  (new Date().getMonth() < 4 || new Date().getMonth() > 8);
  
  // Check if it's imported from far away
  const isImported = 
    sourceLocation.toLowerCase().includes('spain') ||
    sourceLocation.toLowerCase().includes('mexico') ||
    sourceLocation.toLowerCase().includes('peru') ||
    sourceLocation.toLowerCase().includes('chile');
  
  // Calculate mock travel distance based on source
  const travelDistance = isImported 
    ? Math.floor(Math.random() * 5000) + 3000 
    : Math.floor(Math.random() * 500) + 100;
  
  // Calculate mock CO2 impact based on distance
  const co2Impact = travelDistance * 0.0002 * (Math.random() * 0.5 + 0.8);
  
  // Determine ripening method
  const ripeningMethod = ['banana', 'avocado', 'mango', 'tomato'].includes(lowerCaseProduce)
    ? 'Ethylene gas treatment to accelerate ripening after transport.'
    : null;
  
  return {
    name: produceName,
    source: sourceLocation,
    co2Impact: parseFloat(co2Impact.toFixed(2)),
    travelDistance,
    ripeningMethod,
    inSeason: !isOutOfSeason,
    seasonalAlternatives: generateAlternatives(lowerCaseProduce, isOutOfSeason),
    localAlternatives: generateLocalAlternatives(lowerCaseProduce, isImported),
  };
};

function generateAlternatives(produce: string, isOutOfSeason: boolean): AlternativeOption[] {
  if (!isOutOfSeason) return [];
  
  const alternatives: AlternativeOption[] = [];
  
  // Specific alternatives based on produce type
  if (['strawberry', 'blueberry', 'raspberry'].includes(produce)) {
    alternatives.push({
      name: 'Apples',
      co2Impact: 0.3,
      distanceReduction: 85,
      benefits: ['Currently in season', 'Often locally grown', 'Longer shelf life']
    });
    alternatives.push({
      name: 'Pears',
      co2Impact: 0.25,
      distanceReduction: 90,
      benefits: ['Currently in season', 'Less refrigeration needed', 'Local varieties available']
    });
  } else if (produce === 'asparagus') {
    alternatives.push({
      name: 'Broccoli',
      co2Impact: 0.4,
      distanceReduction: 75,
      benefits: ['Year-round local availability', 'Similar nutritional profile', 'Versatile cooking options']
    });
    alternatives.push({
      name: 'Green Beans',
      co2Impact: 0.45,
      distanceReduction: 70,
      benefits: ['More widely grown locally', 'Similar culinary uses']
    });
  } else if (produce === 'watermelon') {
    alternatives.push({
      name: 'Winter Squash',
      co2Impact: 0.2,
      distanceReduction: 90,
      benefits: ['In season during colder months', 'Long storage life', 'Locally grown']
    });
    alternatives.push({
      name: 'Citrus Fruits',
      co2Impact: 0.5,
      distanceReduction: 50,
      benefits: ['Winter seasonal fruit', 'Good vitamin source']
    });
  } else {
    // Generic alternatives
    alternatives.push({
      name: 'Seasonal Root Vegetables',
      co2Impact: 0.2,
      distanceReduction: 90,
      benefits: ['Currently in season', 'Locally grown', 'Long storage life']
    });
  }
  
  return alternatives;
}

function generateLocalAlternatives(produce: string, isImported: boolean): AlternativeOption[] {
  if (!isImported) return [];
  
  return [
    {
      name: `Local ${produce.charAt(0).toUpperCase() + produce.slice(1)} (when available)`,
      co2Impact: 0.15,
      distanceReduction: 95,
      benefits: ['Drastically reduced transportation emissions', 'Fresher product', 'Supports local economy']
    },
    {
      name: 'Community Garden Produce',
      co2Impact: 0.05,
      distanceReduction: 99,
      benefits: ['Minimal transportation', 'No commercial farming emissions', 'Often organic growing methods']
    }
  ];
}
