
import { toast } from "@/components/ui/use-toast";
import { pipeline, env } from "@huggingface/transformers";
import { calculateDistance, getUserLocationCoordinates } from "./googleMapsService";

// Configure transformers.js to use browser cache
env.allowLocalModels = false;
env.useBrowserCache = true;

// Simplified types for basic produce info
export interface ProduceInfo {
  name: string;
  source: string;
  co2Impact: number;
  travelDistance: number;
  ripeningMethod: string;
  rawAlternativesText: string; // Raw text from the LLM
  userLocation: string;
}

// Load AI model only when needed
const loadModel = async () => {
  try {
    toast({
      title: "Loading AI Model",
      description: "This may take a moment...",
    });

    const accessToken = import.meta.env.VITE_HUGGING_FACE_TOKEN;

    if (!accessToken) {
      throw new Error("Hugging Face token is missing");
    }
    env.accessToken = accessToken;

    const generationModel = await pipeline("text-generation", "google/gemma-2b-it", {
      revision: "main", // Ensures the latest model version is loaded
    });

    console.log("Model loaded successfully:", !!generationModel);
    return generationModel;
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

// Generate ripening method info
const getRipeningMethodInfo = async (
  produceName: string,
  userLocation: string,
  generationModel: any,
): Promise<string> => {
  try {
    if (!generationModel) {
      throw new Error("AI model not available");
    }

    // Simple prompt to get ripening method
    const prompt = `Describe which ripening method is used for ${produceName} imported in ${userLocation}?`;

    console.log("Generating ripening info with prompt:", prompt);
    
    // Call the AI model
    const result = await generationModel(prompt, { 
      max_length: 150,
      temperature: 0.3
    });
    
    console.log("Raw AI response for ripening:",  result);
    
    // Extract text from the response and ensure it's not empty
    // const generatedText = result && result[0]?.generated_text 
    //   ? result[0].generated_text.replace(prompt, "").trim() 
    //   : "Information not available";

      // const generatedText = result?.[0]?.generated_text?.replace(prompt, "").trim() || "Information not available";
      const rawText = result?.[0]?.generated_text ?? "Information not available";

      // Remove prompt + trim excessive \n
const cleanedText = rawText.replace(prompt, "").replace(/\n+/g, " ").trim();


console.log("Processed AI response:", cleanedText);

return cleanedText || "Information not available";
    

  } catch (error) {
    console.error("Error getting ripening information:", error);
    return "Information not available due to an error.";
  }
};

// Generate sustainable alternatives - main function that returns raw text
const generateSustainableAlternatives = async (
  produceName: string,
  userLocation: string,
  generationModel: any
): Promise<string> => {
  try {
    if (!generationModel) {
      throw new Error("AI model not available");
    }

    // Create a direct prompt for the AI model
    const prompt = `List three sustainable alternatives to ${produceName} in ${userLocation}. Explain why these are good alternatives.`;

    console.log("Generating alternatives with prompt:", prompt);
    
    // Call the AI model
    const result = await generationModel(prompt, { 
      max_length: 150,
      temperature: 0.3,
      top_p: 0.9,       // More focused sampling
    }); 

    console.log("Raw AI response for sustainable alternatives:", result);
    
    // Extract the generated text and ensure it's not empty
    // const generatedText = result && result[0]?.generated_text 
    //   ? result[0].generated_text.replace(prompt, "").trim() 
    //   : "Unable to generate alternatives.";

    const generatedText = result?.[0]?.generated_text?.trim() || "Information not available";

    // Prevent meaningless repetition
if (generatedText.includes("sanded sanded") || generatedText.length < 20) {
  return "The model struggled to generate a meaningful answer. Try again!";
}

    console.log("Extracted alternatives text:", generatedText);
    
    return generatedText || `Unable to generate alternatives for ${produceName}. Please try again.`;
    
  } catch (error) {
    console.error("Error generating sustainable alternatives:", error);
    return `Error generating alternatives: ${error instanceof Error ? error.message : "Unknown error"}`;
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

    // Get ripening method info - Now storing the raw text
    const ripeningMethod = await getRipeningMethodInfo(produceName,  userLocationString, generationModel);

    // Get sustainable alternatives as raw text
    const rawAlternativesText = await generateSustainableAlternatives(
      produceName,
      userLocationString,
      generationModel
    );

    // Create the final result with raw text
    const result: ProduceInfo = {
      name: produceName,
      source: sourceLocation,
      co2Impact,
      travelDistance,
      ripeningMethod: ripeningMethod || "No ripening information available",
      rawAlternativesText: rawAlternativesText || "No alternatives available",
      userLocation: userLocationString,
    };

    // Log the results to console for verification
    console.log("Analysis complete with raw alternatives text:", result);

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
