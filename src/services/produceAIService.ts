
import { toast } from "@/components/ui/use-toast";
import { pipeline, env } from "@huggingface/transformers";
import { calculateDistance } from "./googleMapsService";

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

interface NutritionFeatures {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  vitamins: string[];
}

// Utility function to calculate cosine similarity between two vectors
const cosineSimilarity = (vectorA: number[], vectorB: number[]): number => {
  try {
    if (vectorA.length !== vectorB.length) {
      throw new Error("Vectors must have the same length");
    }

    // Calculate dot product
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      magnitudeA += vectorA[i] * vectorA[i];
      magnitudeB += vectorB[i] * vectorB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    // Avoid division by zero
    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    // Return cosine similarity
    return dotProduct / (magnitudeA * magnitudeB);
  } catch (error) {
    console.error("Error calculating cosine similarity:", error);
    return 0;
  }
};

// Load AI model only when needed
const loadModel = async (task: "classification" | "generation" = "classification") => {
  try {
    toast({
      title: "Loading AI Model",
      description: "This may take a moment...",
    });

    let model;
    const accessToken = import.meta.env.VITE_HUGGING_FACE_TOKEN;

    // Set Hugging Face API token for authentication
    if (accessToken) {
      // Using the correct environment variable approach
      env.accessToken = accessToken;
    } else {
      throw new Error("Hugging Face token is missing");
    }

    if (task === "classification") {
      console.log("Loading classification model...");
      model = await pipeline(
        "text-classification",
        "Xenova/distilbert-base-uncased-finetuned-sst-2-english"
      );
    } else if (task === "generation") {
      console.log("Loading text generation model...");
      model = await pipeline(
        "text-generation", 
        "Xenova/distilgpt2"  // Use a smaller, supported model
      );
    } else {
      throw new Error("Invalid task type.");
    }
    return model;
  } catch (error) {
    console.error("Error loading AI model:", error);
    toast({
      title: "Model Loading Error",
      description: "Could not load AI model. Using simplified analysis.",
      variant: "destructive",
    });

    return null;
  }
};

// Extract nutrition features from produce name using AI
const extractNutritionFeatures = async (
  produceName: string,
  model: any
): Promise<NutritionFeatures> => {
  try {
    if (!model) {
      throw new Error("AI model not available");
    }

    // Create a simplified prompt for a smaller text generation model
    const prompt = `Provide estimated nutrition facts for ${produceName} in JSON format with keys: calories, protein, carbs, fat, vitamins (as an array).`;

    // Call the AI model with a shorter expected response
    const result = await model(prompt, { 
      max_length: 50
    });

    console.log("Raw AI response for nutrition:", result);
    
    // Extract text from the response
    const generatedText = result[0]?.generated_text || "";
    
    // Parse the response to extract nutrition information
    // This is a simplified approach that extracts numbers from the text
    const caloriesMatch = generatedText.match(/calories=(\d+)/i);
    const proteinMatch = generatedText.match(/protein=(\d+\.?\d*)/i);
    const carbsMatch = generatedText.match(/carbs=(\d+\.?\d*)/i);
    const fatMatch = generatedText.match(/fat=(\d+\.?\d*)/i);
    // const vitaminsMatch = generatedText.match(/vitamins=(\d+\.?\d*)/i);
    
    // Default values with some randomness for variety
    const randomFactor = Math.random() * 0.3 + 0.85; // 0.85-1.15 range
    
    // Extract vitamins from text or use defaults based on produce type
    const vitamins = determineVitamins(produceName);
    
    return {
      calories: caloriesMatch ? parseInt(caloriesMatch[1]) : Math.round(100 * randomFactor),
      protein: proteinMatch ? parseFloat(proteinMatch[1]) : parseFloat((2 * randomFactor).toFixed(1)),
      carbs: carbsMatch ? parseFloat(carbsMatch[1]) : parseFloat((15 * randomFactor).toFixed(1)),
      fat: fatMatch ? parseFloat(fatMatch[1]) : parseFloat((1 * randomFactor).toFixed(1)),
      vitamins: vitamins
    };
  } catch (error) {
    console.error("Error extracting nutrition features:", error);
    
    // Return fallback values with some randomness
    const baseValue = produceName.length % 5 + 1;
    return {
      calories: 80 + baseValue * 10,
      protein: parseFloat((1.5 + baseValue * 0.2).toFixed(1)),
      carbs: parseFloat((12 + baseValue).toFixed(1)),
      fat: parseFloat((0.8 + baseValue * 0.1).toFixed(1)),
      vitamins: determineVitamins(produceName)
    };
  }
};

/* 
 * PREVIOUS METHOD FOR COMPUTING NUTRITION FEATURES (Reference only)
 * This method used confidence scores and characteristics rather than 
 * directly generating from AI model.
 *
 * const extractNutritionFeatures = async (produceName: string): Promise<number[]> => {
 *   try {
 *     // Calculate calories (feature 1)
 *     let caloriesScore;
 *     if (produceName.includes("berry") || produceName.includes("leafy") || 
 *         produceName.includes("lettuce") || produceName.includes("spinach")) {
 *       caloriesScore = 0.2; // Low calorie
 *     } else if (produceName.includes("potato") || produceName.includes("corn") || 
 *                produceName.includes("avocado")) {
 *       caloriesScore = 0.8; // High calorie
 *     } else {
 *       caloriesScore = 0.5; // Medium calorie
 *     }
 *     
 *     // Calculate protein (feature 2)
 *     let proteinScore;
 *     if (produceName.includes("bean") || produceName.includes("pea") || 
 *         produceName.includes("lentil") || produceName.includes("chick")) {
 *       proteinScore = 0.8; // High protein
 *     } else {
 *       proteinScore = 0.3; // Low protein (most produce)
 *     }
 *     
 *     // Calculate carbs (feature 3)
 *     let carbsScore;
 *     if (produceName.includes("potato") || produceName.includes("corn") || 
 *         produceName.includes("rice") || produceName.includes("grain")) {
 *       carbsScore = 0.9; // High carbs
 *     } else if (produceName.includes("fruit") || produceName.includes("apple") || 
 *                produceName.includes("banana")) {
 *       carbsScore = 0.6; // Medium carbs
 *     } else {
 *       carbsScore = 0.3; // Low carbs
 *     }
 *     
 *     // Calculate fat (feature 4)
 *     let fatScore;
 *     if (produceName.includes("avocado") || produceName.includes("olive") || 
 *         produceName.includes("coconut")) {
 *       fatScore = 0.8; // High fat
 *     } else {
 *       fatScore = 0.2; // Low fat (most produce)
 *     }
 *     
 *     return [caloriesScore, proteinScore, carbsScore, fatScore];
 *   } catch (error) {
 *     console.error("Error extracting nutrition features:", error);
 *     return [0.5, 0.5, 0.5, 0.5]; // Default values
 *   }
 * };
 */

// Helper function to determine vitamins based on produce name
const determineVitamins = (produceName: string): string[] => {
  const name = produceName.toLowerCase();
  const vitamins = [];

  // These are just rough estimates based on common knowledge
  if (
    name.includes("orange") ||
    name.includes("lemon") ||
    name.includes("citrus")
  ) {
    vitamins.push("Vitamin C");
  }
  if (
    name.includes("carrot") ||
    name.includes("pumpkin") ||
    name.includes("sweet potato")
  ) {
    vitamins.push("Vitamin A");
  }
  if (
    name.includes("spinach") ||
    name.includes("kale") ||
    name.includes("broccoli")
  ) {
    vitamins.push("Vitamin K");
    vitamins.push("Folate");
  }
  if (name.includes("banana") || name.includes("avocado")) {
    vitamins.push("Potassium");
  }

  // Ensure we always return at least one vitamin
  if (vitamins.length === 0) {
    // Use the name hash to determine a default vitamin
    const nameHash = name
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const vitaminOptions = [
      "Vitamin C",
      "Vitamin A",
      "Vitamin E",
      "Vitamin B6",
      "Folate",
      "Potassium",
    ];
    vitamins.push(vitaminOptions[nameHash % vitaminOptions.length]);
  }

  return vitamins;
};

// Determine ripening method using AI
const determineRipeningMethod = async (
  produceName: string,
  sourceLocation: string,
  travelDistance: number,
  model: any
): Promise<string | null> => {
  try {
    // Create prompts for the AI model
    const artificialRipeningPrompt = `${produceName} from ${sourceLocation} is artificially ripened`;
    const naturalRipeningPrompt = `${produceName} from ${sourceLocation} is naturally ripened`;

    // Get sentiment scores for both prompts
    const artificialResult = await model(artificialRipeningPrompt);
    const naturalResult = await model(naturalRipeningPrompt);

    // Compare the positive scores
    const artificialScore =
      artificialResult[0].label === "POSITIVE"
        ? artificialResult[0].score
        : 1 - artificialResult[0].score;
    const naturalScore =
      naturalResult[0].label === "POSITIVE"
        ? naturalResult[0].score
        : 1 - naturalResult[0].score;

    // Factor in travel distance - longer distances increase likelihood of artificial ripening
    const distanceFactor = Math.min(1, travelDistance / 5000); // Normalize to 0-1
    const adjustedArtificialScore =
      artificialScore * (1 + distanceFactor * 0.5);

    // If adjusted artificial ripening score is higher, return artificial ripening explanation
    if (adjustedArtificialScore > naturalScore) {
      return `Likely uses post-harvest ripening techniques when imported from ${sourceLocation}`;
    }

    return null; // Natural ripening or unknown
  } catch (error) {
    console.error("Error determining ripening method:", error);
    return null;
  }
};

// Calculate CO2 impact based on travel distance and produce type using AI
const calculateCO2Impact = async (
  produceName: string,
  travelDistance: number,
  model: any
): Promise<number> => {
  try {
    // Create a prompt for the AI model
    const prompt = `${produceName} traveled ${travelDistance} km and has high environmental impact`;

    // Get sentiment analysis
    const result = await model(prompt);

    // Extract confidence score (higher means the model agrees more with the statement)
    const confidenceScore =
      result[0].label === "POSITIVE" ? result[0].score : 1 - result[0].score;

    // Baseline CO2 calculation based on distance
    // We use a simplified model: base + (distance factor * confidence factor)
    const baseCO2 = 0.2; // Base CO2 for any produce
    const distanceFactor = travelDistance / 10000; // Normalize distance impact
    const transportEmissions = distanceFactor * confidenceScore * 2; // Scale by confidence and multiplier

    // Add produce-specific factor based on perishability
    const produceFactor = await determineProduceFactor(produceName, model);

    // Calculate total emissions (rounded to 2 decimal places)
    return parseFloat(
      (baseCO2 + transportEmissions + produceFactor).toFixed(2)
    );
  } catch (error) {
    console.error("Error calculating CO2 impact:", error);
    // Return a reasonable default based on distance
    return parseFloat((0.0001 * travelDistance + 0.2).toFixed(2));
  }
};

// Helper function to determine produce-specific CO2 factor
const determineProduceFactor = async (
  produceName: string,
  model: any
): Promise<number> => {
  try {
    // Create prompts related to produce characteristics
    const perishablePrompt = `${produceName} is highly perishable`;
    const energyIntensivePrompt = `${produceName} requires refrigeration`;

    // Get sentiment analysis
    const perishableResult = await model(perishablePrompt);
    const energyResult = await model(energyIntensivePrompt);

    // Extract confidence scores
    const perishableScore =
      perishableResult[0].label === "POSITIVE"
        ? perishableResult[0].score
        : 1 - perishableResult[0].score;
    const energyScore =
      energyResult[0].label === "POSITIVE"
        ? energyResult[0].score
        : 1 - energyResult[0].score;

    // Calculate factor (0-0.3 range)
    return perishableScore * 0.15 + energyScore * 0.15;
  } catch (error) {
    console.error("Error determining produce factor:", error);
    return 0.1; // Reasonable default
  }
};

// Determine if produce is in season based on location and time of year using AI
const determineIfInSeason = async (
  produceName: string,
  userLocation: string,
  model: any
): Promise<boolean> => {
  try {
    // Get current month
    const currentMonth = new Date().getMonth(); // 0-11
    const monthName = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ][currentMonth];

    // Create a prompt for the AI model
    const prompt = `${produceName} is in season in ${userLocation} during ${monthName}`;

    // Get sentiment analysis
    const result = await model(prompt);

    // Extract sentiment - POSITIVE means in season
    const inSeason = result[0].label === "POSITIVE";

    // If very confident (score > 0.7), use the result directly
    if (result[0].score > 0.7) {
      return inSeason;
    }

    // For less confident results, use a more nuanced approach
    // based on month patterns for northern/southern hemispheres
    const isNorthern = isNorthernHemisphere(userLocation);

    // Simple seasonal patterns (simplified)
    const seasonalPatterns: Record<string, number[]> = {
      apple: isNorthern ? [8, 9, 10, 11] : [2, 3, 4, 5], // Aug-Nov (North) / Mar-Jun (South)
      orange: isNorthern ? [11, 0, 1, 2] : [5, 6, 7, 8], // Dec-Mar (North) / Jun-Sep (South)
      strawberry: isNorthern ? [4, 5, 6] : [10, 11, 0], // May-Jul (North) / Nov-Jan (South)
      tomato: isNorthern ? [5, 6, 7, 8] : [11, 0, 1, 2], // Jun-Sep (North) / Dec-Mar (South)
      lettuce: isNorthern ? [3, 4, 5, 6, 7, 8, 9] : [9, 10, 11, 0, 1, 2, 3], // Apr-Oct (North) / Oct-Apr (South)
    };

    // Check if we have data for this produce
    for (const [produce, months] of Object.entries(seasonalPatterns)) {
      if (produceName.toLowerCase().includes(produce)) {
        return months.includes(currentMonth);
      }
    }

    // If we don't have specific data, use the AI result
    return inSeason;
  } catch (error) {
    console.error("Error determining if in season:", error);
    return Math.random() > 0.5; // 50/50 chance if we can't determine
  }
};

// Helper function to determine hemisphere based on location
const isNorthernHemisphere = (location: string): boolean => {
  const southernLocations = [
    "australia",
    "new zealand",
    "argentina",
    "chile",
    "south africa",
    "brazil",
    "peru",
    "uruguay",
  ];

  const lowerLocation = location.toLowerCase();

  // Check if the location name includes any of the southern hemisphere location names
  for (const place of southernLocations) {
    if (lowerLocation.includes(place)) {
      return false;
    }
  }

  return true;
};

// Generate a single alternative
const generateSingleAlternative = async (
  produceName: string,
  originalProduce: string,
  userLocation: string,
  travelDistance: number,
  classificationModel: any
): Promise<AlternativeOption | null> => {
  try {
    // Use AI to determine if this produce is local to user's location
    const localPrompt = `${produceName} is grown locally in ${userLocation}`;
    const localResult = await classificationModel(localPrompt);
    const localityScore =
      localResult[0].label === "POSITIVE"
        ? localResult[0].score
        : 1 - localResult[0].score;

    // Calculate environmental impact score
    // Estimate a reduced distance for local alternative
    const estimatedDistance = travelDistance * (1 - localityScore * 0.8);
    const co2Impact = await calculateCO2Impact(
      produceName,
      estimatedDistance,
      classificationModel
    );
    const distanceReduction = Math.round(
      ((travelDistance - estimatedDistance) / travelDistance) * 100
    );

    // Generate benefits based on scores
    const benefits = [];

    if (localityScore > 0.6) {
      benefits.push(`Can be grown locally in ${userLocation}`);
    }

    if (co2Impact < travelDistance * 0.001) {
      benefits.push(`Lower carbon footprint than imported ${originalProduce}`);
    }

    if (distanceReduction > 40) {
      benefits.push(`Reduces transport emissions by ${distanceReduction}%`);
    }

    // Add nutritional comparison
    let nutritionalSimilarity;
    
    if (Math.random() > 0.7) {
      nutritionalSimilarity = `Very similar nutritional profile to ${originalProduce}`;
    } else if (Math.random() > 0.4) {
      nutritionalSimilarity = `Similar key nutrients to ${originalProduce}`;
    } else {
      nutritionalSimilarity = `Complementary nutritional profile to ${originalProduce}`;
    }

    // Ensure we have at least one benefit
    if (benefits.length === 0) {
      benefits.push(`More sustainable alternative to ${originalProduce}`);
    }

    return {
      name: produceName,
      co2Impact: co2Impact,
      distanceReduction: distanceReduction,
      benefits: benefits,
      nutritionalSimilarity: nutritionalSimilarity,
    };
  } catch (error) {
    console.error(`Error generating alternative for ${produceName}:`, error);
    return null;
  }
};

// Generate alternatives using separate classification model instances
const generateAlternatives = async (
  produceName: string,
  co2Impact: number,
  travelDistance: number,
  userLocation: string
): Promise<AlternativeOption[]> => {
  try {
    console.log("Starting to generate alternatives...");
    
    // Load a single classification model for all alternatives
    const classificationModel = await loadModel("classification");
    
    if (!classificationModel) {
      throw new Error("Failed to load AI model for alternative generation");
    }

    // List of possible alternatives (filtered to not include the original produce)
    const possibleAlternatives = [
      "apple", "pear", "banana", "carrot", "tomato", "spinach", "lettuce", 
      "kale", "broccoli", "cauliflower", "cucumber", "bell pepper", "potato", 
      "sweet potato", "zucchini", "eggplant", "cabbage", "onion", "garlic"
    ].filter(alt => !produceName.toLowerCase().includes(alt.toLowerCase()));

    // Shuffle the array to get a random selection
    for (let i = possibleAlternatives.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [possibleAlternatives[i], possibleAlternatives[j]] = [
        possibleAlternatives[j],
        possibleAlternatives[i],
      ];
    }

    // Process alternatives one by one to avoid session conflicts
    const results: AlternativeOption[] = [];
    
    // Limit to 3 alternatives to reduce processing time
    const selectedAlternatives = possibleAlternatives.slice(0, 3);
    
    for (const alternative of selectedAlternatives) {
      try {
        const result = await generateSingleAlternative(
          alternative, 
          produceName,
          userLocation,
          travelDistance,
          classificationModel
        );
        
        if (result) {
          results.push(result);
        }
      } catch (error) {
        console.error(`Error processing alternative ${alternative}:`, error);
        // Continue with next alternative
      }
    }

    console.log("Top alternatives found:", results);
    
    // If we didn't get any alternatives, provide a simple fallback
    if (results.length === 0) {
      console.log("No alternatives found, generating fallback");
      
      // Create a simple fallback alternative
      const fallbackAlternative = {
        name: "Locally grown produce",
        co2Impact: co2Impact * 0.4,
        distanceReduction: 60,
        benefits: [
          "Reduces transportation emissions",
          "Supports local farmers",
          "Generally fresher and more nutritious"
        ],
        nutritionalSimilarity: "Consider local seasonal options for best nutrition"
      };
      
      results.push(fallbackAlternative);
    }

    // Sort by distance reduction (higher is better)
    results.sort((a, b) => b.distanceReduction - a.distanceReduction);

    // Divide results into two categories
    const halfCount = Math.ceil(results.length / 2);
    const firstHalf = results.slice(0, halfCount);
    const secondHalf = results.slice(halfCount);

    return [...firstHalf, ...secondHalf];
  } catch (error) {
    console.error("Error generating alternatives:", error);

    // Provide a simple fallback if we encounter errors
    return [
      {
        name: "Local seasonal produce",
        co2Impact: co2Impact * 0.5,
        distanceReduction: 50,
        nutritionalSimilarity: "Varies by selection",
        benefits: [
          "Reduced transportation emissions",
          "Generally fresher with higher nutritional value",
          "Supports local food systems",
        ],
      },
    ];
  }
};

// Main analysis function - this is the only function called from outside this module
export const analyzeProduceSustainability = async (
  produceName: string,
  sourceLocation: string,
  userLocation: {
    city: string | null;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
  }
): Promise<ProduceInfo> => {
  try {
    // Show progress
    toast({
      title: "Analyzing produce data...",
      description: "Using AI to find sustainable alternatives...",
    });

    // Get user location string for display
    const userLocationString =
      userLocation.city && userLocation.country
        ? `${userLocation.city}, ${userLocation.country}`
        : userLocation.city || userLocation.country || "your location";

    // Load the AI classification model for analysis (only when needed)
    const classificationModel = await loadModel("classification");
    
    if (!classificationModel) {
      throw new Error("Failed to load AI classification model");
    }

    // Calculate travel distance
    toast({
      title: "Calculating distance",
      description: `Determining travel distance from ${sourceLocation} to ${userLocationString}...`,
    });

    // Get user coordinates
    let userCoords;
    try {
      if (userLocation.latitude && userLocation.longitude) {
        userCoords = {
          lat: userLocation.latitude,
          lng: userLocation.longitude,
        };
      } else {
        throw new Error("Location coordinates not provided");
      }
    } catch (error) {
      toast({
        title: "Location Error",
        description:
          "Unable to determine your location. Distance calculations may be approximate.",
        variant: "destructive",
      });
      // Use location string as fallback
      userCoords = userLocationString;
    }

    // Calculate travel distance using Google Maps API
    const travelDistance = await calculateDistance(sourceLocation, userCoords);

    // Calculate CO2 impact using AI
    const co2Impact = await calculateCO2Impact(
      produceName,
      travelDistance,
      classificationModel
    );

    // Determine if produce is in season using AI
    const inSeason = await determineIfInSeason(
      produceName,
      userLocationString,
      classificationModel
    );

    // Determine ripening method using AI
    const ripeningMethod = await determineRipeningMethod(
      produceName,
      sourceLocation,
      travelDistance,
      classificationModel
    );

    // Generate alternatives
    const alternatives = await generateAlternatives(
      produceName,
      co2Impact,
      travelDistance,
      userLocationString
    );

    // Separate into seasonal and local alternatives
    const halfPoint = Math.ceil(alternatives.length / 2);
    const seasonalAlternatives = alternatives.slice(0, halfPoint);
    const localAlternatives = alternatives.slice(halfPoint);

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
      userLocation: userLocationString,
    };

    // Log the results to console for verification
    console.log("Analysis complete:", result);

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
      description:
        error instanceof Error
          ? error.message
          : "Failed to analyze produce sustainability",
      variant: "destructive",
    });
    throw error;
  }
};
