
import { toast } from "@/components/ui/use-toast";
import { pipeline } from "@huggingface/transformers";

// Configure transformers.js to use browser cache
const config = {
  allowLocalModels: false,
  useBrowserCache: true
};

// Simplified types for basic produce info
export interface ProduceInfo {
  name: string;
  source: string;
  co2Impact: number;
  travelDistance: number;
  ripeningMethod: string;
  rawAlternativesText: string;
  userLocation: string;
}

// Simplified function to load the model
const loadModel = async () => {
  try {
    toast({
      title: "Loading AI Model",
      description: "Fetching information about ripening methods...",
    });

    // Get token from localStorage
    const token = localStorage.getItem('VITE_HUGGING_FACE_TOKEN');
    
    if (!token) {
      console.error("Missing Hugging Face token in localStorage");
      throw new Error("Please add your Hugging Face API key above to analyze produce.");
    }

    // Use a smaller, faster text generation model
    const model = await pipeline("text-generation", "TinyLlama/TinyLlama-1.1B-Chat-v1.0", {
      quantized: true, // Use quantized model for better performance
      accessToken: token, // Pass token as an option
    });
    
    console.log("Model loaded successfully");
    return model;
  } catch (error) {
    console.error("Error loading AI model:", error);
    toast({
      title: "Error Loading Model",
      description: error instanceof Error ? error.message : "Could not load the AI model",
      variant: "destructive",
    });
    return null;
  }
};

// Calculate CO2 impact based on travel distance
const calculateCO2Impact = (travelDistance: number): number => {
  // Simple calculation based on distance
  const baseCO2 = 0.2;
  const distanceFactor = travelDistance / 10000;
  return parseFloat((baseCO2 + distanceFactor * 2).toFixed(2));
};

// Get information about the ripening method for a specific produce
const getRipeningMethodInfo = async (
  produceName: string,
  sourceLocation: string,
  model: any
): Promise<string> => {
  try {
    if (!model) {
      return "Information not available. Please check your API key.";
    }

    // Create a clear, specific prompt
    const prompt = `
    <|im_start|>user
    What ripening method is commonly used for ${produceName} that is imported from ${sourceLocation}? Please provide a brief, factual description in 2-3 sentences.
    <|im_end|>
    <|im_start|>assistant
    `;

    console.log("Generating ripening info with prompt:", prompt);
    
    // Call the model with appropriate parameters
    const result = await model(prompt, {
      max_new_tokens: 150,
      temperature: 0.3,
      top_p: 0.95,
    });
    
    // Extract the answer from the response
    let response = "";
    if (result && Array.isArray(result) && result.length > 0) {
      response = result[0].generated_text || "";
      
      // Clean up the response - extract only the assistant's reply
      const assistantPart = response.split("<|im_start|>assistant")[1];
      if (assistantPart) {
        response = assistantPart.split("<|im_end|>")[0].trim();
      } else {
        // If the split didn't work, just remove the prompt
        response = response.replace(prompt, "").trim();
      }
    }
    
    console.log("Processed ripening text:", response);
    return response || "Information about ripening methods could not be generated.";
  } catch (error) {
    console.error("Error getting ripening information:", error);
    return "Error retrieving ripening information. Please try again.";
  }
};

// Main function to analyze produce sustainability
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
    toast({
      title: "Analyzing Produce",
      description: "Getting information about ripening methods...",
    });

    // Format user location for display
    const userLocationString =
      userLocation.city && userLocation.country
        ? `${userLocation.city}, ${userLocation.country}`
        : userLocation.city || userLocation.country || "your location";

    // Load the AI model
    const model = await loadModel();

    // Calculate travel distance from the Google Maps service
    const userCoords = userLocation.latitude && userLocation.longitude 
      ? { lat: userLocation.latitude, lng: userLocation.longitude }
      : userLocationString;
    
    // Import the service dynamically to avoid circular dependencies
    const { calculateDistance } = await import('./googleMapsService');
    const travelDistance = await calculateDistance(sourceLocation, userCoords);

    // Calculate CO2 impact based on distance
    const co2Impact = calculateCO2Impact(travelDistance);

    // Get ripening method information
    const ripeningMethod = await getRipeningMethodInfo(
      produceName,
      sourceLocation,
      model
    );

    // Create a simplified result with only the necessary information
    const result: ProduceInfo = {
      name: produceName,
      source: sourceLocation,
      co2Impact,
      travelDistance,
      ripeningMethod: ripeningMethod || "No ripening information available",
      rawAlternativesText: "Feature not available in this version", // Simplified
      userLocation: userLocationString,
    };

    console.log("Analysis complete:", result);

    toast({
      title: "Analysis Complete",
      description: "Ripening information retrieved successfully.",
    });

    return result;
  } catch (error) {
    console.error("Error analyzing produce:", error);
    
    toast({
      title: "Analysis Failed",
      description: error instanceof Error ? error.message : "Failed to analyze produce",
      variant: "destructive",
    });
    
    throw error;
  }
};
