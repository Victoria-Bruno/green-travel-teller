
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
    
    console.log("Using access token:", accessToken ? "Token exists" : "No token");
    
    // Need to set the global token first
    env.accessToken = accessToken;
    
    // Then also pass it to the pipeline options
    const options = {
      accessToken: accessToken,
      revision: "main",
      quantized: false
    };

    // Create pipeline with proper options for text generation
    const generationModel = await pipeline(
      "text-generation", 
      "google/gemma-2b-it", 
      options
    );

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

    // Format prompt for gemma model - using proper message format
    const messages = [
      {
        role: "user", 
        content: `Describe which ripening method is used for ${produceName} imported in ${userLocation}?`
      }
    ];

    console.log("Generating ripening info with messages:", messages);
    
    // Call the AI model with proper parameters
    const result = await generationModel(messages, { 
      max_new_tokens: 150,
      temperature: 0.3
    });
    
    console.log("Raw AI response for ripening:", result);
    
    // Extract the generated text properly
    let generatedText = "";
    if (result && Array.isArray(result) && result.length > 0) {
      if (result[0].generated_text) {
        const lastMessage = result[0].generated_text;
        // Extract content from the assistant's response
        if (Array.isArray(lastMessage) && lastMessage.length > 0) {
          const assistantMessage = lastMessage.find(msg => msg.role === "assistant");
          if (assistantMessage && assistantMessage.content) {
            generatedText = assistantMessage.content;
          } else {
            // Fallback: just get the last message content
            generatedText = lastMessage[lastMessage.length - 1].content || "";
          }
        } else if (typeof lastMessage === 'string') {
          generatedText = lastMessage;
        }
      }
    }
    
    // More generic fallback - try to parse the full response if still no text
    if (!generatedText && result) {
      try {
        // Try to access the response as a string
        generatedText = JSON.stringify(result);
      } catch (e) {
        console.error("Could not stringify result:", e);
      }
    }
    
    console.log("Processed ripening text:", generatedText);
    return generatedText || "Information not available";
  } catch (error) {
    console.error("Error getting ripening information:", error);
    return "Information not available due to an error.";
  }
};

// Generate sustainable alternatives with similar fixes
const generateSustainableAlternatives = async (
  produceName: string,
  userLocation: string,
  generationModel: any
): Promise<string> => {
  try {
    if (!generationModel) {
      throw new Error("AI model not available");
    }

    // Create a message array for the model
    const messages = [
      {
        role: "user", 
        content: `List three sustainable alternatives to ${produceName} in ${userLocation}. Explain why these are good alternatives.`
      }
    ];

    console.log("Generating alternatives with messages:", messages);
    
    // Call the AI model with correct parameters
    const result = await generationModel(messages, { 
      max_new_tokens: 250,
      temperature: 0.3,
    }); 

    console.log("Raw AI response for sustainable alternatives:", result);
    
    // Extract the generated text properly
    let generatedText = "";
    if (result && Array.isArray(result) && result.length > 0) {
      if (result[0].generated_text) {
        const lastMessage = result[0].generated_text;
        // Extract content from the assistant's response
        if (Array.isArray(lastMessage) && lastMessage.length > 0) {
          const assistantMessage = lastMessage.find(msg => msg.role === "assistant");
          if (assistantMessage && assistantMessage.content) {
            generatedText = assistantMessage.content;
          } else {
            // Fallback: just get the last message content
            generatedText = lastMessage[lastMessage.length - 1].content || "";
          }
        } else if (typeof lastMessage === 'string') {
          generatedText = lastMessage;
        }
      }
    }
    
    // More generic fallback - try to parse the full response if still no text
    if (!generatedText && result) {
      try {
        // Try to access the response as a string
        generatedText = JSON.stringify(result);
      } catch (e) {
        console.error("Could not stringify result:", e);
      }
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
    const ripeningMethod = await getRipeningMethodInfo(produceName, userLocationString, generationModel);

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
