
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
    
    // Use a more reliable model for classification
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
      description: "Could not load AI model. Using fallback analysis.",
      variant: "destructive",
    });
    
    // If we can't load the model, create a simple mock model for fallback
    bertModel = {
      async __call__(text: string) {
        console.log("Using fallback model with query:", text);
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

// Comprehensive food groups with nutritional information
const foodGroups = {
  fruits: {
    items: ['apple', 'banana', 'orange', 'grape', 'strawberry', 'blueberry', 'raspberry', 
      'pear', 'peach', 'plum', 'kiwi', 'mango', 'pineapple', 'watermelon', 'melon', 
      'apricot', 'cherry', 'avocado', 'fig', 'date', 'papaya', 'guava', 'pomegranate'],
    nutrition: 'vitamins, natural sugars, fiber, antioxidants',
    benefits: 'rich in vitamins, natural sugars for energy, antioxidants'
  },
  berries: {
    items: ['strawberry', 'blueberry', 'raspberry', 'blackberry', 'cranberry', 'acai'],
    nutrition: 'vitamin C, antioxidants, fiber, low sugar',
    benefits: 'rich in antioxidants, low sugar, anti-inflammatory properties'
  },
  tropical_fruits: {
    items: ['banana', 'mango', 'pineapple', 'papaya', 'avocado', 'coconut', 'guava', 'kiwi'],
    nutrition: 'vitamins A & C, potassium, fiber, exotic nutrients',
    benefits: 'high in potassium, tropical nutrients, good for digestion'
  },
  leafy_vegetables: {
    items: ['spinach', 'kale', 'lettuce', 'cabbage', 'arugula', 'chard', 'collard greens'],
    nutrition: 'iron, folate, vitamin K, fiber, low calorie',
    benefits: 'very low calorie, high in iron and folate, excellent for heart health'
  },
  root_vegetables: {
    items: ['carrot', 'potato', 'sweet potato', 'beet', 'radish', 'turnip', 'onion', 'garlic'],
    nutrition: 'complex carbs, fiber, minerals, antioxidants',
    benefits: 'high in complex carbohydrates, good for energy, rich in minerals'
  },
  vegetables: {
    items: ['broccoli', 'cauliflower', 'tomato', 'pepper', 'cucumber', 'zucchini', 'eggplant', 
      'corn', 'asparagus', 'brussels sprout', 'celery'],
    nutrition: 'vitamins, fiber, phytonutrients, low calorie',
    benefits: 'low in calories, high in nutrients, excellent fiber content'
  },
  grains: {
    items: ['rice', 'wheat', 'oats', 'barley', 'quinoa', 'rye', 'millet', 'buckwheat'],
    nutrition: 'complex carbs, fiber, B vitamins, some protein',
    benefits: 'high in complex carbohydrates, sustainable energy source, filling'
  },
  legumes: {
    items: ['beans', 'lentils', 'chickpeas', 'peas', 'soybeans', 'peanuts'],
    nutrition: 'protein, fiber, iron, folate, complex carbs',
    benefits: 'excellent plant protein source, high in fiber, iron and folate'
  },
  nuts_seeds: {
    items: ['almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut', 'peanut', 
      'sunflower seed', 'pumpkin seed', 'chia seed', 'flax seed', 'hemp seed', 'sesame seed'],
    nutrition: 'healthy fats, protein, vitamin E, minerals',
    benefits: 'rich in healthy fats, good protein source, contain various minerals'
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

// Find the food group for a given produce
const findFoodGroupInfo = (produceName: string): { group: string, nutrition: string, items: string[] } | null => {
  const normalizedName = produceName.toLowerCase();
  
  for (const [group, info] of Object.entries(foodGroups)) {
    if (info.items.some(item => normalizedName.includes(item) || item.includes(normalizedName))) {
      return { 
        group, 
        nutrition: info.nutrition,
        items: info.items
      };
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
    console.log("Season query:", query);
    const result = await model(query);
    console.log("Season result:", result);
    
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
    const query = `Does ${produceName} imported from ${sourceLocation} to ${userLocation} typically use artificial ripening methods?`;
    console.log("Ripening query:", query);
    const result = await model(query);
    console.log("Ripening result:", result);
    
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

// Generate nutritionally similar, more sustainable alternatives
const generateAlternatives = async (
  produceName: string,
  co2Impact: number,
  travelDistance: number,
  sourceLocation: string,
  userLocation: string
): Promise<AlternativeOption[]> => {
  try {
    // Identify food group and nutritional profile of the produce
    const foodGroupInfo = findFoodGroupInfo(produceName);
    console.log("Food group info:", foodGroupInfo);
    
    // If we can't identify the food group, use a basic fallback
    if (!foodGroupInfo) {
      return [{
        name: `Local seasonal produce`,
        co2Impact: co2Impact * 0.3,
        distanceReduction: 80,
        nutritionalSimilarity: "Similar nutritional profile",
        benefits: [
          "Lower carbon footprint from reduced transportation",
          "Supports local farmers and economy",
          "Often fresher with better nutritional value"
        ]
      }];
    }
    
    // Generate more specific alternatives based on the food group
    const alternatives: AlternativeOption[] = [];
    const { group, nutrition, items } = foodGroupInfo;
    
    // Find items from the same food group that are different from the original produce
    const similarItems = items.filter(item => 
      !produceName.toLowerCase().includes(item) && 
      !item.includes(produceName.toLowerCase())
    );
    
    console.log("Potential similar items:", similarItems);
    
    // Create location-specific alternatives based on food group
    if (group === 'tropical_fruits') {
      // For tropical fruits like bananas, suggest local temperate fruits
      alternatives.push({
        name: `Local apples or pears`,
        co2Impact: co2Impact * 0.2,
        distanceReduction: 90,
        nutritionalSimilarity: "Good source of fiber and natural sugars",
        benefits: [
          "Grown locally in many temperate regions",
          "Much lower emissions from minimal transportation",
          "Still provides dietary fiber and natural sugars"
        ]
      });
      
      // Suggest berries as an alternative with higher nutrition density
      alternatives.push({
        name: `Seasonal berries`,
        co2Impact: co2Impact * 0.25,
        distanceReduction: 85,
        nutritionalSimilarity: "Higher in antioxidants than tropical fruits",
        benefits: [
          "Provides similar vitamins with added antioxidant benefits",
          "Can be locally grown or sourced from nearby regions",
          "More nutrient-dense per calorie than most tropical fruits"
        ]
      });
      
      // Suggest grains/oats alternative for energy content
      alternatives.push({
        name: `Locally grown oats or grains`,
        co2Impact: co2Impact * 0.15,
        distanceReduction: 92,
        nutritionalSimilarity: "Similar energy content with added protein",
        benefits: [
          "Provides sustainable energy like fruits, but with more protein",
          "Can be grown in almost any climate with low emissions",
          "Longer shelf life reduces food waste"
        ]
      });
    } 
    else if (group === 'fruits') {
      // For non-tropical fruits, suggest local seasonal varieties
      alternatives.push({
        name: `Seasonal ${similarItems.slice(0, 2).join(' or ')}`,
        co2Impact: co2Impact * 0.3,
        distanceReduction: 80,
        nutritionalSimilarity: "Similar vitamin and fiber profile",
        benefits: [
          "In-season fruits have optimal nutrient content",
          "Grown within your region reducing transportation emissions",
          "Supports seasonal eating patterns"
        ]
      });
      
      // Add berries as high-nutrition alternative
      alternatives.push({
        name: `Local berries when in season`,
        co2Impact: co2Impact * 0.25,
        distanceReduction: 85,
        nutritionalSimilarity: "Higher in antioxidants and lower in sugar",
        benefits: [
          "More nutrient-dense than most fruits",
          "Lower sugar content but rich in vitamins",
          "When locally sourced, minimal transportation emissions"
        ]
      });
    }
    else if (group === 'vegetables') {
      // For vegetables, suggest local seasonal varieties
      alternatives.push({
        name: `Seasonal ${similarItems.slice(0, 2).join(' or ')}`,
        co2Impact: co2Impact * 0.2,
        distanceReduction: 90,
        nutritionalSimilarity: "Similar vegetable nutrient profile",
        benefits: [
          "Locally grown vegetables have minimal transportation emissions",
          "Seasonal varieties require less energy for production",
          "Fresh harvest means higher vitamin content"
        ]
      });
      
      // Add leafy greens as nutrient-dense alternative
      alternatives.push({
        name: `Local leafy greens`,
        co2Impact: co2Impact * 0.15,
        distanceReduction: 95,
        nutritionalSimilarity: "Higher in certain nutrients and lower in calories",
        benefits: [
          "More nutrient-dense than many vegetables",
          "Can often be grown year-round in greenhouses with minimal heating",
          "Very low carbon footprint when locally sourced"
        ]
      });
    }
    else {
      // Generic alternative based on food group
      alternatives.push({
        name: `Local ${group.replace('_', ' ')}`,
        co2Impact: co2Impact * 0.3,
        distanceReduction: 85,
        nutritionalSimilarity: `Similar ${nutrition}`,
        benefits: [
          `Provides comparable ${nutrition}`,
          "Significantly lower transportation emissions",
          "Often fresher with potentially higher nutrient content"
        ]
      });
    }
    
    console.log("Generated alternatives:", alternatives);
    
    // Make sure we have at least one alternative but no more than 3
    return alternatives.slice(0, 3);
  } catch (error) {
    console.error('Error generating alternatives:', error);
    
    // Ensure we return at least one fallback alternative
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
};

// Generate local and high-efficiency alternatives
const generateLocalAlternatives = async (
  produceName: string,
  co2Impact: number,
  sourceLocation: string,
  userLocation: string
): Promise<AlternativeOption[]> => {
  try {
    // Get food group information
    const foodGroupInfo = findFoodGroupInfo(produceName);
    
    const model = await loadBertModel().catch(() => null);
    const alternatives: AlternativeOption[] = [];
    
    // Check if the same produce could be grown locally
    if (model) {
      const query = `Can ${produceName} be grown locally in ${userLocation} instead of importing from ${sourceLocation}?`;
      console.log("Local cultivation query:", query);
      const result = await model(query);
      console.log("Local cultivation result:", result);
      
      // If local cultivation is possible
      if (result[0]?.label === 'POSITIVE') {
        alternatives.push({
          name: `Locally grown ${produceName}`,
          co2Impact: co2Impact * 0.2,
          distanceReduction: 90,
          nutritionalSimilarity: "Identical nutritional profile",
          benefits: [
            "Same food with dramatically lower transportation emissions",
            "Fresher with potentially higher vitamin content",
            "Supports local agriculture and food security"
          ]
        });
      }
    }
    
    // If we have food group info, suggest efficient local alternatives
    if (foodGroupInfo) {
      // For plant foods, suggest gardening options
      alternatives.push({
        name: "Home or community garden options",
        co2Impact: co2Impact * 0.05,
        distanceReduction: 99,
        nutritionalSimilarity: "Can be nutritionally equivalent or superior",
        benefits: [
          "Zero food miles with minimal carbon footprint",
          "Maximum freshness and nutrition",
          "Promotes self-sufficiency and food literacy"
        ]
      });
      
      // Suggest a different food group with similar nutrition but higher efficiency
      if (['tropical_fruits', 'fruits'].includes(foodGroupInfo.group)) {
        alternatives.push({
          name: "Local vegetables with similar vitamins",
          co2Impact: co2Impact * 0.2,
          distanceReduction: 90,
          nutritionalSimilarity: "Different food group but similar key nutrients",
          benefits: [
            "Local vegetables often provide similar vitamins with lower emissions",
            "Generally require less resources to grow than fruits",
            "Year-round availability in many regions"
          ]
        });
      } 
      else if (foodGroupInfo.group === 'vegetables') {
        alternatives.push({
          name: "Local legumes or grains",
          co2Impact: co2Impact * 0.15,
          distanceReduction: 90,
          nutritionalSimilarity: "Different profile with more protein and fiber",
          benefits: [
            "Excellent shelf-stable alternatives to fresh produce",
            "Higher protein content than vegetables",
            "Can be stored without refrigeration, reducing energy use"
          ]
        });
      }
    } 
    else {
      // Generic local alternative if we couldn't determine food group
      alternatives.push({
        name: `Local food alternatives`,
        co2Impact: co2Impact * 0.25,
        distanceReduction: 85,
        benefits: [
          "Significantly lower transportation emissions",
          "Supports local food economy",
          "Generally lower overall environmental impact"
        ]
      });
    }
    
    console.log("Generated local alternatives:", alternatives);
    
    // Return up to 3 alternatives
    return alternatives.slice(0, 3);
  } catch (error) {
    console.error('Error generating local alternatives:', error);
    
    // Return a fallback alternative
    return [{
      name: `Local alternatives`,
      co2Impact: co2Impact * 0.3,
      distanceReduction: 85,
      benefits: [
        "Reduced transportation emissions",
        "Support for regional food systems",
        "Often fresher and more seasonal"
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
    toast({
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
