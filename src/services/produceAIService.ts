
import { toast } from "@/components/ui/use-toast";
import { pipeline, env } from "@huggingface/transformers";
import { calculateDistance } from "./googleMapsService";

// Configure transformers.js to use browser cache
env.allowLocalModels = false;
env.useBrowserCache = true;

// Define simplified types
export interface ProduceInfo {
  name: string;
  source: string;
  co2Impact: number;
  travelDistance: number;
  ripeningMethod: string;
  isNaturalRipening: boolean;
  nutritionalInfo: NutritionInfo;
  userLocation: string;
  alternatives: AlternativeOption[];
}

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  primaryVitamin: string;
}

export interface AlternativeOption {
  name: string;
  co2Impact: number;
  distanceReduction: number;
  benefits: string[];
  nutritionalSimilarity?: string;
  sustainabilityReason: string;
}

// Load AI model only when needed
const loadModel = async () => {
  try {
    toast({
      title: "Loading AI Model",
      description: "This may take a moment...",
    });

    const accessToken = import.meta.env.VITE_HUGGING_FACE_TOKEN;

    // Set Hugging Face API token for authentication
    if (accessToken) {
      env.accessToken = accessToken; // Fixed property name
    } else {
      throw new Error("Hugging Face token is missing");
    }

    console.log("Loading text generation model...");
    const model = await pipeline(
      "text-generation", 
      "Xenova/distilgpt2"  // Using a smaller, supported model
    );
    
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

// Calculate CO2 impact based on travel distance
const calculateCO2Impact = (travelDistance: number): number => {
  try {
    // Simplified CO2 calculation based on distance
    const baseCO2 = 0.2; 
    const distanceFactor = travelDistance / 10000;
    const transportEmissions = distanceFactor * 2;
    
    // Add some randomness for variability
    const randomFactor = 0.9 + (Math.random() * 0.2);
    
    // Calculate total emissions (rounded to 2 decimal places)
    return parseFloat((baseCO2 + transportEmissions * randomFactor).toFixed(2));
  } catch (error) {
    console.error("Error calculating CO2 impact:", error);
    return parseFloat((0.0001 * travelDistance + 0.2).toFixed(2));
  }
};

// Simple function to get basic nutrition & ripening info
const getBasicProduceInfo = async (
  produceName: string,
  generationModel: any
): Promise<{nutritionInfo: NutritionInfo, ripeningMethod: string, isNaturalRipening: boolean}> => {
  try {
    if (!generationModel) {
      throw new Error("AI model not available");
    }

    // Create a prompt for the AI model
    const prompt = `Provide information on ripening method and estimated nutrition values for ${produceName} in JSON format with keys: calories, protein, carbs, primaryVitamin, ripeningMethod.`;

    // Call the AI model
    const result = await generationModel(prompt, { 
      max_length: 150,
      temperature: 0.7
    });
    
    console.log("Raw AI response for nutrition:", result);
    
    // Extract text from the response
    const generatedText = result[0]?.generated_text || "";
    
    // Try to extract JSON from the response or use regex
    let parsedData: any = {};
    try {
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        // Extract values using regex as fallback
        const caloriesMatch = generatedText.match(/calories[:\s]+(\d+)/i);
        const proteinMatch = generatedText.match(/protein[:\s]+(\d+\.?\d*)/i);
        const carbsMatch = generatedText.match(/carbs[:\s]+(\d+\.?\d*)/i);
        const vitaminMatch = generatedText.match(/primaryVitamin[:\s]+"?([A-Za-z\s]+)"?/i) || 
                            generatedText.match(/vitamin[:\s]+"?([A-Za-z\s]+)"?/i);
        const ripeningMatch = generatedText.match(/ripeningMethod[:\s]+"?([A-Za-z\s]+)"?/i);
        
        parsedData = {
          calories: caloriesMatch ? parseInt(caloriesMatch[1]) : 100,
          protein: proteinMatch ? parseFloat(proteinMatch[1]) : 2,
          carbs: carbsMatch ? parseFloat(carbsMatch[1]) : 15,
          primaryVitamin: vitaminMatch ? vitaminMatch[1].trim() : "Vitamin C",
          ripeningMethod: ripeningMatch ? ripeningMatch[1].trim() : "Natural"
        };
      }
    } catch (e) {
      console.error("Error parsing generated nutrition data:", e);
      // Provide fallback values
      parsedData = {
        calories: 100,
        protein: 2,
        carbs: 15,
        primaryVitamin: "Vitamin C",
        ripeningMethod: "Natural"
      };
    }
    
    // Ensure we have all required fields with reasonable values
    const nutritionInfo: NutritionInfo = {
      calories: typeof parsedData.calories === 'number' ? parsedData.calories : 100,
      protein: typeof parsedData.protein === 'number' ? parsedData.protein : 2,
      carbs: typeof parsedData.carbs === 'number' ? parsedData.carbs : 15,
      primaryVitamin: typeof parsedData.primaryVitamin === 'string' ? 
        parsedData.primaryVitamin : "Vitamin C"
    };
    
    const ripeningMethod = typeof parsedData.ripeningMethod === 'string' ? 
      parsedData.ripeningMethod : "Natural";
    
    const isNaturalRipening = ripeningMethod.toLowerCase().includes("natural");

    return {
      nutritionInfo,
      ripeningMethod,
      isNaturalRipening
    };
  } catch (error) {
    console.error("Error generating nutritional data:", error);
    
    // Return fallback values
    return {
      nutritionInfo: {
        calories: 100,
        protein: 2,
        carbs: 15,
        primaryVitamin: "Vitamin C"
      },
      ripeningMethod: "Natural",
      isNaturalRipening: true
    };
  }
};

// Generate sustainable alternatives - main function
const generateSustainableAlternatives = async (
  produceName: string,
  userLocation: string,
  generationModel: any
): Promise<AlternativeOption[]> => {
  try {
    if (!generationModel) {
      throw new Error("AI model not available");
    }

    // Create a direct prompt for the AI model
    const prompt = `What are the top 3 most sustainable alternatives to ${produceName} for someone living in ${userLocation}? 
    For each alternative, explain why it's more sustainable (lower emissions, less water usage, etc.) and 
    what nutritional similarities it has to ${produceName}. Format as a numbered list.`;

    // Call the AI model
    const result = await generationModel(prompt, { 
      max_length: 350,
      temperature: 0.7
    });

    console.log("Raw AI response for sustainable alternatives:", result);
    
    // Extract text from the response
    const generatedText = result[0]?.generated_text || "";
    
    // Parse the alternatives from the generated text
    const alternatives: AlternativeOption[] = [];
    const blocks = generatedText.split(/\d+\./);
    
    // Process each numbered section
    for (let i = 1; i < blocks.length && alternatives.length < 3; i++) {
      const block = blocks[i].trim();
      if (block.length === 0) continue;
      
      // Extract the product name - typically the first few words before a comma or period
      const nameMatch = block.match(/^([A-Za-z\s]+)(?:[,.:;]|\s-)/);
      let name = nameMatch ? nameMatch[1].trim() : `Alternative ${i}`;
      
      alternatives.push({
        name: name,
        co2Impact: 0.2 * i, // Simple approximation for demo
        distanceReduction: Math.round(60 - (i * 10)), // 50-60% range
        benefits: [
          "More sustainably grown",
          "Requires less resources",
          "Lower carbon footprint"
        ],
        nutritionalSimilarity: `Similar nutritional profile to ${produceName}`,
        sustainabilityReason: block // Use the entire block as the reason
      });
    }
    
    // If we couldn't extract enough options, add generic fallbacks
    while (alternatives.length < 3) {
      const i = alternatives.length + 1;
      alternatives.push({
        name: `Sustainable Alternative ${i}`,
        co2Impact: 0.2 * i,
        distanceReduction: Math.round(60 - (i * 10)),
        benefits: [
          "Generally more sustainable",
          "Typically requires less transportation",
          "Often grown with fewer pesticides"
        ],
        nutritionalSimilarity: `Alternative to ${produceName}`,
        sustainabilityReason: `A more sustainable option that can often be grown closer to ${userLocation}`
      });
    }
    
    return alternatives;
  } catch (error) {
    console.error("Error generating sustainable alternatives:", error);
    
    // Return fallback options
    return [1, 2, 3].map((i) => ({
      name: `Alternative ${i}`,
      co2Impact: 0.2 * i,
      distanceReduction: 60 - (i * 10),
      benefits: [
        "Generally more sustainable",
        "Typically requires less resources",
        "Usually has a lower carbon footprint"
      ],
      nutritionalSimilarity: "Similar nutritional value",
      sustainabilityReason: `A more sustainable alternative to ${produceName}`
    }));
  }
};

// Main analysis function - simplified
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

    // Load the AI generation model - only when needed
    const generationModel = await loadModel();
    
    if (!generationModel) {
      throw new Error("Failed to load AI generation model");
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

    // Calculate CO2 impact
    const co2Impact = calculateCO2Impact(travelDistance);

    // Step 1: Get basic nutrition data and ripening method
    const { nutritionInfo, ripeningMethod, isNaturalRipening } = 
      await getBasicProduceInfo(produceName, generationModel);

    // Step 2: Get sustainable alternatives directly
    const sustainableAlternatives = await generateSustainableAlternatives(
      produceName,
      userLocationString,
      generationModel
    );

    // Create the final result
    const result: ProduceInfo = {
      name: produceName,
      source: sourceLocation,
      co2Impact,
      travelDistance,
      ripeningMethod,
      isNaturalRipening,
      nutritionalInfo: nutritionInfo,
      userLocation: userLocationString,
      alternatives: sustainableAlternatives
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
