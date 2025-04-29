"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Bot, User, Send, LineChart, ShoppingCart, DollarSign, TrendingDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
}

type ProductPrice = {
  site: string
  price: number
}

type PriceHistory = {
  allTimeLow: ProductPrice & { date: string }
  allTimeHigh: { price: number; date: string }
  averagePrice: number
  thirtyDayLow: ProductPrice & { date: string }
}

type PricePrediction = {
  date: string
  price: number
  lowerBound: number
  upperBound: number
}

type ProductData = {
  id: number
  name: string
  currentPrices: Record<string, number>
  lowestPrice: ProductPrice
  priceHistory: PriceHistory
  buyRecommendation: {
    recommendation: string
    confidence: number
    bestDeal: ProductPrice
    predictedLowest?: ProductPrice & { date: string }
  }
}

// Sample product data for demonstration
const SAMPLE_PRODUCTS: ProductData[] = [
  {
    id: 1,
    name: "Sony WH-1000XM4 Wireless Headphones",
    currentPrices: {
      Amazon: 248.99,
      Walmart: 274.99,
      BestBuy: 279.99,
      Target: 299.99,
      Newegg: 269.95,
    },
    lowestPrice: {
      site: "Amazon",
      price: 248.99,
    },
    priceHistory: {
      allTimeLow: {
        price: 228.99,
        date: "2023-11-25",
        site: "Amazon",
      },
      allTimeHigh: {
        price: 349.99,
        date: "2023-06-15",
      },
      averagePrice: 289.99,
      thirtyDayLow: {
        price: 248.99,
        date: "2023-04-15",
        site: "Amazon",
      },
    },
    buyRecommendation: {
      recommendation: "Buy now! The current price is very close to the all-time low.",
      confidence: 0.9,
      bestDeal: {
        site: "Amazon",
        price: 248.99,
      },
      predictedLowest: {
        site: "Amazon",
        price: 239.99,
        date: "2023-05-10",
      },
    },
  },
  {
    id: 2,
    name: "Apple iPhone 13 Pro (128GB)",
    currentPrices: {
      Amazon: 899.99,
      Walmart: 929.99,
      BestBuy: 999.99,
      Target: 949.99,
      "Apple Store": 999.99,
    },
    lowestPrice: {
      site: "Amazon",
      price: 899.99,
    },
    priceHistory: {
      allTimeLow: {
        price: 849.99,
        date: "2023-12-15",
        site: "Amazon",
      },
      allTimeHigh: {
        price: 1099.99,
        date: "2023-01-10",
      },
      averagePrice: 949.99,
      thirtyDayLow: {
        price: 899.99,
        date: "2023-04-10",
        site: "Amazon",
      },
    },
    buyRecommendation: {
      recommendation: "Wait for a better price. A price drop is predicted on 2023-05-15 at Amazon.",
      confidence: 0.7,
      bestDeal: {
        site: "Amazon",
        price: 899.99,
      },
      predictedLowest: {
        site: "Amazon",
        price: 849.99,
        date: "2023-05-15",
      },
    },
  },
  {
    id: 3,
    name: 'Samsung 55" QLED 4K TV',
    currentPrices: {
      Amazon: 799.99,
      Walmart: 849.99,
      BestBuy: 799.99,
      Target: 899.99,
      Newegg: 829.95,
    },
    lowestPrice: {
      site: "Amazon",
      price: 799.99,
    },
    priceHistory: {
      allTimeLow: {
        price: 699.99,
        date: "2023-11-28",
        site: "BestBuy",
      },
      allTimeHigh: {
        price: 1099.99,
        date: "2023-03-01",
      },
      averagePrice: 849.99,
      thirtyDayLow: {
        price: 799.99,
        date: "2023-04-05",
        site: "Amazon",
      },
    },
    buyRecommendation: {
      recommendation: "Consider waiting. The price typically drops during holiday sales.",
      confidence: 0.8,
      bestDeal: {
        site: "Amazon",
        price: 799.99,
      },
    },
  },
]

export default function PriceIntelligenceLLM() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [activeProduct, setActiveProduct] = useState<ProductData | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Sample product-related questions to help users get started
  const sampleQuestions = [
    "What's the current price of Sony WH-1000XM4 headphones?",
    "Should I buy the iPhone 13 Pro now?",
    "What's the price history of the Samsung QLED TV?",
    "Which site has the lowest price for Sony headphones?",
    "Will the iPhone 13 Pro price drop soon?",
  ]

  // Auto-scroll to the bottom of the chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Function to handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      // Process the query and generate a response
      const response = await processQuery(input)

      // Add AI response to chat
      const aiMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: response.message,
      }
      setMessages((prev) => [...prev, aiMessage])

      // Set active product if available
      if (response.product) {
        setActiveProduct(response.product)
      }
    } catch (error) {
      console.error("Error:", error)
      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "Sorry, I encountered an error processing your request. Please try again.",
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Function to process the query and find relevant product data
  const processQuery = async (query: string): Promise<{ message: string; product?: ProductData }> => {
    // This is a simplified simulation of what would happen in a real environment
    // In reality, this would call the Python backend

    const lowerQuery = query.toLowerCase()
    let foundProduct: ProductData | undefined
    let response = ""

    // Find product mentioned in query
    for (const product of SAMPLE_PRODUCTS) {
      if (lowerQuery.includes(product.name.toLowerCase())) {
        foundProduct = product
        break
      }

      // Check for partial matches
      const productTerms = product.name.toLowerCase().split(" ")
      if (productTerms.some((term) => lowerQuery.includes(term) && term.length > 3)) {
        foundProduct = product
        break
      }
    }

    if (!foundProduct) {
      return {
        message:
          "I couldn't find specific product information for your query. Please try asking about one of our sample products: Sony WH-1000XM4 headphones, iPhone 13 Pro, or Samsung QLED TV.",
      }
    }

    // Generate appropriate response based on query intent
    if (lowerQuery.includes("price") || lowerQuery.includes("cost") || lowerQuery.includes("how much")) {
      response = `Current prices for ${foundProduct.name}:\n\n`

      Object.entries(foundProduct.currentPrices).forEach(([site, price]) => {
        response += `- ${site}: $${price}\n`
      })

      response += `\nThe lowest price is $${foundProduct.lowestPrice.price} at ${foundProduct.lowestPrice.site}.`
    } else if (lowerQuery.includes("history") || lowerQuery.includes("past")) {
      const history = foundProduct.priceHistory
      response = `Price history for ${foundProduct.name}:\n\n`
      response += `- All-time low: $${history.allTimeLow.price} on ${history.allTimeLow.date} at ${history.allTimeLow.site}\n`
      response += `- All-time high: $${history.allTimeHigh.price} on ${history.allTimeHigh.date}\n`
      response += `- Average price: $${history.averagePrice}\n`
      response += `- 30-day low: $${history.thirtyDayLow.price} on ${history.thirtyDayLow.date} at ${history.thirtyDayLow.site}`
    } else if (lowerQuery.includes("buy") || lowerQuery.includes("should") || lowerQuery.includes("recommend")) {
      const rec = foundProduct.buyRecommendation
      response = `Buy recommendation for ${foundProduct.name}:\n\n`
      response += `${rec.recommendation}\n\n`
      response += `Best current deal: $${rec.bestDeal.price} at ${rec.bestDeal.site}\n`
      response += `Historical low: $${foundProduct.priceHistory.allTimeLow.price} on ${foundProduct.priceHistory.allTimeLow.date}\n`

      if (rec.predictedLowest) {
        response += `\nPredicted lowest price in the near future: $${rec.predictedLowest.price} on ${rec.predictedLowest.date} at ${rec.predictedLowest.site}`
      }
    } else if (lowerQuery.includes("lowest") || lowerQuery.includes("cheapest") || lowerQuery.includes("best deal")) {
      response = `The lowest current price for ${foundProduct.name} is $${foundProduct.lowestPrice.price} at ${foundProduct.lowestPrice.site}.`

      if (foundProduct.priceHistory.allTimeLow.price < foundProduct.lowestPrice.price) {
        response += `\n\nNote that this is not the all-time low price. The product was available for $${foundProduct.priceHistory.allTimeLow.price} on ${foundProduct.priceHistory.allTimeLow.date} at ${foundProduct.priceHistory.allTimeLow.site}.`
      }
    } else {
      // Default to overview
      response = `Product Overview: ${foundProduct.name}\n\n`

      response += `Current lowest price: $${foundProduct.lowestPrice.price} at ${foundProduct.lowestPrice.site}\n\n`

      response += `Price history:\n`
      response += `- All-time low: $${foundProduct.priceHistory.allTimeLow.price}\n`
      response += `- Average price: $${foundProduct.priceHistory.averagePrice}\n\n`

      response += `Recommendation: ${foundProduct.buyRecommendation.recommendation}`
    }

    return {
      message: response,
      product: foundProduct,
    }
  }

  // Function to handle clicking a sample question
  const handleSampleQuestion = (question: string) => {
    setInput(question)
    const fakeEvent = {
      preventDefault: () => {},
    } as React.FormEvent<HTMLFormElement>

    // We need to set the input first, then submit
    setTimeout(() => handleSubmit(fakeEvent), 100)
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="container flex items-center justify-between h-16 px-4 mx-auto">
          <div className="flex items-center space-x-2">
            <LineChart className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold">Price Intelligence LLM</h1>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat interface */}
          <div className="lg:col-span-2">
            <Card className="w-full">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center text-blue-700">
                  <Bot className="w-5 h-5 mr-2" />
                  Price Intelligence Assistant
                </CardTitle>
              </CardHeader>

              <CardContent className="p-0">
                {/* Messages container */}
                <div className="h-[60vh] overflow-y-auto p-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <LineChart className="w-16 h-16 mb-4 text-blue-600 opacity-50" />
                      <h2 className="mb-2 text-xl font-semibold text-gray-700">Price Intelligence Assistant</h2>
                      <p className="mb-6 text-gray-500">
                        Ask me about product prices, price history, predictions, and buying recommendations!
                      </p>

                      <div className="w-full max-w-md">
                        <h3 className="mb-2 text-sm font-medium text-gray-500">Try asking:</h3>
                        <div className="flex flex-wrap gap-2">
                          {sampleQuestions.map((question, index) => (
                            <button
                              key={index}
                              onClick={() => handleSampleQuestion(question)}
                              className="px-3 py-1 text-sm text-left text-blue-700 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
                            >
                              {question}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`mb-4 flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`flex items-start max-w-[80%] ${message.role === "user" ? "flex-row-reverse" : ""}`}
                        >
                          <div
                            className={`flex items-center justify-center w-8 h-8 rounded-full mr-2 ${
                              message.role === "user" ? "bg-blue-100 ml-2" : "bg-gray-200"
                            }`}
                          >
                            {message.role === "user" ? (
                              <User className="w-4 h-4 text-blue-700" />
                            ) : (
                              <Bot className="w-4 h-4 text-gray-700" />
                            )}
                          </div>
                          <div
                            className={`p-3 rounded-lg ${
                              message.role === "user"
                                ? "bg-blue-600 text-white rounded-tr-none"
                                : "bg-gray-100 text-gray-800 rounded-tl-none"
                            }`}
                          >
                            <pre
                              className={`whitespace-pre-wrap font-sans ${
                                message.role === "user" ? "text-white" : "text-gray-800"
                              }`}
                            >
                              {message.content}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  {isLoading && (
                    <div className="flex justify-start mb-4">
                      <div className="flex items-start max-w-[80%]">
                        <div className="flex items-center justify-center w-8 h-8 mr-2 bg-gray-200 rounded-full">
                          <Bot className="w-4 h-4 text-gray-700" />
                        </div>
                        <div className="p-3 bg-gray-100 rounded-lg text-gray-800 rounded-tl-none">
                          <div className="flex space-x-1">
                            <div
                              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: "0ms" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: "150ms" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: "300ms" }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </CardContent>

              <CardFooter className="p-4 border-t">
                <form onSubmit={handleSubmit} className="flex w-full space-x-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about product prices, history, or recommendations..."
                    className="flex-grow"
                    disabled={isLoading}
                  />
                  <Button type="submit" disabled={isLoading || !input.trim()} className="bg-blue-600 hover:bg-blue-700">
                    <Send className="w-4 h-4" />
                    <span className="sr-only">Send</span>
                  </Button>
                </form>
              </CardFooter>
            </Card>
          </div>

          {/* Product details panel */}
          <div className="lg:col-span-1">
            {activeProduct ? (
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="text-lg">{activeProduct.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Tabs defaultValue="prices" className="w-full">
                    <TabsList className="w-full grid grid-cols-3">
                      <TabsTrigger value="prices">Prices</TabsTrigger>
                      <TabsTrigger value="history">History</TabsTrigger>
                      <TabsTrigger value="recommendation">Recommendation</TabsTrigger>
                    </TabsList>

                    <TabsContent value="prices" className="p-4">
                      <h3 className="text-sm font-medium mb-2 flex items-center">
                        <ShoppingCart className="w-4 h-4 mr-1" />
                        Current Prices
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(activeProduct.currentPrices).map(([site, price]) => (
                          <div key={site} className="flex justify-between items-center">
                            <span>{site}</span>
                            <span
                              className={`font-medium ${
                                site === activeProduct.lowestPrice.site ? "text-green-600" : ""
                              }`}
                            >
                              ${price}
                              {site === activeProduct.lowestPrice.site && " (Lowest)"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="history" className="p-4">
                      <h3 className="text-sm font-medium mb-2 flex items-center">
                        <LineChart className="w-4 h-4 mr-1" />
                        Price History
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span>All-time low</span>
                          <span className="font-medium text-green-600">
                            ${activeProduct.priceHistory.allTimeLow.price}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {activeProduct.priceHistory.allTimeLow.date} at {activeProduct.priceHistory.allTimeLow.site}
                        </div>

                        <div className="flex justify-between items-center">
                          <span>All-time high</span>
                          <span className="font-medium text-red-600">
                            ${activeProduct.priceHistory.allTimeHigh.price}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">{activeProduct.priceHistory.allTimeHigh.date}</div>

                        <div className="flex justify-between items-center">
                          <span>Average price</span>
                          <span className="font-medium">${activeProduct.priceHistory.averagePrice}</span>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="recommendation" className="p-4">
                      <h3 className="text-sm font-medium mb-2 flex items-center">
                        <TrendingDown className="w-4 h-4 mr-1" />
                        Buy Recommendation
                      </h3>
                      <div className="p-3 bg-blue-50 rounded-md mb-3">
                        {activeProduct.buyRecommendation.recommendation}
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span>Best current deal</span>
                          <span className="font-medium">${activeProduct.buyRecommendation.bestDeal.price}</span>
                        </div>
                        <div className="text-xs text-gray-500">at {activeProduct.buyRecommendation.bestDeal.site}</div>

                        {activeProduct.buyRecommendation.predictedLowest && (
                          <>
                            <div className="flex justify-between items-center">
                              <span>Predicted lowest</span>
                              <span className="font-medium text-green-600">
                                ${activeProduct.buyRecommendation.predictedLowest.price}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {activeProduct.buyRecommendation.predictedLowest.date} at{" "}
                              {activeProduct.buyRecommendation.predictedLowest.site}
                            </div>
                          </>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="text-lg">Product Details</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center justify-center text-center h-[40vh]">
                    <DollarSign className="w-12 h-12 text-gray-300 mb-4" />
                    <p className="text-gray-500">
                      Ask about a product to see detailed price information, history, and buying recommendations.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-sm text-gray-500 border-t">
        <p>Price Intelligence LLM - Making smarter shopping decisions</p>
      </footer>
    </div>
  )
}
