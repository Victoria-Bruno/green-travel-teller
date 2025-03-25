
export async function POST(request: Request) {
  const requestBody = await request.json();

  if (!requestBody.input) {
    return new Response(JSON.stringify({ error: "Missing 'input' field in the request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  if (!process.env.VITE_HUGGING_FACE_TOKEN) {
    return new Response(JSON.stringify({ error: "Missing Hugging Face Access Token" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  const input = requestBody.input;

  try {
    const response = await fetch("https://router.huggingface.co/hf-inference/models/meta-llama/Llama-3.2-1B", {
      headers: {
        Authorization: `Bearer ${process.env.VITE_HUGGING_FACE_TOKEN}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({ inputs: input }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hugging Face API error: ${response.status} ${errorText}`);
    }

    const jsonResponse = await response.json();

    return new Response(JSON.stringify(jsonResponse), {
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error calling Hugging Face API:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
