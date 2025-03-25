import { text } from "stream/consumers";

export async function POST(request: Request) {
  const requestBody = await request.json();

  if (!requestBody.modelUrl) {
    throw new Error("Missing 'model url' field in the request body");
  }

  if (!requestBody.input) {
    throw new Error("Missing 'input' field in the request body");
  }

  if (!process.env.VITE_HUGGING_FACE_TOKEN) {
    throw new Error("Missing 'Hugging Face Access Token'");
  }

  const modelUrl = requestBody.modelUrl;
  const input = requestBody.input;

  const response = await fetch("https://router.huggingface.co/hf-inference/models/meta-llama/Llama-3.2-1B", {
    headers: {
      Authorization: `Bearer ${process.env.VITE_HUGGING_FACE_TOKEN}`,
      "Content-Type":"application/json",
    },
    method:"POST",
    body: JSON.stringify({inputs:input}),
  });

  const jsonResponse = await response.json(); // Expecting JSON output

  return new Response(JSON.stringify(jsonResponse), {
    headers:{
        "Content-type":"application/json"
    }
  })

}
