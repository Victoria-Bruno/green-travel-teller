
import { toast } from "@/components/ui/use-toast";
import { calculateDistance, getUserLocationCoordinates } from "./googleMapsService";

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

// Function to call the Hugging Face inference API
const generateText = async (prompt: string): Promise<string> => {
  try {
    const response = await fetch("/api", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: prompt,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to generate text");
    }

    const data = await response.json();
    
    // Extract the generated text from the response
    let generatedText = "";
    if (data && Array.isArray(data) && data.length > 0 && data[0].generated_text) {
      generatedText = data[0].generated_text;
      
      // Remove the prompt from the beginning if it's included
      if (generatedText.startsWith(prompt)) {
        generatedText = generatedText.substring(prompt.length).trim();
      }
    }
    
    return generatedText || "No information available";
  } catch (error) {
    console.error("Error generating text:", error);
    toast({
      title: "AI Model Error",
      description: error instanceof Error ? error.message : "Error connecting to AI model",
      variant: "destructive",
    });
    return "Information not available due to an error.";
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
  sourceLocation: string,
  userLocation: string
): Promise<string> => {
  const prompt = `Describe how ${produceName} is typically ripened when imported from ${sourceLocation} to ${userLocation}.`;
  
  toast({
    title: "Generating Ripening Info",
    description: "Getting ripening methods from AI...",
  });
  
  return generateText(prompt);
};

// Generate sustainable alternatives
const generateSustainableAlternatives = async (
  produceName: string,
  sourceLocation: string,
  userLocation: string
): Promise<string> => {
  const prompt = `List three sustainable alternatives to ${produceName} imported from ${sourceLocation} to ${userLocation}. Explain why these are good alternatives.`;
  
  toast({
    title: "Finding Alternatives",
    description: "Searching for sustainable alternatives...",
  });
  
  return generateText(prompt);
};

// Main analysis function
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
      description: "Calculating environmental impact...",
    });

    // Get user location string for display
    const userLocationString =
      userLocation.city && userLocation.country
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

    // Get ripening method info
    const ripeningMethod = await getRipeningMethodInfo(produceName, sourceLocation, userLocationString);

    // Get sustainable alternatives as raw text
    const rawAlternativesText = await generateSustainableAlternatives(produceName, sourceLocation, userLocationString);

    // Create the final result
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
