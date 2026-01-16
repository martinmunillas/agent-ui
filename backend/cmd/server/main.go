package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"google.golang.org/adk/agent"
	"google.golang.org/adk/agent/llmagent"
	"google.golang.org/adk/cmd/launcher"
	"google.golang.org/adk/model"
	"google.golang.org/adk/model/gemini"
	"google.golang.org/adk/server/adkrest"
	"google.golang.org/adk/session"
	"google.golang.org/adk/tool"
	"google.golang.org/genai"

	"agent-ui/backend/internal/tools"
)

func main() {
	ctx := context.Background()

	apiKey := os.Getenv("GOOGLE_API_KEY")
	if apiKey == "" {
		log.Fatal("GOOGLE_API_KEY environment variable is required")
	}

	// Initialize Gemini model
	geminiModel, err := gemini.NewModel(ctx, "gemini-2.0-flash", &genai.ClientConfig{
		APIKey: apiKey,
	})
	if err != nil {
		log.Fatalf("Failed to create Gemini model: %v", err)
	}

	// Create tools
	confirmTool := tools.NewConfirmationTool()
	inputTool := tools.NewUserInputTool()

	// Create the agent
	demoAgent, err := llmagent.New(llmagent.Config{
		Name:        "demo_agent",
		Model:       geminiModel,
		Description: "A helpful assistant that can perform tasks and ask for user confirmation when needed",
		Instruction: `You are a helpful assistant. 
When you need to perform actions that might be sensitive or irreversible, or when you need clarification from the user. 
Be proactive, don't ask to ask, just ask. If the situation calls for it, ask the user for confirmation or specific input. Do it again until necessary.

Use the available tools:

- request_user_confirmation: Use this to ask yes/no questions before proceeding with actions like file operations,
  making important decisions, or any action that might have significant consequences.
- request_user_input: Use this when you need the user to provide specific information like a filename,
  a value, or any other text input.

Always be helpful.`,
		Tools: []tool.Tool{confirmTool, inputTool},
		AfterToolCallbacks: []llmagent.AfterToolCallback{
			func(ctx tool.Context, tool tool.Tool, args, result map[string]any, err error) (map[string]any, error) {
				if err != nil {
					fmt.Printf("[AGENT] Tool %s failed: %v\n", tool.Name(), err)
				} else {
					fmt.Printf("[AGENT] Tool %s succeeded with result: %v\n", tool.Name(), result)
				}
				return result, err
			},
		},
		AfterModelCallbacks: []llmagent.AfterModelCallback{
			func(ctx agent.CallbackContext, llmResponse *model.LLMResponse, llmResponseError error) (*model.LLMResponse, error) {
				if llmResponseError != nil {
					fmt.Printf("[AGENT] LLM response error: %v\n", llmResponseError)
				} else {
					text := ""
					for _, part := range llmResponse.Content.Parts {
						text += part.Text
					}
					fmt.Printf("[AGENT] LLM response received: %s\n", text)
				}
				return llmResponse, llmResponseError
			},
		},
	})
	if err != nil {
		log.Fatalf("Failed to create agent: %v", err)
	}

	// Configure the REST API using ADK's launcher config
	config := &launcher.Config{
		AgentLoader:    agent.NewSingleLoader(demoAgent),
		SessionService: session.InMemoryService(),
	}

	// Create the ADK REST handler
	apiHandler := adkrest.NewHandler(config, 120*time.Second)

	// Setup HTTP routes
	mux := http.NewServeMux()

	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Mount the ADK handler with logging and CORS middleware at root
	mux.Handle("/", loggingMiddleware(corsMiddleware(apiHandler)))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on :%s", port)
	log.Printf("API endpoints available at http://localhost:%s/", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}

// loggingMiddleware logs requests without wrapping the response writer
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("[REQUEST] %s %s", r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}

// corsMiddleware adds CORS headers for frontend development
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Allow requests from Vite dev server
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5174")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Accept")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
