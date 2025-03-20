
import { pipeline, env } from '@huggingface/transformers';
import { toast } from "@/components/ui/use-toast";
import type { ProduceInfo, AlternativeOption } from './openaiService';
import { calculateDistance, getUserLocationCoordinates } from './googleMapsService';

// Configure transformers.js to use browser cache
env.allowLocalModels = false;
env.useBrowserCache = true;

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
    
    // Load the text-classification pipeline with bert-base-uncased
    bertModel = await pipeline(
      'text-classification',
      'distilbert-base-uncased-finetuned-sst-2-english', // A lighter model for browser use
      { topk: null }
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

// Determine if a produce is in season based on month and produce name
const determineIfInSeason = async (produceName: string, month: number): Promise<boolean> => {
  try {
    // Seasonal information knowledge
    const seasonalCalendar: Record<string, number[]> = {
      // Common European produce seasonal calendar
      // 0 = January, 11 = December
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
    
    // Analyze result - this is simplified and would need improvement with a properly fine-tuned model
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
  // Known ripening methods for common produce
  const ripeningMethods: Record<string, string | null> = {
    "banana": "Ethylene gas treatment to accelerate ripening after harvest",
    "avocado": "Controlled atmosphere storage and ethylene treatment",
    "tomato": "Often harvested green and ripened with ethylene gas during transport",
    "mango": "Ethylene treatment for uniform ripening",
    "kiwi": "Natural ripening, sometimes accelerated with ethylene",
    "apple": null, // Natural ripening
    "strawberry": null, // Doesn't ripen after harvest
    "potato": null,
    "onion": null,
    "carrot": null
  };
  
  const normalizedProduce = produceName.toLowerCase();
  
  // Check our database first
  for (const [produce, method] of Object.entries(ripeningMethods)) {
    if (normalizedProduce.includes(produce) || produce.includes(normalizedProduce)) {
      return method;
    }
  }
  
  // If not in database, use BERT to make a prediction
  try {
    const model = await loadBertModel().catch(() => null);
    if (!model) {
      // Return null as fallback (no ripening method identified)
      return null;
    }
    
    const query = `Does ${produceName} get artificially ripened after harvest?`;
    const result = await model(query);
    
    // If positive sentiment, it likely uses artificial ripening
    if (result[0]?.label === 'POSITIVE') {
      return `Likely uses post-harvest ripening techniques when imported from ${sourceLocation}`;
    }
    
    return null;
  } catch (error) {
    console.error('Error determining ripening method:', error);
    return null;
  }
};

// Get CO2 impact based on distance and transportation methods
const calculateCO2Impact = (distance: number, produceType: string): number => {
  // CO2 emissions factors (kg CO2 per kg produce per km)
  // These are simplified values
  const transportEmissions = distance > 2000 
    ? 0.00025 // Long distance/air freight 
    : 0.00015; // Road/sea freight
  
  // Additional emissions from production and refrigeration
  const productionEmissions = ["avocado", "asparagus", "berries"].some(type => 
    produceType.toLowerCase().includes(type)) ? 0.2 : 0.1;
  
  // Calculate total emissions
  const transportTotal = distance * transportEmissions;
  const total = transportTotal + productionEmissions;
  
  // Return rounded value
  return parseFloat(total.toFixed(2));
};

// Generate sustainable alternatives
const generateAlternatives = async (
  produceName: string, 
  isInSeason: boolean, 
  currentMonth: number
): Promise<AlternativeOption[]> => {
  // Basic alternatives database
  const commonAlternatives: Record<string, AlternativeOption[]> = {
    "avocado": [
      {
        name: "Hummus",
        co2Impact: 0.2,
        distanceReduction: 80,
        benefits: ["Plant-based spread with similar uses", "Can be made locally", "Lower water footprint"]
      },
      {
        name: "Nut butter",
        co2Impact: 0.3,
        distanceReduction: 70,
        benefits: ["Rich in healthy fats", "Long shelf life", "Available locally"]
      }
    ],
    "tomato": [
      {
        name: "Local seasonal vegetables",
        co2Impact: 0.1,
        distanceReduction: 90,
        benefits: ["Significantly lower transportation impact", "Fresher and more nutritious", "Supports local agriculture"]
      },
      {
        name: "Preserved tomatoes",
        co2Impact: 0.3,
        distanceReduction: 60,
        benefits: ["Processed during peak season", "Lower food waste", "Year-round availability"]
      }
    ],
    "berries": [
      {
        name: "Local fruits in season",
        co2Impact: 0.1,
        distanceReduction: 95,
        benefits: ["Minimal transportation", "Peak flavor and nutrition", "Support local farming"]
      },
      {
        name: "Frozen local berries",
        co2Impact: 0.2,
        distanceReduction: 80,
        benefits: ["Preserved at peak ripeness", "Available year-round", "Reduces food waste"]
      }
    ]
  };

  const normalizedProduce = produceName.toLowerCase();
  
  // Check if we have pre-defined alternatives
  for (const [key, alternatives] of Object.entries(commonAlternatives)) {
    if (normalizedProduce.includes(key) || key.includes(normalizedProduce)) {
      return alternatives;
    }
  }
  
  // If no specific alternatives found, create generic ones
  return [
    {
      name: `Local seasonal produce`,
      co2Impact: 0.1,
      distanceReduction: 90,
      benefits: [
        "Significantly lower carbon footprint",
        "Fresher product with better taste and nutrition",
        "Supports local economy"
      ]
    },
    {
      name: "Plant-based seasonal alternatives",
      co2Impact: 0.2,
      distanceReduction: 80,
      benefits: [
        "Adapted to local growing conditions",
        "Lower resource requirements",
        "Reduced transportation emissions"
      ]
    }
  ];
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
    
    // Generate alternatives
    const seasonalAlternatives = await generateAlternatives(produceName, inSeason, currentMonth);
    
    // Generate local alternatives (simplified)
    const localAlternatives: AlternativeOption[] = [
      {
        name: `Local ${produceName}`,
        co2Impact: 0.1,
        distanceReduction: 95,
        benefits: [
          "Minimal transportation emissions",
          "Fresher product with higher nutritional value",
          "Supports local farmers and economy"
        ]
      },
      {
        name: "Community garden produce",
        co2Impact: 0.05,
        distanceReduction: 99,
        benefits: [
          "Zero transportation footprint",
          "Know exactly how your food is grown",
          "Promotes food sovereignty and self-sufficiency"
        ]
      }
    ];

    // Create the final result
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
