import { NextResponse } from "next/server"

// Allow responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { query } = await req.json()

    // In a production environment, you would call your deployed Python service
    // For this example, we'll simulate calling the Python script
    const response = await callPythonModel(query)

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error processing request:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}

// Function to call the Python model
// In a real application, this would be an API call to a deployed Python service
async function callPythonModel(query: string) {
  // This would be replaced with an actual API call to your Python backend
  return {
    message: "This is a simulated response. In a real application, this would come from the Python backend.",
    // Additional data would be included here
  }
}
