package tools

import (
	"google.golang.org/adk/tool"
	"google.golang.org/adk/tool/functiontool"
)

// ConfirmationArgs represents the arguments for requesting user confirmation
type ConfirmationArgs struct {
	Message string `json:"message" jsonschema:"The message to show the user explaining what needs confirmation"`
}

// UserInputArgs represents the arguments for requesting user input
type UserInputArgs struct {
	Message     string `json:"message" jsonschema:"The message to show the user explaining what input is needed"`
	Placeholder string `json:"placeholder,omitempty" jsonschema:"Optional placeholder text for the input field"`
}

// ConfirmationResult is returned when requesting confirmation
type ConfirmationResult struct {
	Confirmed bool   `json:"confirmed"`
	Message   string `json:"message,omitempty"`
}

// UserInputResult is returned when requesting user input
type UserInputResult struct {
	Input   string `json:"input"`
	Message string `json:"message,omitempty"`
}

// requestConfirmation is the handler for the confirmation tool
func requestConfirmation(ctx tool.Context, args ConfirmationArgs) (ConfirmationResult, error) {
	// This is a long-running tool - the actual response will come from the user
	// The tool call will be sent to the frontend, which will show a dialog
	// When the user responds, the frontend sends back a function response
	return ConfirmationResult{
		Confirmed: false,
		Message:   "Waiting for user confirmation...",
	}, nil
}

// requestUserInput is the handler for the user input tool
func requestUserInput(ctx tool.Context, args UserInputArgs) (UserInputResult, error) {
	// Similar to confirmation - waits for user to provide input
	return UserInputResult{
		Input:   "",
		Message: "Waiting for user input...",
	}, nil
}

// NewConfirmationTool creates a tool that asks the user for confirmation before proceeding
func NewConfirmationTool() tool.Tool {
	t, err := functiontool.New(
		functiontool.Config{
			Name:          "request_user_confirmation",
			Description:   "Ask the user for confirmation before proceeding with an action. Use this when you need explicit approval for sensitive operations like file modifications, deletions, or important decisions.",
			IsLongRunning: true,
		},
		requestConfirmation,
	)
	if err != nil {
		panic(err)
	}
	return t
}

// NewUserInputTool creates a tool that asks the user to provide text input
func NewUserInputTool() tool.Tool {
	t, err := functiontool.New(
		functiontool.Config{
			Name:          "request_user_input",
			Description:   "Ask the user to provide text input. Use this when you need specific information from the user such as a filename, a value, or any other text input.",
			IsLongRunning: true,
		},
		requestUserInput,
	)
	if err != nil {
		panic(err)
	}
	return t
}
