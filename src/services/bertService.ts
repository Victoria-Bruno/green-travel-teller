
import { pipeline, env } from '@huggingface/transformers';
import { toast } from "@/components/ui/use-toast";
import { calculateDistance } from './googleMapsService';

// Configure transformers.js to use browser cache
env.allowLocalModels = false;
env.useBrowserCache = true;

// Define types
export interface ProduceInfo {
  name: string;
  source: string;
  co2Impact: number;
  travelDistance: number;
  ripeningMethod: string | null;
  inSeason: boolean;
  seasonalAlternatives: AlternativeOption[];
  localAlternatives: AlternativeOption[];
  userLocation: string;
}

export interface AlternativeOption {
  name: string;
  co2Impact: number;
  distanceReduction: number;
  benefits: string[];
  nutritionalSimilarity?: string;
}

// Nutrition and sustainability data structure
interface FoodData {
  name: string;
  foodGroup: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    keyNutrients: string[];
  };
  sustainability: {
    co2PerKg: number;
    waterUsage: number;
    landUse: number;
    transportEmissions: number;
    growingRegions: string[];
  };
  seasonality: {
    northern: string[];
    southern: string[];
    tropical: boolean;
  };
}

// Feature-based database of common foods
const foodDatabase: FoodData[] = [
  {
    name: "Banana",
    foodGroup: "Fruit",
    nutrition: {
      calories: 89,
      protein: 1.1,
      carbs: 22.8,
      fat: 0.3,
      fiber: 2.6,
      keyNutrients: ["Potassium", "Vitamin B6", "Vitamin C"]
    },
    sustainability: {
      co2PerKg: 0.9,
      waterUsage: 790,
      landUse: 1.9,
      transportEmissions: 0.48,
      growingRegions: ["Central America", "South America", "Southeast Asia", "Africa"]
    },
    seasonality: {
      northern: ["All year (imported)"],
      southern: ["All year (imported)"],
      tropical: true
    }
  },
  {
    name: "Apple",
    foodGroup: "Fruit",
    nutrition: {
      calories: 52,
      protein: 0.3,
      carbs: 13.8,
      fat: 0.2,
      fiber: 2.4,
      keyNutrients: ["Vitamin C", "Potassium", "Antioxidants"]
    },
    sustainability: {
      co2PerKg: 0.4,
      waterUsage: 70,
      landUse: 0.6,
      transportEmissions: 0.1,
      growingRegions: ["Europe", "North America", "China", "Southern Hemisphere"]
    },
    seasonality: {
      northern: ["August", "September", "October", "November", "December"],
      southern: ["February", "March", "April", "May", "June"],
      tropical: false
    }
  },
  {
    name: "Pear",
    foodGroup: "Fruit",
    nutrition: {
      calories: 57,
      protein: 0.4,
      carbs: 15.2,
      fat: 0.1,
      fiber: 3.1,
      keyNutrients: ["Vitamin C", "Vitamin K", "Copper"]
    },
    sustainability: {
      co2PerKg: 0.3,
      waterUsage: 85,
      landUse: 0.4,
      transportEmissions: 0.1,
      growingRegions: ["Europe", "North America", "China"]
    },
    seasonality: {
      northern: ["August", "September", "October", "November", "December"],
      southern: ["February", "March", "April", "May"],
      tropical: false
    }
  },
  {
    name: "Avocado",
    foodGroup: "Fruit",
    nutrition: {
      calories: 160,
      protein: 2,
      carbs: 8.5,
      fat: 14.7,
      fiber: 6.7,
      keyNutrients: ["Vitamin E", "Vitamin K", "Folate", "Potassium"]
    },
    sustainability: {
      co2PerKg: 2.5,
      waterUsage: 2000,
      landUse: 2.1,
      transportEmissions: 0.9,
      growingRegions: ["Mexico", "California", "Peru", "Chile", "Spain"]
    },
    seasonality: {
      northern: ["All year (imported)"],
      southern: ["All year (imported)"],
      tropical: true
    }
  },
  {
    name: "Strawberry",
    foodGroup: "Berry",
    nutrition: {
      calories: 32,
      protein: 0.7,
      carbs: 7.7,
      fat: 0.3,
      fiber: 2,
      keyNutrients: ["Vitamin C", "Manganese", "Folate", "Antioxidants"]
    },
    sustainability: {
      co2PerKg: 1.1,
      waterUsage: 300,
      landUse: 0.3,
      transportEmissions: 0.2,
      growingRegions: ["Europe", "North America", "Mediterranean"]
    },
    seasonality: {
      northern: ["May", "June", "July"],
      southern: ["November", "December", "January"],
      tropical: false
    }
  },
  {
    name: "Broccoli",
    foodGroup: "Vegetable",
    nutrition: {
      calories: 34,
      protein: 2.8,
      carbs: 6.6,
      fat: 0.4,
      fiber: 2.6,
      keyNutrients: ["Vitamin C", "Vitamin K", "Folate", "Fiber"]
    },
    sustainability: {
      co2PerKg: 0.4,
      waterUsage: 250,
      landUse: 0.3,
      transportEmissions: 0.15,
      growingRegions: ["Europe", "North America", "China"]
    },
    seasonality: {
      northern: ["June", "July", "August", "September", "October"],
      southern: ["December", "January", "February", "March", "April"],
      tropical: false
    }
  },
  {
    name: "Tomato",
    foodGroup: "Vegetable",
    nutrition: {
      calories: 18,
      protein: 0.9,
      carbs: 3.9,
      fat: 0.2,
      fiber: 1.2,
      keyNutrients: ["Vitamin C", "Vitamin K", "Potassium", "Lycopene"]
    },
    sustainability: {
      co2PerKg: 1.4,
      waterUsage: 180,
      landUse: 0.8,
      transportEmissions: 0.2,
      growingRegions: ["Mediterranean", "North America", "China", "Greenhouse globally"]
    },
    seasonality: {
      northern: ["July", "August", "September"],
      southern: ["January", "February", "March"],
      tropical: false
    }
  },
  {
    name: "Oats",
    foodGroup: "Grain",
    nutrition: {
      calories: 389,
      protein: 16.9,
      carbs: 66.3,
      fat: 6.9,
      fiber: 10.6,
      keyNutrients: ["Iron", "Zinc", "Magnesium", "B Vitamins"]
    },
    sustainability: {
      co2PerKg: 0.5,
      waterUsage: 490,
      landUse: 1.5,
      transportEmissions: 0.1,
      growingRegions: ["Europe", "North America", "Russia", "Australia"]
    },
    seasonality: {
      northern: ["All year (stored)"],
      southern: ["All year (stored)"],
      tropical: false
    }
  },
  {
    name: "Lentils",
    foodGroup: "Legume",
    nutrition: {
      calories: 116,
      protein: 9,
      carbs: 20,
      fat: 0.4,
      fiber: 7.9,
      keyNutrients: ["Iron", "Folate", "Manganese"]
    },
    sustainability: {
      co2PerKg: 0.9,
      waterUsage: 500,
      landUse: 3.2,
      transportEmissions: 0.1,
      growingRegions: ["India", "Canada", "Turkey", "Australia"]
    },
    seasonality: {
      northern: ["All year (stored)"],
      southern: ["All year (stored)"],
      tropical: false
    }
  },
  {
    name: "Sweet Potato",
    foodGroup: "Root Vegetable",
    nutrition: {
      calories: 86,
      protein: 1.6,
      carbs: 20.1,
      fat: 0.1,
      fiber: 3,
      keyNutrients: ["Vitamin A", "Vitamin C", "Potassium"]
    },
    sustainability: {
      co2PerKg: 0.3,
      waterUsage: 400,
      landUse: 0.6,
      transportEmissions: 0.1,
      growingRegions: ["Africa", "Asia", "North America", "South America"]
    },
    seasonality: {
      northern: ["September", "October", "November", "December"],
      southern: ["March", "April", "May", "June"],
      tropical: true
    }
  },
  {
    name: "Spinach",
    foodGroup: "Leafy Green",
    nutrition: {
      calories: 23,
      protein: 2.9,
      carbs: 3.6,
      fat: 0.4,
      fiber: 2.2,
      keyNutrients: ["Vitamin K", "Vitamin A", "Folate", "Iron"]
    },
    sustainability: {
      co2PerKg: 0.3,
      waterUsage: 150,
      landUse: 0.2,
      transportEmissions: 0.1,
      growingRegions: ["Europe", "North America", "China"]
    },
    seasonality: {
      northern: ["April", "May", "June", "September", "October"],
      southern: ["October", "November", "December", "March", "April"],
      tropical: false
    }
  },
  {
    name: "Pineapple",
    foodGroup: "Fruit",
    nutrition: {
      calories: 50,
      protein: 0.5,
      carbs: 13.1,
      fat: 0.1,
      fiber: 1.4,
      keyNutrients: ["Vitamin C", "Manganese", "Bromelain"]
    },
    sustainability: {
      co2PerKg: 1.2,
      waterUsage: 255,
      landUse: 1.5,
      transportEmissions: 0.6,
      growingRegions: ["Costa Rica", "Philippines", "Brazil", "Thailand"]
    },
    seasonality: {
      northern: ["All year (imported)"],
      southern: ["All year (imported)"],
      tropical: true
    }
  }
];

// Initialize model
let bertModel: any = null;
let isModelLoading = false;

// Load BERT model - using a simpler, more reliable model
const loadBertModel = async () => {
  if (bertModel) return bertModel;
  
  if (isModelLoading) {
    // Wait for model to finish loading if already in progress
    while (isModelLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return bertModel;
  }
  
  try {
    isModelLoading = true;
    toast({
      title: "Loading AI Model",
      description: "This may take a moment...",
    });
    
    // Use a reliable model for zero-shot classification
    bertModel = await pipeline(
      'text-classification',
      'Xenova/distilbert-base-uncased-finetuned-sst-2-english'
    );
    
    isModelLoading = false;
    return bertModel;
  } catch (error) {
    console.error('Error loading BERT model:', error);
    isModelLoading = false;
    toast({
      title: "Model Loading Error",
      description: "Could not load AI model. Using feature-based analysis.",
      variant: "destructive",
    });
    
    // If we can't load the model, create a simple mock model for fallback
    bertModel = {
      async __call__(text: string) {
        console.log("Using fallback feature-based analysis with query:", text);
        // Simple fallback - return positive for relevant questions
        if (text.toLowerCase().includes('sustainable') || 
            text.toLowerCase().includes('local') || 
            text.toLowerCase().includes('alternative')) {
          return [{ label: 'POSITIVE', score: 0.9 }];
        }
        return [{ label: 'NEGATIVE', score: 0.6 }];
      }
    };
    
    return bertModel;
  }
};

// Get month name from number
const getMonthName = (month: number): string => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month];
};

// Find food in the database
const findFoodInDatabase = (produceName: string): FoodData | null => {
  const normalizedName = produceName.toLowerCase().trim();
  
  // Try exact match first
  const exactMatch = foodDatabase.find(food => 
    food.name.toLowerCase() === normalizedName
  );
  
  if (exactMatch) return exactMatch;
  
  // Try partial match
  const partialMatch = foodDatabase.find(food => 
    food.name.toLowerCase().includes(normalizedName) || 
    normalizedName.includes(food.name.toLowerCase())
  );
  
  return partialMatch || null;
};

// Get hemisphere based on location
const getHemisphere = (userLocation: string): 'northern' | 'southern' | 'tropical' => {
  const northernCountries = [
    'united states', 'canada', 'uk', 'united kingdom', 'germany', 'france', 'italy', 
    'spain', 'netherlands', 'belgium', 'poland', 'russia', 'japan', 'china', 'korea'
  ];
  
  const southernCountries = [
    'australia', 'new zealand', 'argentina', 'chile', 'south africa', 
    'uruguay', 'brazil', 'peru'
  ];
  
  const tropicalCountries = [
    'mexico', 'india', 'thailand', 'vietnam', 'philippines', 'indonesia', 
    'malaysia', 'costa rica', 'colombia', 'ecuador'
  ];
  
  const normalizedLocation = userLocation.toLowerCase();
  
  if (northernCountries.some(country => normalizedLocation.includes(country))) {
    return 'northern';
  }
  
  if (southernCountries.some(country => normalizedLocation.includes(country))) {
    return 'southern';
  }
  
  if (tropicalCountries.some(country => normalizedLocation.includes(country))) {
    return 'tropical';
  }
  
  // Default to northern hemisphere if can't determine
  return 'northern';
};

// Calculate similarity score between two foods based on nutritional profile
const calculateNutritionalSimilarity = (food1: FoodData, food2: FoodData): number => {
  // Simple Euclidean distance on normalized values
  const caloriesDiff = Math.abs(food1.nutrition.calories - food2.nutrition.calories) / 400; // Normalize by max typical calories
  const proteinDiff = Math.abs(food1.nutrition.protein - food2.nutrition.protein) / 20; // Normalize by max typical protein
  const carbsDiff = Math.abs(food1.nutrition.carbs - food2.nutrition.carbs) / 70; // Normalize by max typical carbs
  const fatDiff = Math.abs(food1.nutrition.fat - food2.nutrition.fat) / 15; // Normalize by max typical fat
  const fiberDiff = Math.abs(food1.nutrition.fiber - food2.nutrition.fiber) / 10; // Normalize by max typical fiber
  
  // Calculate Euclidean distance
  const distance = Math.sqrt(
    Math.pow(caloriesDiff, 2) + 
    Math.pow(proteinDiff, 2) + 
    Math.pow(carbsDiff, 2) + 
    Math.pow(fatDiff, 2) + 
    Math.pow(fiberDiff, 2)
  );
  
  // Convert distance to similarity score (0-1)
  return Math.max(0, 1 - distance);
};

// Calculate sustainability score based on location
const calculateSustainabilityScore = (
  food: FoodData, 
  userLocation: string, 
  sourceLocation: string,
  travelDistance: number
): number => {
  // Base CO2 impact
  let score = 1 - (food.sustainability.co2PerKg / 5); // Normalize by max typical CO2 (5 kg CO2/kg)
  
  // Adjust for water usage
  score += 1 - (food.sustainability.waterUsage / 2000); // Normalize by max typical water usage (2000 L/kg)
  
  // Adjust for land use
  score += 1 - (food.sustainability.landUse / 5); // Normalize by max typical land use
  
  // Adjust for transportation
  const hemisphere = getHemisphere(userLocation);
  const currentMonth = new Date().getMonth();
  const currentMonthName = getMonthName(currentMonth);
  
  // Check if in season in user's hemisphere
  const inSeason = food.seasonality[hemisphere].includes(currentMonthName) || 
                  food.seasonality[hemisphere].includes("All year");
  
  // Local availability boost
  if (inSeason) {
    score += 0.5;
  }
  
  // Transportation penalty for long distances
  if (travelDistance > 5000) {
    score -= 0.5;
  } else if (travelDistance > 1000) {
    score -= 0.3;
  } else if (travelDistance > 500) {
    score -= 0.1;
  }
  
  // Normalize final score to 0-1 range
  return Math.max(0, Math.min(1, score / 3));
};

// Determine if a produce is in season
const determineIfInSeason = async (produceName: string, userLocation: string): Promise<boolean> => {
  try {
    const foodData = findFoodInDatabase(produceName);
    if (!foodData) return true; // Default if not found
    
    const hemisphere = getHemisphere(userLocation);
    const currentMonth = new Date().getMonth();
    const currentMonthName = getMonthName(currentMonth);
    
    // Check if in season in user's hemisphere
    return foodData.seasonality[hemisphere].includes(currentMonthName) || 
           foodData.seasonality[hemisphere].includes("All year");
  } catch (error) {
    console.error('Error determining if in season:', error);
    return true; // Default to true if there's an error
  }
};

// Determine ripening method for imported produce
const determineRipeningMethod = async (produceName: string, sourceLocation: string, userLocation: string): Promise<string | null> => {
  try {
    const foodData = findFoodInDatabase(produceName);
    if (!foodData) return null;
    
    // Check if the produce is tropical and being imported to non-tropical regions
    const hemisphere = getHemisphere(userLocation);
    const sourceHemisphere = getHemisphere(sourceLocation);
    
    if (foodData.seasonality.tropical && hemisphere !== 'tropical') {
      return `Likely uses post-harvest ripening techniques when imported from ${sourceLocation} to ${userLocation}`;
    }
    
    // Check for long-distance transport of certain produce types
    if (['Banana', 'Avocado', 'Mango', 'Pineapple'].includes(foodData.name) && 
        hemisphere !== sourceHemisphere) {
      return `Often harvested unripe and artificially ripened when imported from ${sourceLocation} to ${userLocation}`;
    }
    
    return null;
  } catch (error) {
    console.error('Error determining ripening method:', error);
    return null;
  }
};

// Calculate CO2 impact based on distance, produce type, and database info
const calculateCO2Impact = (distance: number, produceName: string): number => {
  const foodData = findFoodInDatabase(produceName);
  
  if (foodData) {
    // Use the database CO2 values and adjust for distance
    const baseCO2 = foodData.sustainability.co2PerKg;
    const transportCO2 = (distance / 1000) * foodData.sustainability.transportEmissions;
    
    return parseFloat((baseCO2 + transportCO2).toFixed(2));
  }
  
  // Fallback calculation if food not found in database
  // Determine likely transportation method based on distance and produce type
  let emissionFactor;
  
  // Emission factors for different transportation methods (kg CO2 per kg-km)
  const emissionFactors = {
    air_freight: 0.00025,
    road_short: 0.00010,
    road_long: 0.00015,
    sea_freight: 0.00003,
    local_transport: 0.00005
  };
  
  if (distance > 5000) {
    // Long international distances, likely air freight for perishables
    if (["berry", "strawberry", "raspberry", "avocado", "mango", "papaya", "asparagus"].some(
      term => produceName.toLowerCase().includes(term))) {
      emissionFactor = emissionFactors.air_freight;
    } else {
      // Non-perishables over long distances typically go by sea
      emissionFactor = emissionFactors.sea_freight;
    }
  } else if (distance > 1000) {
    // Medium distances by road
    emissionFactor = emissionFactors.road_long;
  } else {
    // Short distances
    emissionFactor = emissionFactors.road_short;
  }
  
  // Additional emissions from production and refrigeration
  const productionEmissions = ["avocado", "asparagus", "berries"].some(type => 
    produceName.toLowerCase().includes(type)) ? 0.2 : 0.1;
  
  // Calculate total emissions
  const transportTotal = distance * emissionFactor;
  const total = transportTotal + productionEmissions;
  
  // Return rounded value
  return parseFloat(total.toFixed(2));
};

// Find similar foods using feature-based similarity
const findSimilarFoods = (
  produceName: string,
  userLocation: string,
  sourceLocation: string,
  travelDistance: number,
  count: number = 3
): AlternativeOption[] => {
  const foodData = findFoodInDatabase(produceName);
  if (!foodData) {
    console.log("Food not found in database:", produceName);
    return [];
  }
  
  console.log("Found food data:", foodData);
  
  // Calculate similarity scores for all foods
  const similarityScores = foodDatabase
    .filter(food => food.name !== foodData.name) // Exclude the same food
    .map(food => {
      const nutritionalSimilarity = calculateNutritionalSimilarity(foodData, food);
      const sustainabilityScore = calculateSustainabilityScore(food, userLocation, sourceLocation, travelDistance);
      
      // Overall similarity - prioritize sustainability but consider nutrition
      const overallScore = (sustainabilityScore * 0.7) + (nutritionalSimilarity * 0.3);
      
      return {
        food,
        nutritionalSimilarity,
        sustainabilityScore,
        overallScore
      };
    });
  
  // Sort by overall score and take top N
  const topAlternatives = similarityScores
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, count);
  
  console.log("Top alternatives found:", topAlternatives);
  
  // Convert to AlternativeOption format
  return topAlternatives.map(alt => {
    const co2Impact = calculateCO2Impact(travelDistance / 2, alt.food.name); // Estimate lower distance
    const distanceReduction = Math.round((1 - (co2Impact / foodData.sustainability.co2PerKg)) * 100);
    
    // Generate tailored nutritional comparison
    let nutritionalComparison = "";
    if (alt.nutritionalSimilarity > 0.8) {
      nutritionalComparison = `Very similar nutritional profile to ${foodData.name}`;
    } else if (alt.nutritionalSimilarity > 0.6) {
      nutritionalComparison = `Similar key nutrients like ${alt.food.nutrition.keyNutrients.slice(0, 2).join(", ")}`;
    } else {
      const betterNutrients = alt.food.nutrition.keyNutrients.filter(
        nutrient => !foodData.nutrition.keyNutrients.includes(nutrient)
      );
      nutritionalComparison = betterNutrients.length > 0 
        ? `Contains ${betterNutrients.slice(0, 2).join(", ")} not found in ${foodData.name}`
        : `Different but complementary nutritional profile`;
    }
    
    // Generate sustainability benefits
    const benefits = [];
    
    // Check if it's more local
    const hemisphere = getHemisphere(userLocation);
    const currentMonth = new Date().getMonth();
    const currentMonthName = getMonthName(currentMonth);
    
    if (alt.food.seasonality[hemisphere].includes(currentMonthName)) {
      benefits.push(`Currently in season in ${userLocation}`);
    }
    
    // Check CO2 difference
    if (alt.food.sustainability.co2PerKg < foodData.sustainability.co2PerKg) {
      benefits.push(`Lower carbon footprint (${alt.food.sustainability.co2PerKg} kg CO₂e/kg vs ${foodData.sustainability.co2PerKg} kg CO₂e/kg)`);
    }
    
    // Check water usage
    if (alt.food.sustainability.waterUsage < foodData.sustainability.waterUsage) {
      benefits.push(`Uses ${Math.round((1 - alt.food.sustainability.waterUsage / foodData.sustainability.waterUsage) * 100)}% less water to produce`);
    }
    
    // Add special benefit about local production if applicable
    if (!foodData.growingRegions.some(region => userLocation.includes(region)) && 
        alt.food.sustainability.growingRegions.some(region => userLocation.includes(region))) {
      benefits.push(`Can be grown locally in ${userLocation} region`);
    }
    
    // Ensure we have at least one benefit
    if (benefits.length === 0) {
      benefits.push(`More easily available locally than imported ${foodData.name}`);
    }
    
    return {
      name: alt.food.name,
      co2Impact,
      distanceReduction: Math.max(20, distanceReduction), // Ensure at least 20% reduction
      nutritionalSimilarity: nutritionalComparison,
      benefits
    };
  });
};

// Generate seasonal and local alternatives using feature-based similarity
const generateAlternatives = async (
  produceName: string,
  co2Impact: number,
  travelDistance: number,
  sourceLocation: string,
  userLocation: string
): Promise<AlternativeOption[]> => {
  // Use feature-based similarity to find alternatives
  const alternatives = findSimilarFoods(
    produceName,
    userLocation,
    sourceLocation,
    travelDistance,
    3 // Get top 3 alternatives
  );
  
  console.log("Generated alternatives:", alternatives);
  
  // Ensure we have at least one alternative
  if (alternatives.length === 0) {
    // Find most similar food group if we can't find specific alternatives
    const foodData = findFoodInDatabase(produceName);
    if (foodData) {
      const foodGroup = foodData.foodGroup;
      const sameFoodGroup = foodDatabase.filter(food => 
        food.name !== produceName && food.foodGroup === foodGroup
      );
      
      if (sameFoodGroup.length > 0) {
        const randomFood = sameFoodGroup[Math.floor(Math.random() * sameFoodGroup.length)];
        return [{
          name: randomFood.name,
          co2Impact: co2Impact * 0.3,
          distanceReduction: 75,
          nutritionalSimilarity: `Similar ${foodGroup.toLowerCase()} with comparable nutrients`,
          benefits: [
            `More sustainable ${foodGroup.toLowerCase()} alternative`,
            "Lower transportation emissions when locally sourced",
            `Contains similar key nutrients like ${randomFood.nutrition.keyNutrients.slice(0, 2).join(", ")}`
          ]
        }];
      }
    }
    
    // Ultimate fallback
    return [{
      name: "Local seasonal produce",
      co2Impact: co2Impact * 0.4,
      distanceReduction: 75,
      benefits: [
        "Reduced transportation emissions",
        "Generally fresher with higher nutritional value",
        "Supports local food systems"
      ]
    }];
  }
  
  return alternatives;
};

// Main analysis function
export const analyzeProduceSustainability = async (
  produceName: string,
  sourceLocation: string,
  userLocation: { city: string | null; country: string | null; latitude: number | null; longitude: number | null; }
): Promise<ProduceInfo> => {
  try {
    // Show progress
    toast({
      title: "Analyzing produce data...",
      description: "Using feature-based similarity to find sustainable alternatives...",
    });

    // Get user location string for display
    const userLocationString = userLocation.city && userLocation.country 
      ? `${userLocation.city}, ${userLocation.country}`
      : userLocation.city || userLocation.country || "your location";
    
    // Calculate travel distance
    toast({
      title: "Calculating distance",
      description: `Determining travel distance from ${sourceLocation} to ${userLocationString}...`,
    });
    
    // Get user coordinates
    let userCoords;
    try {
      if (userLocation.latitude && userLocation.longitude) {
        userCoords = { lat: userLocation.latitude, lng: userLocation.longitude };
      } else {
        throw new Error("Location coordinates not provided");
      }
    } catch (error) {
      toast({
        title: "Location Error",
        description: "Unable to determine your location. Distance calculations may be approximate.",
        variant: "destructive",
      });
      // Use location string as fallback
      userCoords = userLocationString;
    }
    
    const travelDistance = await calculateDistance(sourceLocation, userCoords);
    
    // Determine if produce is in season based on user location
    const inSeason = await determineIfInSeason(produceName, userLocationString);
    
    // Determine ripening method with user location context
    const ripeningMethod = await determineRipeningMethod(produceName, sourceLocation, userLocationString);
    
    // Calculate CO2 impact
    const co2Impact = calculateCO2Impact(travelDistance, produceName);
    
    // Generate feature-based seasonal alternatives
    const seasonalAlternatives = await generateAlternatives(
      produceName, 
      co2Impact, 
      travelDistance, 
      sourceLocation, 
      userLocationString
    );
    
    // Generate local alternatives - we'll reuse the same function but filter for more local options
    const localAlternatives = findSimilarFoods(
      produceName,
      userLocationString,
      sourceLocation,
      travelDistance / 4, // Assume much shorter distance for local
      3
    );

    // Create the final result
    const result: ProduceInfo = {
      name: produceName,
      source: sourceLocation,
      co2Impact,
      travelDistance,
      ripeningMethod,
      inSeason,
      seasonalAlternatives: seasonalAlternatives.slice(0, 3), // Ensure max 3
      localAlternatives: localAlternatives.slice(0, 3), // Ensure max 3
      userLocation: userLocationString
    };

    // Log the results to console for verification
    console.log("Analysis complete:", result);
    console.log("Seasonal alternatives:", result.seasonalAlternatives);
    console.log("Local alternatives:", result.localAlternatives);
    
    // Dismiss progress toast
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
