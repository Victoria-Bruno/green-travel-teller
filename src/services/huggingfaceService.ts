
import { pipeline, env } from '@huggingface/transformers';
import { toast } from "@/components/ui/use-toast";
import type { ProduceInfo, AlternativeOption } from '../services/openaiService';

// Configure transformers.js to not use local models (always download from hub)
env.allowLocalModels = false;
env.useBrowserCache = true;

// Convert distance in km to CO2 emissions (simplified formula)
const distanceToEmissions = (distance: number): number => {
  // Simplified CO2 calculation - approximately 0.1kg CO2 per 100km of transportation
  return parseFloat((distance * 0.001).toFixed(2));
};

// Calculate if a produce is in season based on month (Northern Hemisphere calendar)
const isInSeason = (produce: string, month: number): boolean => {
  const seasonalCalendar: Record<string, number[]> = {
    // Common European produce seasonal calendar
    // 0 = January, 11 = December
    "apple": [0, 1, 2, 8, 9, 10, 11],
    "avocado": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // Mostly imported
    "banana": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // Mostly imported
    "broccoli": [5, 6, 7, 8, 9, 10],
    "carrot": [0, 5, 6, 7, 8, 9, 10, 11],
    "strawberry": [4, 5, 6, 7],
    "tomato": [5, 6, 7, 8, 9],
    "potato": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    "onion": [0, 1, 2, 3, 4, 9, 10, 11],
    "pepper": [6, 7, 8, 9],
    "cucumber": [4, 5, 6, 7, 8, 9],
    "lettuce": [4, 5, 6, 7, 8, 9],
    "spinach": [3, 4, 5, 8, 9, 10],
    "orange": [0, 1, 2, 3, 11],
    "pear": [0, 8, 9, 10, 11],
    "grape": [8, 9, 10],
    "kiwi": [0, 1, 2, 3, 4, 10, 11],
    "mango": [3, 4, 5, 6, 7, 8], // Mostly imported
    "pineapple": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // Mostly imported
    "blueberry": [5, 6, 7, 8],
    "cauliflower": [0, 1, 2, 3, 9, 10, 11],
    "leek": [0, 1, 2, 3, 9, 10, 11],
    "cabbage": [0, 1, 2, 9, 10, 11],
    "asparagus": [3, 4, 5],
    "zucchini": [5, 6, 7, 8, 9],
    "eggplant": [6, 7, 8, 9],
    "raspberry": [5, 6, 7, 8],
    "plum": [7, 8, 9],
    "peach": [6, 7, 8],
    "cherry": [5, 6],
  };

  // Default to generic seasonal produce if not found
  const produceLower = produce.toLowerCase();
  let seasonMonths: number[] = [];
  
  // Find the produce in the calendar (including partial matches)
  for (const [key, months] of Object.entries(seasonalCalendar)) {
    if (key.includes(produceLower) || produceLower.includes(key)) {
      seasonMonths = months;
      break;
    }
  }
  
  // If no specific match, use a fallback based on general types
  if (seasonMonths.length === 0) {
    // Summer fruits and vegetables
    if (["berry", "melon", "summer"].some(term => produceLower.includes(term))) {
      seasonMonths = [5, 6, 7, 8];
    }
    // Winter vegetables
    else if (["winter", "root"].some(term => produceLower.includes(term))) {
      seasonMonths = [0, 1, 2, 10, 11];
    }
    // Year-round basics
    else {
      seasonMonths = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    }
  }

  return seasonMonths.includes(month);
};

// Determine common ripening methods for different produce
const getRipeningMethod = (produce: string): string | null => {
  const produceLower = produce.toLowerCase();
  
  if (["banana", "avocado", "mango", "papaya", "kiwi"].some(fruit => produceLower.includes(fruit))) {
    return "Ethylene gas treatment is commonly used to ripen this produce after harvest.";
  }
  
  if (["tomato", "pepper", "eggplant"].some(veg => produceLower.includes(veg))) {
    return "Often harvested green and ripened with ethylene or temperature control.";
  }
  
  return null; // Natural ripening
};

// Estimate distance between two locations
const estimateDistance = async (source: string, destination: string): Promise<number> => {
  try {
    // Simplified distance calculator using pre-defined distances
    const distanceMap: Record<string, Record<string, number>> = {
      // Distances from major European cities/countries to other locations (in km)
      "netherlands": {
        "spain": 1800,
        "morocco": 2300,
        "italy": 1300,
        "france": 800,
        "germany": 400,
        "belgium": 150,
        "portugal": 2000,
        "greece": 2200,
        "turkey": 3000,
        "uk": 500,
        "ireland": 900,
        "poland": 1100,
        "czech": 900,
        "austria": 1000,
        "switzerland": 800,
        "mexico": 9000,
        "usa": 7500,
        "canada": 6500,
        "brazil": 9500,
        "argentina": 11500,
        "chile": 12000,
        "peru": 10500,
        "colombia": 9000,
        "ecuador": 9500,
        "costa rica": 9200,
        "china": 7800,
        "india": 6500,
        "thailand": 9000,
        "vietnam": 9300,
        "indonesia": 11000,
        "malaysia": 10500,
        "philippines": 10800,
        "australia": 16000,
        "new zealand": 18000,
        "south africa": 9500,
        "kenya": 7000,
        "egypt": 3500,
        "israel": 3600,
      }
    };

    // Normalize location strings
    const normalizedSource = source.toLowerCase();
    const normalizedDestination = destination.toLowerCase();
    
    // Default base distance if exact match not found
    let baseDistance = 1000;
    
    // Check if we have the distance in our map
    for (const [baseCountry, distances] of Object.entries(distanceMap)) {
      // For destination-to-source lookup
      if (normalizedDestination.includes(baseCountry)) {
        for (const [country, distance] of Object.entries(distances)) {
          if (normalizedSource.includes(country)) {
            return distance;
          }
        }
      }
      
      // For source-to-destination lookup
      if (normalizedSource.includes(baseCountry)) {
        for (const [country, distance] of Object.entries(distances)) {
          if (normalizedDestination.includes(country)) {
            return distance;
          }
        }
      }
    }
    
    // If no match, provide an educated guess based on keywords
    const continentDistances = {
      "europe": { "europe": 1000, "africa": 3000, "asia": 8000, "north america": 8000, "south america": 10000, "australia": 15000 },
      "africa": { "europe": 3000, "africa": 2000, "asia": 7000, "north america": 10000, "south america": 8000, "australia": 12000 },
      "asia": { "europe": 8000, "africa": 7000, "asia": 3000, "north america": 12000, "south america": 15000, "australia": 8000 },
      "north america": { "europe": 8000, "africa": 10000, "asia": 12000, "north america": 2000, "south america": 5000, "australia": 14000 },
      "south america": { "europe": 10000, "africa": 8000, "asia": 15000, "north america": 5000, "south america": 2000, "australia": 12000 },
      "australia": { "europe": 15000, "africa": 12000, "asia": 8000, "north america": 14000, "south america": 12000, "australia": 1000 }
    };

    // Helper to detect continent from location string
    const getContinent = (loc: string): string => {
      const continents = {
        "europe": ["europe", "spain", "france", "italy", "germany", "uk", "poland", "netherlands", "belgium", "sweden", "norway", "finland", "denmark", "ireland", "portugal", "greece", "austria", "switzerland", "czech"],
        "africa": ["africa", "morocco", "egypt", "algeria", "tunisia", "south africa", "kenya", "ethiopia", "nigeria", "ghana"],
        "asia": ["asia", "china", "japan", "india", "thailand", "vietnam", "indonesia", "malaysia", "philippines", "singapore", "taiwan", "korea", "israel", "turkey", "saudi"],
        "north america": ["north america", "usa", "united states", "canada", "mexico", "costa rica", "cuba", "jamaica", "dominican"],
        "south america": ["south america", "brazil", "argentina", "chile", "peru", "colombia", "ecuador", "venezuela", "bolivia"],
        "australia": ["australia", "new zealand", "oceania"]
      };

      for (const [continent, keywords] of Object.entries(continents)) {
        if (keywords.some(keyword => loc.includes(keyword))) {
          return continent;
        }
      }
      
      return "europe"; // Default to Europe if unknown
    };

    const sourceContinent = getContinent(normalizedSource);
    const destContinent = getContinent(normalizedDestination);
    
    return continentDistances[sourceContinent as keyof typeof continentDistances][destContinent as keyof typeof continentDistances[typeof sourceContinent]];
  } catch (error) {
    console.error("Error estimating distance:", error);
    return 5000; // Default fallback distance
  }
};

// Get seasonal alternatives for a produce
const getSeasonalAlternatives = (produce: string, currentMonth: number): AlternativeOption[] => {
  // Map of common out-of-season produce to seasonal alternatives
  const alternativesMap: Record<string, { name: string, co2Impact: number, benefits: string[] }[]> = {
    // Summer fruits alternatives for winter
    "strawberry": [
      { name: "Apple", co2Impact: 0.3, benefits: ["Locally grown in many regions", "Can be stored for months", "Similar use in desserts"] },
      { name: "Pear", co2Impact: 0.3, benefits: ["Sweet alternative", "Often locally available", "Lower water footprint"] }
    ],
    "cherry": [
      { name: "Orange", co2Impact: 0.3, benefits: ["Winter fruit with plenty of vitamin C", "Can be used in many recipes", "European-grown options available"] },
      { name: "Frozen berries", co2Impact: 0.2, benefits: ["Picked in season and frozen", "Retains nutrients", "Lower carbon footprint than fresh imports"] }
    ],
    // Winter vegetables alternatives for summer
    "carrot": [
      { name: "Cucumber", co2Impact: 0.2, benefits: ["Fresh and crunchy alternative", "High water content", "Easy to grow locally in summer"] },
      { name: "Summer squash", co2Impact: 0.2, benefits: ["Versatile ingredient", "Grows abundantly in summer", "Low environmental impact"] }
    ],
    // Generic alternatives based on product type
    "fruit": [
      { name: "Seasonal local fruits", co2Impact: 0.2, benefits: ["Adjusted to current season", "Lower transportation emissions", "Often tastes better"] },
      { name: "Preserved fruits", co2Impact: 0.3, benefits: ["Made when produce is in season", "Reduced food waste", "Available year-round"] }
    ],
    "vegetable": [
      { name: "Seasonal local vegetables", co2Impact: 0.2, benefits: ["Freshly harvested", "Lower transportation footprint", "Higher nutrient content"] },
      { name: "Frozen vegetables", co2Impact: 0.3, benefits: ["Processed at peak freshness", "Reduced food waste", "Long shelf life"] }
    ],
    // Default alternatives for various common out-of-season imports
    "avocado": [
      { name: "Hummus", co2Impact: 0.2, benefits: ["Similar creamy texture", "Plant-based protein", "Can be locally produced"] },
      { name: "Nut butters", co2Impact: 0.3, benefits: ["Rich in healthy fats", "Long shelf life", "Lower water footprint"] }
    ],
    "banana": [
      { name: "Local apples", co2Impact: 0.2, benefits: ["Convenient snack", "Available in many regions", "Can be stored for months"] },
      { name: "Seasonal berries", co2Impact: 0.2, benefits: ["Similar nutritional benefits", "Often locally available in summer", "Lower food miles"] }
    ],
    "tomato": [
      { name: "Canned tomatoes", co2Impact: 0.3, benefits: ["Processed at peak ripeness", "Lower carbon footprint in winter", "Often better flavor than off-season"] },
      { name: "Beetroot", co2Impact: 0.2, benefits: ["Similar color and texture in salads", "Stores well through winter", "Locally grown in many regions"] }
    ],
    "cucumber": [
      { name: "Celery", co2Impact: 0.2, benefits: ["Similar crunch and freshness", "Grows well in cooler weather", "Versatile ingredient"] },
      { name: "Winter radishes", co2Impact: 0.2, benefits: ["Crunchy texture", "Grows well in cooler temperatures", "Can be stored for months"] }
    ]
  };

  const produceLower = produce.toLowerCase();
  let alternatives: { name: string, co2Impact: number, benefits: string[] }[] = [];
  
  // First try to find direct match
  for (const [key, alts] of Object.entries(alternativesMap)) {
    if (produceLower.includes(key) || key.includes(produceLower)) {
      alternatives = alts;
      break;
    }
  }
  
  // If no direct match, categorize as fruit or vegetable
  if (alternatives.length === 0) {
    const fruits = ["apple", "berry", "melon", "peach", "pear", "grape", "orange", "lemon", "lime", "plum", "kiwi", "mango", "cherry"];
    const vegetables = ["lettuce", "spinach", "kale", "broccoli", "cabbage", "onion", "potato", "carrot", "pepper", "eggplant", "zucchini", "garlic", "leek"];
    
    if (fruits.some(fruit => produceLower.includes(fruit))) {
      alternatives = alternativesMap["fruit"];
    } else if (vegetables.some(veg => produceLower.includes(veg))) {
      alternatives = alternativesMap["vegetable"];
    } else {
      // Default to vegetables as fallback
      alternatives = alternativesMap["vegetable"];
    }
  }
  
  return alternatives.map(alt => ({
    ...alt,
    distanceReduction: Math.floor(Math.random() * 50) + 50 // 50-99% reduction
  }));
};

// Get local alternatives for a produce
const getLocalAlternatives = (produce: string, location: string): AlternativeOption[] => {
  // Map of common imported produce to local alternatives
  const localAlternativesMap: Record<string, { name: string, co2Impact: number, benefits: string[] }[]> = {
    "avocado": [
      { name: "Local peas for spread", co2Impact: 0.1, benefits: ["Similar creamy texture when prepared", "Can be grown locally", "Much lower water usage"] },
      { name: "Sunflower seed spread", co2Impact: 0.2, benefits: ["Rich in healthy fats", "European-grown option", "Long shelf life"] }
    ],
    "banana": [
      { name: "Local apples", co2Impact: 0.1, benefits: ["Convenient snack", "Widely grown across Europe", "Much lower transport emissions"] },
      { name: "Local pears", co2Impact: 0.1, benefits: ["Sweet alternative", "Available in multiple varieties", "Significantly reduced food miles"] }
    ],
    "mango": [
      { name: "Local peaches (in summer)", co2Impact: 0.2, benefits: ["Similar juicy texture", "Sweet flavor profile", "Grows well in southern Europe"] },
      { name: "Local plums", co2Impact: 0.2, benefits: ["Sweet and tangy alternative", "Various varieties available", "Lower water footprint"] }
    ],
    "pineapple": [
      { name: "Local apples with cinnamon", co2Impact: 0.1, benefits: ["Sweet and spicy combination", "Can be used in similar dishes", "Year-round availability"] },
      { name: "Rhubarb (in season)", co2Impact: 0.2, benefits: ["Tangy alternative", "Grows easily in European climate", "Low-maintenance crop"] }
    ],
    "orange": [
      { name: "Local berries (in summer)", co2Impact: 0.1, benefits: ["High vitamin content", "Grows throughout Europe", "No long-distance shipping"] },
      { name: "Local apples for juice", co2Impact: 0.1, benefits: ["Year-round availability", "Can be processed similarly", "Lower carbon footprint"] }
    ],
    "exotic": [
      { name: "European-grown alternatives", co2Impact: 0.2, benefits: ["Adapted to local climate", "Reduced transportation emissions", "Often fresher"] },
      { name: "Preserved local produce", co2Impact: 0.3, benefits: ["Extended shelf life", "Made when produce is in season", "Supports local farming"] }
    ]
  };

  const produceLower = produce.toLowerCase();
  let alternatives: { name: string, co2Impact: number, benefits: string[] }[] = [];
  
  // Try to find direct match
  for (const [key, alts] of Object.entries(localAlternativesMap)) {
    if (produceLower.includes(key) || key.includes(produceLower)) {
      alternatives = alts;
      break;
    }
  }
  
  // If no direct match and seems to be exotic fruit
  if (alternatives.length === 0 && ["exotic", "tropical", "import"].some(term => produceLower.includes(term))) {
    alternatives = localAlternativesMap["exotic"];
  }
  
  // If still no match, create generic local alternatives
  if (alternatives.length === 0) {
    alternatives = [
      { 
        name: `Local seasonal ${produce.endsWith('s') ? produce : produce + 's'}`, 
        co2Impact: 0.2, 
        benefits: ["Grown within your region", "Significantly lower transport emissions", "Fresher with better taste"]
      },
      { 
        name: `${produceLower.includes("fruit") ? "Local stone fruits" : "Local leafy greens"}`, 
        co2Impact: 0.1, 
        benefits: ["Adapted to local growing conditions", "Supports local economy", "Higher nutritional value when fresh"]
      }
    ];
  }
  
  return alternatives.map(alt => ({
    ...alt,
    distanceReduction: Math.floor(Math.random() * 40) + 60 // 60-99% reduction
  }));
};

// Simulates functionality that would normally be handled by the OpenAI API
export const analyzeProduceSustainabilityOffline = async (
  produceName: string,
  sourceLocation: string,
  userLocation: { city: string | null; country: string | null; latitude: number | null; longitude: number | null; }
): Promise<ProduceInfo> => {
  try {
    // For progress tracking
    const progressToast = toast({
      title: "Analyzing produce data...",
      description: "Calculating sustainability metrics...",
    });

    const userLocationString = userLocation.city || userLocation.country || "Netherlands";
    
    // Step 1: Estimate travel distance
    const travelDistance = await estimateDistance(sourceLocation, userLocationString);
    
    // Step 2: Calculate CO2 impact
    const co2Impact = distanceToEmissions(travelDistance);
    
    // Step 3: Get ripening method
    const ripeningMethod = getRipeningMethod(produceName);
    
    // Step 4: Check if in season
    const currentMonth = new Date().getMonth();
    const inSeason = isInSeason(produceName, currentMonth);
    
    // Step 5: Get seasonal alternatives
    const seasonalAlternatives = getSeasonalAlternatives(produceName, currentMonth);
    
    // Step 6: Get local alternatives
    const localAlternatives = getLocalAlternatives(produceName, userLocationString);

    // Create the final result object
    const result: ProduceInfo = {
      name: produceName,
      source: sourceLocation,
      co2Impact,
      travelDistance,
      ripeningMethod,
      inSeason,
      seasonalAlternatives,
      localAlternatives
    };

    // Dismiss the progress toast
    progressToast.dismiss();
    
    toast({
      title: "Analysis complete",
      description: "Sustainability data calculated successfully.",
      variant: "default",
    });
    
    return result;
    
  } catch (error) {
    console.error("Error analyzing produce sustainability:", error);
    toast({
      title: "Analysis Failed",
      description: error instanceof Error ? error.message : "Failed to analyze produce sustainability",
      variant: "destructive",
    });
    throw error;
  }
};
