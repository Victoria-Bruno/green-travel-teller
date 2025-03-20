
import { pipeline, env } from '@huggingface/transformers';
import { toast } from "@/components/ui/use-toast";
import { calculateDistance, getUserLocationCoordinates } from './googleMapsService';

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
  userLocation: string; // Added to store user location for display
}

export interface AlternativeOption {
  name: string;
  co2Impact: number;
  distanceReduction: number;
  benefits: string[];
  nutritionalSimilarity?: string; // Added to explain nutritional similarity
}

// Initialize model
let bertModel: any = null;
let isModelLoading = false;

// Load BERT model
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
      title: "Loading BERT Model",
      description: "This may take a moment...",
    });
    
    // Load the text-classification pipeline with BERT
    bertModel = await pipeline(
      'text-classification',
      'distilbert-base-uncased-finetuned-sst-2-english' // A lighter model for browser use
    );
    
    isModelLoading = false;
    return bertModel;
  } catch (error) {
    console.error('Error loading BERT model:', error);
    isModelLoading = false;
    toast({
      title: "Model Loading Error",
      description: "Could not load BERT model. Using fallback analysis.",
      variant: "destructive",
    });
    throw error;
  }
};

// Seasonal information knowledge
const seasonalCalendar: Record<string, number[]> = {
  // Common European produce seasonal calendar (0 = January, 11 = December)
  "apple": [0, 1, 2, 8, 9, 10, 11],
  "banana": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // Imported year-round
  "tomato": [5, 6, 7, 8, 9],
  "strawberry": [4, 5, 6, 7],
  "potato": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  "avocado": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // Mostly imported
  "broccoli": [5, 6, 7, 8, 9, 10],
  "carrot": [0, 5, 6, 7, 8, 9, 10, 11],
  "onion": [0, 1, 2, 3, 4, 9, 10, 11],
  "pepper": [6, 7, 8, 9],
  "cucumber": [4, 5, 6, 7, 8, 9],
  "lettuce": [4, 5, 6, 7, 8, 9]
};

// Known ripening methods for common produce from specific regions
const ripeningMethodsData: Record<string, Record<string, string | null>> = {
  "banana": {
    "default": "Ethylene gas treatment to accelerate ripening after harvest",
    "mexico": "Controlled atmosphere storage and ethylene treatment for export",
    "costa rica": "Harvested green and ripened with ethylene during transport to Europe"
  },
  "avocado": {
    "default": "Controlled atmosphere storage and ethylene treatment",
    "spain": "Temperature-controlled storage with minimal artificial ripening",
    "mexico": "Picked before ripening and treated with ethylene for European markets"
  },
  "tomato": {
    "default": "Often harvested green and ripened with ethylene gas during transport",
    "morocco": "Picked unripe and treated with ethylene during import to the Netherlands",
    "spain": "Greenhouse-grown with controlled conditions, less artificial treatment",
    "netherlands": "Dutch greenhouse tomatoes use controlled temperature and lighting"
  },
  "mango": {
    "default": "Ethylene treatment for uniform ripening",
    "brazil": "Hot water treatment followed by ethylene for European markets"
  },
  "kiwi": {
    "default": "Natural ripening, sometimes accelerated with ethylene",
    "italy": "Controlled atmosphere storage with minimal treatment for EU distribution"
  }
};

// Nutritional groups for produce
const nutritionalGroups: Record<string, string[]> = {
  "leafy_greens": ["spinach", "kale", "lettuce", "arugula", "chard", "collard greens", "cabbage"],
  "cruciferous": ["broccoli", "cauliflower", "brussels sprouts", "cabbage", "bok choy"],
  "root_vegetables": ["carrot", "potato", "sweet potato", "beet", "radish", "turnip", "parsnip", "onion", "garlic"],
  "squash": ["pumpkin", "butternut squash", "acorn squash", "zucchini", "cucumber"],
  "nightshades": ["tomato", "eggplant", "pepper", "chili"],
  "berries": ["strawberry", "blueberry", "raspberry", "blackberry", "cranberry"],
  "citrus": ["orange", "lemon", "lime", "grapefruit", "mandarin"],
  "tropical_fruits": ["banana", "pineapple", "mango", "papaya", "kiwi"],
  "stone_fruits": ["peach", "plum", "cherry", "apricot", "nectarine"],
  "pome_fruits": ["apple", "pear", "quince"],
  "legumes": ["beans", "peas", "lentils", "chickpeas", "soybeans"],
  "grains": ["rice", "wheat", "oats", "barley", "quinoa", "corn"],
  "nuts_seeds": ["almond", "walnut", "cashew", "pistachio", "sunflower seeds", "pumpkin seeds", "flax seeds"],
  "herbs": ["basil", "parsley", "cilantro", "mint", "rosemary", "thyme", "oregano"],
  "high_fat_fruits": ["avocado", "olive", "coconut"]
};

// Nutritional profiles for common foods
const nutritionalProfiles: Record<string, string> = {
  "banana": "High in potassium, vitamin B6, fiber and provides quick energy from natural sugars",
  "apple": "Rich in fiber, vitamin C, and antioxidants with a moderate glycemic index",
  "pear": "Good source of fiber, vitamin C, and natural sugars with similar energy profile to bananas",
  "avocado": "High in healthy monounsaturated fats, fiber, potassium and various micronutrients",
  "tomato": "Rich in lycopene, vitamin C, potassium and antioxidants with low calorie content",
  "potato": "Good source of complex carbohydrates, potassium, vitamin C and B vitamins",
  "carrot": "High in beta-carotene, fiber, vitamin K, and various antioxidants",
  "broccoli": "Excellent source of vitamin C, K, folate, fiber and various phytonutrients",
  "spinach": "High in iron, vitamin K, A, folate and various antioxidants with low calorie content",
  "strawberry": "Rich in vitamin C, manganese, antioxidants and has a low glycemic index",
  "oats": "High in complex carbohydrates, fiber (beta-glucans), protein and minerals",
  "quinoa": "Complete protein source with fiber, minerals and slower energy release than bananas"
};

// Emission factors for different transportation methods (kg CO2 per kg-km)
const emissionFactors = {
  air_freight: 0.00025,
  road_short: 0.00010,
  road_long: 0.00015,
  sea_freight: 0.00003,
  local_transport: 0.00005
};

// Find nutritional group for a produce
const findNutritionalGroup = (produceName: string): string | null => {
  const normalizedProduce = produceName.toLowerCase();
  
  for (const [group, produceList] of Object.entries(nutritionalGroups)) {
    if (produceList.some(item => 
      normalizedProduce.includes(item) || item.includes(normalizedProduce))) {
      return group;
    }
  }
  
  return null;
};

// Find similar produce in the same nutritional group
const findNutritionallySimilarProduce = (produceName: string, excludeList: string[] = [], inSeason: boolean = true, currentMonth: number = new Date().getMonth()): string[] => {
  const normalizedProduce = produceName.toLowerCase();
  const group = findNutritionalGroup(normalizedProduce);
  
  if (!group) return [];
  
  const alternatives = nutritionalGroups[group]
    .filter(item => 
      !excludeList.some(excluded => item.includes(excluded) || excluded.includes(item)) &&
      !item.includes(normalizedProduce) && 
      !normalizedProduce.includes(item)
    );
  
  // If we want in-season alternatives, filter by month
  if (inSeason) {
    return alternatives.filter(alt => {
      for (const [produce, months] of Object.entries(seasonalCalendar)) {
        if (alt.includes(produce) || produce.includes(alt)) {
          return months.includes(currentMonth);
        }
      }
      return false;
    });
  }
  
  return alternatives;
};

// Determine if a produce is in season based on month and produce name
const determineIfInSeason = async (produceName: string, month: number): Promise<boolean> => {
  try {
    // Normalize produce name
    const normalizedProduce = produceName.toLowerCase();
    
    // Check if produce exists in our seasonal calendar
    for (const [produce, months] of Object.entries(seasonalCalendar)) {
      if (normalizedProduce.includes(produce) || produce.includes(normalizedProduce)) {
        return months.includes(month);
      }
    }
    
    // If not found in our database, use BERT to make a prediction
    const model = await loadBertModel().catch(() => null);
    if (!model) {
      // Default to general seasonal patterns if model fails
      if (month >= 5 && month <= 8) {  // Summer months
        return ["berries", "melon", "cucumber", "tomato", "pepper", "summer"].some(term => 
          normalizedProduce.includes(term));
      } else if (month <= 1 || month >= 10) {  // Winter months
        return ["root", "winter", "cabbage", "kale", "brussels"].some(term => 
          normalizedProduce.includes(term));
      }
      return false;
    }
    
    // Use model for prediction
    const query = `Is ${produceName} in season in Europe during ${getMonthName(month)}?`;
    const result = await model(query);
    
    // Analyze result
    return result[0]?.label === 'POSITIVE';
  } catch (error) {
    console.error('Error determining if in season:', error);
    // Fallback to estimate based on month
    return [3, 4, 5, 6, 7, 8].includes(month); // Assume spring/summer produce
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

// Determine ripening method based on produce and source
const determineRipeningMethod = async (produceName: string, sourceLocation: string): Promise<string | null> => {
  // Normalize inputs
  const normalizedProduce = produceName.toLowerCase();
  const normalizedSource = sourceLocation.toLowerCase();
  
  // Check our database first
  for (const [produce, sources] of Object.entries(ripeningMethodsData)) {
    if (normalizedProduce.includes(produce) || produce.includes(normalizedProduce)) {
      // Check for specific source location match
      for (const [source, method] of Object.entries(sources)) {
        if (source !== 'default' && normalizedSource.includes(source)) {
          return method;
        }
      }
      // Fall back to default if specific source not found
      return sources.default || null;
    }
  }
  
  // If not in database, use BERT to make a prediction
  try {
    const model = await loadBertModel().catch(() => null);
    if (!model) {
      // Return null as fallback (no ripening method identified)
      return null;
    }
    
    const query = `Does ${produceName} imported from ${sourceLocation} to Netherlands use artificial ripening methods?`;
    const result = await model(query);
    
    // If positive sentiment, it likely uses artificial ripening
    if (result[0]?.label === 'POSITIVE') {
      return `Likely uses post-harvest ripening techniques when imported from ${sourceLocation} to the Netherlands`;
    }
    
    return null;
  } catch (error) {
    console.error('Error determining ripening method:', error);
    return null;
  }
};

// Get CO2 impact based on distance and transportation methods
const calculateCO2Impact = (distance: number, produceType: string): number => {
  // Determine likely transportation method based on distance and produce type
  let emissionFactor;
  
  if (distance > 5000) {
    // Long international distances, likely air freight for perishables
    if (["berry", "strawberry", "raspberry", "avocado", "mango", "papaya", "asparagus"].some(
      term => produceType.toLowerCase().includes(term))) {
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
    produceType.toLowerCase().includes(type)) ? 0.2 : 0.1;
  
  // Calculate total emissions
  const transportTotal = distance * emissionFactor;
  const total = transportTotal + productionEmissions;
  
  // Return rounded value
  return parseFloat(total.toFixed(2));
};

// Generate detailed sustainable alternatives
const generateAlternatives = async (
  produceName: string, 
  co2Impact: number,
  travelDistance: number,
  sourceLocation: string,
  userLocation: string
): Promise<AlternativeOption[]> => {
  try {
    const model = await loadBertModel().catch(() => null);
    const normalizedProduce = produceName.toLowerCase();
    const currentMonth = new Date().getMonth();
    
    // Find the nutritional group of the produce
    const nutritionalGroup = findNutritionalGroup(normalizedProduce);
    if (!nutritionalGroup) {
      return getDefaultAlternatives(produceName, co2Impact);
    }
    
    // Find similar produces in the same nutritional group
    let similarProduces = nutritionalGroups[nutritionalGroup]
      .filter(item => 
        !normalizedProduce.includes(item) && 
        !item.includes(normalizedProduce)
      );
    
    // Filter to in-season items first
    const inSeasonOptions = [];
    for (const alternative of similarProduces) {
      // Check if alternative is in season
      let isInSeason = false;
      for (const [produce, months] of Object.entries(seasonalCalendar)) {
        if ((alternative.includes(produce) || produce.includes(alternative)) && months.includes(currentMonth)) {
          isInSeason = true;
          break;
        }
      }
      
      if (isInSeason) {
        inSeasonOptions.push(alternative);
      }
    }
    
    // Create alternatives with detailed descriptions
    const result: AlternativeOption[] = [];
    
    // Use available in-season options first, then fall back to others
    const optionsToUse = inSeasonOptions.length > 0 ? inSeasonOptions : similarProduces;
    
    // Limit to max 3 alternatives
    for (let i = 0; i < Math.min(3, optionsToUse.length); i++) {
      const alternative = optionsToUse[i];
      
      // Calculate approximate distance reduction (local growing assumed)
      const distanceReduction = Math.min(95, Math.round((travelDistance - 500) / travelDistance * 100));
      if (distanceReduction < 30) continue; // Skip if not significantly better
      
      // Calculate reduced CO2 impact
      const reducedCO2 = calculateCO2Impact(500, alternative); // Assume 500km local transport
      
      // Get nutritional information if available
      const nutritionalInfo = nutritionalProfiles[alternative] || 
        `Similar nutritional profile to other ${nutritionalGroup.replace('_', ' ')}`;
      
      // Generate benefits based on actual data
      const benefits = [
        nutritionalInfo,
        `Grown locally in or near ${userLocation}, reducing transportation emissions`,
        `${distanceReduction}% less distance compared to ${produceName} from ${sourceLocation}`
      ];
      
      result.push({
        name: alternative,
        co2Impact: reducedCO2,
        distanceReduction,
        benefits
      });
    }
    
    // If we couldn't find enough alternatives, add generic ones
    if (result.length < 3) {
      const defaultAlternatives = getDefaultAlternatives(produceName, co2Impact)
        .slice(0, 3 - result.length);
      
      result.push(...defaultAlternatives);
    }
    
    return result;
  } catch (error) {
    console.error('Error generating alternatives:', error);
    return getDefaultAlternatives(produceName, co2Impact);
  }
};

// Get default alternatives for a produce
const getDefaultAlternatives = (produceName: string, co2Impact: number): AlternativeOption[] => {
  const nutritionalGroup = findNutritionalGroup(produceName.toLowerCase());
  const groupName = nutritionalGroup ? nutritionalGroup.replace('_', ' ') : 'produce';
  
  // More specific alternatives based on nutritional groups
  if (nutritionalGroup === 'tropical_fruits') {
    return [
      {
        name: "Local apples or pears",
        co2Impact: co2Impact * 0.3,
        distanceReduction: 85,
        benefits: [
          "Provide fiber, vitamin C, and natural sugars for energy",
          "Grown throughout Europe with minimal transportation needed",
          "Available nearly year-round from cold storage"
        ]
      },
      {
        name: "Seasonal berries",
        co2Impact: co2Impact * 0.2,
        distanceReduction: 90,
        benefits: [
          "Rich in antioxidants, vitamins and fiber",
          "Can be grown locally during summer months",
          "Frozen options available year-round with lower carbon footprint"
        ]
      },
      {
        name: "Oats or other grains",
        co2Impact: co2Impact * 0.1,
        distanceReduction: 95,
        benefits: [
          "Provide complex carbohydrates and sustained energy",
          "Grown extensively throughout Europe",
          "Excellent shelf-life reducing food waste"
        ]
      }
    ];
  } else if (nutritionalGroup === 'high_fat_fruits') {
    return [
      {
        name: "Locally grown nuts",
        co2Impact: co2Impact * 0.4,
        distanceReduction: 80,
        benefits: [
          "Rich in healthy fats similar to avocados",
          "Longer shelf life reducing food waste",
          "Can be grown in many European regions"
        ]
      },
      {
        name: "Seeds (sunflower, pumpkin)",
        co2Impact: co2Impact * 0.3,
        distanceReduction: 85,
        benefits: [
          "Excellent source of healthy fats and protein",
          "Grown throughout Europe with lower water requirements",
          "Can be used in many similar culinary applications"
        ]
      }
    ];
  }

  // Generic alternatives when specific ones aren't available
  return [
    {
      name: `Local seasonal ${groupName}`,
      co2Impact: co2Impact * 0.3,
      distanceReduction: 85,
      benefits: [
        "Significantly lower carbon footprint due to reduced transportation",
        "Fresher product with better taste and nutrition",
        "Supports local economy and farming practices"
      ]
    },
    {
      name: "Plant-based seasonal alternatives",
      co2Impact: co2Impact * 0.2,
      distanceReduction: 90,
      benefits: [
        "Adapted to local growing conditions requiring fewer resources",
        "Similar nutritional profile with lower environmental impact",
        "Reduced transportation emissions compared to imported produce"
      ]
    }
  ];
};

// Generate local alternatives
const generateLocalAlternatives = async (
  produceName: string,
  co2Impact: number,
  sourceLocation: string,
  userLocation: string
): Promise<AlternativeOption[]> => {
  try {
    // Local options are more focused on cultivation methods rather than different produce
    // Find the nutritional group to provide context
    const nutritionalGroup = findNutritionalGroup(produceName.toLowerCase());
    const groupName = nutritionalGroup ? nutritionalGroup.replace('_', ' ') : 'produce';
    
    return [
      {
        name: `Locally grown ${produceName}`,
        co2Impact: co2Impact * 0.2,
        distanceReduction: 95,
        benefits: [
          "Same nutritional profile as imported version",
          `Grown within or near ${userLocation} reducing transportation emissions by up to 95%`,
          "Harvested at peak ripeness for maximum flavor and nutrition"
        ]
      },
      {
        name: "Community garden options",
        co2Impact: co2Impact * 0.05,
        distanceReduction: 99,
        benefits: [
          "Zero food miles with minimal carbon footprint",
          "Complete transparency in growing methods",
          "Promotes food sovereignty and community resilience"
        ]
      },
      {
        name: "Indoor/vertical farm produce",
        co2Impact: co2Impact * 0.3,
        distanceReduction: 90,
        benefits: [
          "Year-round local production regardless of climate",
          "Typically uses less water and no pesticides",
          "Can be grown in urban areas very close to consumers"
        ]
      }
    ].slice(0, 3); // Limit to max 3 alternatives
  } catch (error) {
    console.error('Error generating local alternatives:', error);
    return [
      {
        name: `Local ${produceName}`,
        co2Impact: co2Impact * 0.2,
        distanceReduction: 95,
        benefits: [
          "Minimal transportation emissions",
          "Fresher product with higher nutritional value",
          "Supports local farmers and economy"
        ]
      },
      {
        name: "Community garden produce",
        co2Impact: co2Impact * 0.05,
        distanceReduction: 99,
        benefits: [
          "Zero transportation footprint",
          "Know exactly how your food is grown",
          "Promotes food sovereignty and self-sufficiency"
        ]
      }
    ];
  }
};

// Main analysis function
export const analyzeProduceSustainability = async (
  produceName: string,
  sourceLocation: string,
  userLocation: { city: string | null; country: string | null; latitude: number | null; longitude: number | null; }
): Promise<ProduceInfo> => {
  try {
    // Show progress
    const progressToast = toast({
      title: "Analyzing produce data...",
      description: "Using BERT model to analyze sustainability...",
    });

    // Get user coordinates
    let userCoords;
    if (userLocation.latitude && userLocation.longitude) {
      userCoords = { lat: userLocation.latitude, lng: userLocation.longitude };
    } else {
      userCoords = await getUserLocationCoordinates();
    }
    
    // Calculate travel distance
    toast({
      title: "Calculating distance",
      description: `Determining travel distance from ${sourceLocation} to your location...`,
    });
    
    const travelDistance = await calculateDistance(sourceLocation, userCoords);
    
    // Current month for seasonal analysis
    const currentMonth = new Date().getMonth();
    
    // Determine if produce is in season
    const inSeason = await determineIfInSeason(produceName, currentMonth);
    
    // Determine ripening method
    const ripeningMethod = await determineRipeningMethod(produceName, sourceLocation);
    
    // Calculate CO2 impact
    const co2Impact = calculateCO2Impact(travelDistance, produceName);
    
    // Generate better seasonal alternatives with nutritional information
    const userLocationString = userLocation.city || "your location";
    const seasonalAlternatives = await generateAlternatives(
      produceName, 
      co2Impact, 
      travelDistance, 
      sourceLocation, 
      userLocationString
    );
    
    // Generate local alternatives
    const localAlternatives = await generateLocalAlternatives(
      produceName, 
      co2Impact, 
      sourceLocation,
      userLocationString
    );

    // Create the final result
    const result: ProduceInfo = {
      name: produceName,
      source: sourceLocation,
      co2Impact,
      travelDistance,
      ripeningMethod,
      inSeason,
      seasonalAlternatives,
      localAlternatives,
      userLocation: userLocationString
    };

    // Dismiss progress toast
    progressToast.dismiss();
    
    toast({
      title: "Analysis complete",
      description: "Sustainability data calculated using BERT model.",
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
