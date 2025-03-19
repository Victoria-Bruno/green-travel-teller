
import { toast } from "@/components/ui/use-toast";

interface UserLocation {
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface ProduceInfo {
  name: string;
  source: string;
  co2Impact: number;
  travelDistance: number;
  ripeningMethod: string | null;
  inSeason: boolean;
  seasonalAlternatives: AlternativeOption[];
  localAlternatives: AlternativeOption[];
}

export interface AlternativeOption {
  name: string;
  co2Impact: number;
  distanceReduction: number;
  benefits: string[];
}

export const analyzeProduceSustainability = async (
  apiKey: string,
  produceName: string,
  sourceLocation: string,
  userLocation: UserLocation
): Promise<ProduceInfo> => {
  if (!apiKey) {
    toast({
      title: "API Key Required",
      description: "Please enter your OpenAI API key to use this feature.",
      variant: "destructive",
    });
    throw new Error("OpenAI API key is required");
  }

  try {
    const currentMonth = new Date().getMonth();
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    
    const prompt = `
      You are an expert in sustainable agriculture and food supply chains. Analyze the environmental impact of the following produce:
      
      Produce Name: ${produceName}
      Source Location: ${sourceLocation}
      Consumer Location: ${userLocation.city || "Unknown"}, ${userLocation.country || "Unknown"}
      Current Month: ${monthNames[currentMonth]}
      
      Please provide the following information in JSON format:
      1. Approximate travel distance in kilometers from source to consumer location
      2. Estimated CO2 impact (kg CO2 per kg of produce)
      3. Typical ripening methods used for this produce during transport/storage (if any)
      4. Whether this produce is currently in season in Europe
      5. Suggest up to 2 seasonal alternatives with lower environmental impact
      6. Suggest up to 2 local alternatives with lower environmental impact
      
      Format your response as a valid JSON object with the following structure:
      {
        "travelDistance": number,
        "co2Impact": number,
        "ripeningMethod": string or null if none,
        "inSeason": boolean,
        "seasonalAlternatives": [
          {
            "name": string,
            "co2Impact": number,
            "distanceReduction": number,
            "benefits": [string, string, ...]
          }
        ],
        "localAlternatives": [
          {
            "name": string,
            "co2Impact": number,
            "distanceReduction": number,
            "benefits": [string, string, ...]
          }
        ]
      }
      
      IMPORTANT: Ensure the response is valid JSON only with no additional text.
    `;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that provides accurate information about food sustainability in valid JSON format only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to get response from OpenAI");
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    // Extract JSON from response (in case there's any surrounding text)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from OpenAI response");
    }

    const result = JSON.parse(jsonMatch[0]);

    // Format the response to match our application's expected format
    return {
      name: produceName,
      source: sourceLocation,
      co2Impact: result.co2Impact,
      travelDistance: result.travelDistance,
      ripeningMethod: result.ripeningMethod,
      inSeason: result.inSeason,
      seasonalAlternatives: result.seasonalAlternatives || [],
      localAlternatives: result.localAlternatives || []
    };
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
