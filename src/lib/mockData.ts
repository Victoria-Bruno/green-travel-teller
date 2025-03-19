
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

// Geographic distances in km from Amsterdam (approximate)
const distancesFromAmsterdam: Record<string, number> = {
  'netherlands': 0,
  'germany': 400,
  'belgium': 200,
  'france': 500,
  'spain': 1800,
  'italy': 1300,
  'morocco': 2300,
  'peru': 8800,
  'chile': 12000,
  'mexico': 9200,
  'usa': 6200,
  'south africa': 9000,
  'kenya': 7000,
  'china': 8200,
  'india': 7500,
  'australia': 16500
};

// European seasonal produce calendar
const seasonalCalendar: Record<string, number[]> = {
  // Months indexed 0-11 (Jan-Dec) when produce is in season in Europe
  'apple': [0, 1, 2, 8, 9, 10, 11], // Jan-Mar, Sep-Dec
  'pear': [0, 1, 2, 8, 9, 10, 11], // Jan-Mar, Sep-Dec
  'strawberry': [4, 5, 6], // May-Jul
  'blueberry': [6, 7, 8], // Jul-Sep
  'raspberry': [5, 6, 7, 8], // Jun-Sep
  'blackberry': [7, 8, 9], // Aug-Oct
  'cherry': [5, 6], // Jun-Jul
  'plum': [7, 8, 9], // Aug-Oct
  'grape': [8, 9, 10], // Sep-Nov
  'watermelon': [6, 7, 8], // Jul-Sep
  'melon': [6, 7, 8], // Jul-Sep
  'asparagus': [4, 5], // May-Jun
  'broccoli': [5, 6, 7, 8, 9], // Jun-Oct
  'carrot': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // All year
  'potato': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // All year
  'tomato': [6, 7, 8, 9], // Jul-Oct
  'cucumber': [4, 5, 6, 7, 8, 9], // May-Oct
  'lettuce': [4, 5, 6, 7, 8, 9], // May-Oct
  'spinach': [3, 4, 5, 9, 10], // Apr-Jun, Oct-Nov
  'kale': [0, 1, 9, 10, 11], // Jan-Feb, Oct-Dec
  'cabbage': [0, 1, 2, 9, 10, 11], // Jan-Mar, Oct-Dec
  'cauliflower': [3, 4, 5, 9, 10, 11], // Apr-Jun, Oct-Dec
  'beetroot': [0, 9, 10, 11], // Jan, Oct-Dec
  'avocado': [1, 2, 3, 4], // Imported, peak Feb-May
  'banana': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // Imported all year
  'orange': [0, 1, 2, 3, 11], // Jan-Apr, Dec
  'lemon': [0, 1, 2, 3, 11], // Jan-Apr, Dec
  'mango': [4, 5, 6, 7, 8], // Imported, peak May-Sep
  'pineapple': [2, 3, 4, 5, 6], // Imported, peak Mar-Jul
  'onion': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // All year
  'garlic': [7, 8, 9, 10, 11], // Aug-Dec
  'leek': [0, 1, 2, 3, 9, 10, 11], // Jan-Apr, Oct-Dec
  'pepper': [6, 7, 8, 9], // Jul-Oct
  'zucchini': [5, 6, 7, 8, 9], // Jun-Oct
  'eggplant': [6, 7, 8, 9] // Jul-Oct
};

// This function simulates what would normally be an API call to an LLM
export const fetchProduceInfo = async (
  produceName: string,
  sourceLocation: string,
  userLocation: { city: string | null; country: string | null; latitude: number | null; longitude: number | null }
): Promise<ProduceInfo> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Simplified logic - in a real app, this would be an API call to an LLM
  const lowerCaseProduce = produceName.toLowerCase();
  const lowerCaseSource = sourceLocation.toLowerCase();
  
  // Check if it's an out-of-season produce based on European calendar
  const currentMonth = new Date().getMonth();
  const produceMonths = seasonalCalendar[lowerCaseProduce] || [];
  const isOutOfSeason = produceMonths.length > 0 && !produceMonths.includes(currentMonth);
  
  // Calculate travel distance based on known distances or estimate
  let travelDistance = 0;
  
  // Find the closest match in our distance database
  const sourceCountry = Object.keys(distancesFromAmsterdam).find(country => 
    lowerCaseSource.includes(country)
  );
  
  if (sourceCountry) {
    travelDistance = distancesFromAmsterdam[sourceCountry];
  } else {
    // If country not found, make a rough estimate
    const isImported = !['netherlands', 'local', 'regional'].some(term => 
      lowerCaseSource.includes(term)
    );
    
    travelDistance = isImported 
      ? Math.floor(Math.random() * 5000) + 3000 
      : Math.floor(Math.random() * 500) + 100;
  }
  
  // Calculate CO2 impact based on distance (very simplified model)
  // Air freight: ~0.6-0.8 kg CO2 per ton-km
  // Sea freight: ~0.01-0.03 kg CO2 per ton-km
  // Road freight: ~0.05-0.15 kg CO2 per ton-km
  // We'll use a simplified average model here
  const transportFactor = travelDistance > 5000 ? 0.0005 : 0.0002;
  const co2Impact = travelDistance * transportFactor * (Math.random() * 0.3 + 0.85);
  
  // Determine ripening method
  const ripeningMethod = ['banana', 'avocado', 'mango', 'tomato', 'papaya', 'pear'].includes(lowerCaseProduce)
    ? 'Ethylene gas treatment to accelerate ripening after transport.'
    : null;
  
  return {
    name: produceName,
    source: sourceLocation,
    co2Impact: parseFloat(co2Impact.toFixed(2)),
    travelDistance,
    ripeningMethod,
    inSeason: !isOutOfSeason,
    seasonalAlternatives: generateAlternatives(lowerCaseProduce, isOutOfSeason, currentMonth),
    localAlternatives: generateLocalAlternatives(lowerCaseProduce, travelDistance > 800),
  };
};

function generateAlternatives(produce: string, isOutOfSeason: boolean, currentMonth: number): AlternativeOption[] {
  if (!isOutOfSeason) return [];
  
  const alternatives: AlternativeOption[] = [];
  
  // Find in-season produce for the current month
  const inSeasonProduces = Object.entries(seasonalCalendar)
    .filter(([_, months]) => months.includes(currentMonth))
    .map(([name]) => name);
  
  // Specific alternatives based on produce type and current season
  if (['strawberry', 'blueberry', 'raspberry'].includes(produce)) {
    if (currentMonth >= 9 || currentMonth <= 2) { // Fall/Winter
      alternatives.push({
        name: 'Apples',
        co2Impact: 0.3,
        distanceReduction: 85,
        benefits: ['Currently in season in Europe', 'Often locally grown', 'Longer shelf life']
      });
      alternatives.push({
        name: 'Pears',
        co2Impact: 0.25,
        distanceReduction: 90,
        benefits: ['Currently in season in Europe', 'Less refrigeration needed', 'Local varieties available']
      });
    } else if (currentMonth >= 3 && currentMonth <= 5) { // Spring
      alternatives.push({
        name: 'Rhubarb',
        co2Impact: 0.2,
        distanceReduction: 90,
        benefits: ['Spring seasonal produce', 'Often locally grown', 'Can be used in similar recipes']
      });
    }
  } else if (produce === 'asparagus' && (currentMonth < 4 || currentMonth > 5)) {
    alternatives.push({
      name: 'Leeks',
      co2Impact: 0.3,
      distanceReduction: 80,
      benefits: ['Available through winter', 'Similar flavor profile', 'Versatile cooking options']
    });
    alternatives.push({
      name: 'Green Beans',
      co2Impact: 0.4,
      distanceReduction: 70,
      benefits: ['Available in summer', 'More widely grown locally', 'Similar culinary uses']
    });
  } else if (produce === 'watermelon' && (currentMonth < 6 || currentMonth > 8)) {
    if (currentMonth >= 9 || currentMonth <= 2) { // Fall/Winter
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
        benefits: ['Winter seasonal fruit in southern Europe', 'Good vitamin source']
      });
    }
  } else if (produce === 'tomato' && (currentMonth < 6 || currentMonth > 9)) {
    alternatives.push({
      name: 'Canned Tomatoes',
      co2Impact: 0.3,
      distanceReduction: 75,
      benefits: ['Processed during peak season', 'Reduced transportation', 'Extended shelf life']
    });
    if (currentMonth >= 0 && currentMonth <= 2) { // Winter
      alternatives.push({
        name: 'Root Vegetables',
        co2Impact: 0.2,
        distanceReduction: 90,
        benefits: ['Winter seasonal produce', 'Locally stored', 'Nutritious alternative']
      });
    }
  } else {
    // Generic alternatives based on current season
    if (inSeasonProduces.length > 0) {
      // Select up to 2 random in-season alternatives
      const randomAlternatives = inSeasonProduces
        .sort(() => 0.5 - Math.random())
        .slice(0, 2)
        .filter(alt => alt !== produce);
      
      randomAlternatives.forEach(alt => {
        alternatives.push({
          name: alt.charAt(0).toUpperCase() + alt.slice(1),
          co2Impact: 0.2,
          distanceReduction: 85,
          benefits: ['Currently in season in Europe', 'Lower transport emissions', 'Fresher product']
        });
      });
    }
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
      name: 'Community Garden or Farmers Market Produce',
      co2Impact: 0.05,
      distanceReduction: 99,
      benefits: ['Minimal transportation', 'No commercial farming emissions', 'Often uses organic growing methods']
    }
  ];
}
