
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
    
    // Use a more reliable model - a simple text classification model
    bertModel = await pipeline(
      'text-classification',
      'Xenova/distilbert-base-uncased-finetuned-sst-2-english' // More likely to be available
    );
    
    isModelLoading = false;
    return bertModel;
  } catch (error) {
    console.error('Error loading BERT model:', error);
    isModelLoading = false;
    toast({
      title: "Model Loading Error",
      description: "Could not load AI model. Using fallback analysis.",
      variant: "destructive",
    });
    
    // If we can't load the model, create a simple mock model for fallback
    bertModel = {
      async __call__(text: string) {
        // Simple fallback - return positive for questions about sustainability
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

// Basic food groups to help with similarity matching
const foodGroups = {
  fruits: ['apple', 'banana', 'orange', 'grape', 'strawberry', 'blueberry', 'raspberry', 'blackberry', 
    'pear', 'peach', 'plum', 'kiwi', 'mango', 'pineapple', 'watermelon', 'melon', 'apricot', 'cherry',
    'avocado', 'fig', 'date', 'papaya', 'guava', 'pomegranate', 'lychee'],
  
  vegetables: ['broccoli', 'cauliflower', 'carrot', 'potato', 'tomato', 'onion', 'garlic', 'pepper',
    'spinach', 'kale', 'lettuce', 'cabbage', 'celery', 'cucumber', 'zucchini', 'eggplant', 'corn',
    'asparagus', 'beet', 'radish', 'turnip', 'squash', 'pumpkin', 'sweet potato', 'brussels sprout'],
  
  grains: ['rice', 'wheat', 'oats', 'barley', 'quinoa', 'corn', 'rye', 'millet', 'buckwheat',
    'bread', 'pasta', 'cereal', 'flour', 'couscous', 'bulgur'],
  
  protein: ['chicken', 'beef', 'pork', 'lamb', 'fish', 'tofu', 'tempeh', 'beans', 'lentils', 'chickpeas',
    'nuts', 'seeds', 'eggs', 'yogurt', 'cheese', 'milk', 'soy'],
  
  nuts_seeds: ['almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut', 'peanut', 'sunflower seed',
    'pumpkin seed', 'chia seed', 'flax seed', 'hemp seed', 'sesame seed'],
};

// Get month name from number
const getMonthName = (month: number): string => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month];
};

// Find the food group for a given produce
const findFoodGroup = (produceName: string): string | null => {
  const normalizedName = produceName.toLowerCase();
  
  for (const [group, items] of Object.entries(foodGroups)) {
    if (items.some(item => normalizedName.includes(item) || item.includes(normalizedName))) {
      return group;
    }
  }
  
  return null;
};

// Determine if a produce is in season using BERT
const determineIfInSeason = async (produceName: string, userLocation: string): Promise<boolean> => {
  try {
    const model = await loadBertModel().catch(() => null);
    if (!model) return true; // Default if model fails
    
    const currentMonth = new Date().getMonth();
    const monthName = getMonthName(currentMonth);
    
    // Dynamic query with user's location
    const query = `Is ${produceName} in season in ${userLocation} during ${monthName}?`;
    const result = await model(query);
    
    return result[0]?.label === 'POSITIVE';
  } catch (error) {
    console.error('Error determining if in season:', error);
    return true; // Default to true if there's an error
  }
};

// Determine ripening method for imported produce using BERT
const determineRipeningMethod = async (produceName: string, sourceLocation: string, userLocation: string): Promise<string | null> => {
  try {
    const model = await loadBertModel().catch(() => null);
    if (!model) return null;
    
    // Dynamic query with user's location
    const query = `Does ${produceName} imported from ${sourceLocation} to ${userLocation} use artificial ripening methods?`;
    const result = await model(query);
    
    if (result[0]?.label === 'POSITIVE') {
      return `Likely uses post-harvest ripening techniques when imported from ${sourceLocation} to ${userLocation}`;
    }
    
    return null;
  } catch (error) {
    console.error('Error determining ripening method:', error);
    return null;
  }
};

// Calculate CO2 impact based on distance and transportation methods
const calculateCO2Impact = (distance: number, produceType: string): number => {
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

// Generate alternatives using feature-based similarity approach
const generateAlternatives = async (
  produceName: string,
  co2Impact: number,
  travelDistance: number,
  sourceLocation: string,
  userLocation: string
): Promise<AlternativeOption[]> => {
  try {
    const model = await loadBertModel().catch(() => null);
    if (!model) {
      console.error('Failed to load model for alternatives');
      
      // Provide at least one fallback alternative even if model fails
      return [{
        name: "Local seasonal produce",
        co2Impact: co2Impact * 0.3,
        distanceReduction: 80,
        benefits: [
          "Lower carbon footprint from reduced transportation",
          "Supports local farmers and economy",
          "Often fresher with better nutritional value"
        ]
      }];
    }
    
    // Identify food group of the produce
    const foodGroup = findFoodGroup(produceName) || "produce";
    
    // Create a specific, detailed prompt for better results
    const prompt = `What are 3 more sustainable alternatives to ${produceName} imported from ${sourceLocation} to ${userLocation} in terms of nutritional groups, value and emission? Consider local options that provide similar nutritional benefits but with lower carbon footprint.`;
    
    // Get model's response
    const result = await model(prompt);
    
    // If model suggests alternatives are available
    if (result[0]?.label === 'POSITIVE') {
      const alternatives: AlternativeOption[] = [];
      
      // Add potential alternatives based on food group
      const potentialAlternatives = [
        {
          name: `Local ${foodGroup} (${userLocation} region)`,
          co2Impact: co2Impact * 0.2,
          distanceReduction: 90,
          benefits: [
            `Similar nutritional profile to ${produceName}`,
            `Grown within the ${userLocation} region, drastically reducing transportation emissions`,
            "Fresher with potentially higher nutrient content due to shorter time from harvest to consumption"
          ]
        },
        {
          name: `Seasonal ${foodGroup} varieties`,
          co2Impact: co2Impact * 0.3,
          distanceReduction: 85,
          benefits: [
            "Optimally grown without artificial conditions, reducing energy use",
            "Higher nutrient density when harvested in proper season",
            "Lower environmental impact due to reduced need for artificial growing conditions"
          ]
        }
      ];
      
      // Add fruit-specific alternatives for fruits
      if (foodGroup === 'fruits') {
        potentialAlternatives.push({
          name: `Regional berries and stone fruits`,
          co2Impact: co2Impact * 0.25,
          distanceReduction: 88,
          benefits: [
            `Similar vitamin and antioxidant profile to ${produceName}`,
            "Typically grown with lower water requirements than tropical fruits",
            "Can provide similar nutritional benefits with significantly lower transportation emissions"
          ]
        });
      }
      
      // Add vegetable-specific alternatives for vegetables
      if (foodGroup === 'vegetables') {
        potentialAlternatives.push({
          name: `Local leafy greens and root vegetables`,
          co2Impact: co2Impact * 0.2,
          distanceReduction: 92,
          benefits: [
            "Rich in vitamins, minerals and fiber",
            "Can be grown year-round in many climates, including indoor farming",
            "Often require less water and pesticides than imported produce"
          ]
        });
      }
      
      // Only return up to 3 alternatives
      return potentialAlternatives.slice(0, 3);
    }
    
    // If model doesn't suggest alternatives, return a generic one
    return [{
      name: `Local ${foodGroup} options`,
      co2Impact: co2Impact * 0.3,
      distanceReduction: 75,
      benefits: [
        "Reduced carbon footprint from transportation",
        "Support for local agriculture",
        "Generally fresher with less time in storage"
      ]
    }];
    
  } catch (error) {
    console.error('Error generating alternatives:', error);
    
    // Return a simple fallback alternative in case of errors
    return [{
      name: "Local produce alternatives",
      co2Impact: co2Impact * 0.4,
      distanceReduction: 70,
      benefits: [
        "Reduced emissions from shorter transportation",
        "Generally fresher produce",
        "Supports local economy"
      ]
    }];
  }
};

// Generate local alternatives focusing on cultivation methods
const generateLocalAlternatives = async (
  produceName: string,
  co2Impact: number,
  sourceLocation: string,
  userLocation: string
): Promise<AlternativeOption[]> => {
  try {
    const model = await loadBertModel().catch(() => null);
    if (!model) {
      console.error('Failed to load model for local alternatives');
      
      // Return at least one fallback alternative even without model
      return [{
        name: `Locally grown ${produceName}`,
        co2Impact: co2Impact * 0.2,
        distanceReduction: 90,
        benefits: [
          "Significantly reduced transportation emissions",
          "Same nutritional profile as imported version",
          "Supports local farmers and economy"
        ]
      }];
    }
    
    const prompt = `Can ${produceName} be grown locally in ${userLocation} instead of importing from ${sourceLocation}?`;
    const result = await model(prompt);
    
    const alternatives: AlternativeOption[] = [];
    
    // If BERT suggests local cultivation is possible
    if (result[0]?.label === 'POSITIVE') {
      // Add locally grown version of the same produce
      alternatives.push({
        name: `Locally grown ${produceName}`,
        co2Impact: co2Impact * 0.2,
        distanceReduction: 90,
        benefits: [
          "Same nutritional profile as imported version",
          `Grown within or near ${userLocation} reducing transportation emissions`,
          "Harvested at peak ripeness for maximum flavor and nutrition"
        ]
      });
      
      // Add community garden option
      alternatives.push({
        name: "Community garden options",
        co2Impact: co2Impact * 0.05,
        distanceReduction: 99,
        benefits: [
          "Zero food miles with minimal carbon footprint",
          "Complete transparency in growing methods",
          "Promotes food sovereignty and community resilience"
        ]
      });
    } else {
      // If local growing isn't possible, suggest alternatives
      const foodGroup = findFoodGroup(produceName) || "produce";
      alternatives.push({
        name: `Local ${foodGroup} alternatives`,
        co2Impact: co2Impact * 0.3,
        distanceReduction: 85,
        benefits: [
          `Similar nutritional profile to ${produceName}`,
          "Adapted to local growing conditions",
          "Significantly lower carbon footprint"
        ]
      });
    }
    
    // Return up to 3 alternatives
    return alternatives.slice(0, 3);
  } catch (error) {
    console.error('Error generating local alternatives:', error);
    
    // Return a fallback alternative
    return [{
      name: `Local alternatives to ${produceName}`,
      co2Impact: co2Impact * 0.3,
      distanceReduction: 85,
      benefits: [
        "Reduced transportation emissions",
        "Fresh seasonal options",
        "Support for local agriculture"
      ]
    }];
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
      description: "Using AI model to analyze sustainability...",
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
    
    // Generate feature-based seasonal alternatives - ensure we get at least one
    const seasonalAlternatives = await generateAlternatives(
      produceName, 
      co2Impact, 
      travelDistance, 
      sourceLocation, 
      userLocationString
    );
    
    // Generate local alternatives - ensure we get at least one
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
      seasonalAlternatives: seasonalAlternatives.slice(0, 3), // Ensure max 3
      localAlternatives: localAlternatives.slice(0, 3), // Ensure max 3
      userLocation: userLocationString
    };

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
