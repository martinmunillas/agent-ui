import { useState, type FormEvent } from "react";
import type { PendingConfirmation } from "../lib/types";

interface ConfirmationDialogProps {
  confirmation: PendingConfirmation;
  onConfirm: (confirmed: boolean) => void;
  onInput: (input: string) => void;
}

export function ConfirmationDialog({
  confirmation,
  onConfirm,
  onInput,
}: ConfirmationDialogProps) {
  const [inputValue, setInputValue] = useState("");

  const handleInputSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onInput(inputValue.trim());
      setInputValue("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          {confirmation.type === "confirmation"
            ? "Confirmation Required"
            : "Input Required"}
        </h3>
        <p className="text-gray-300 mb-6">{confirmation.message}</p>

        {confirmation.type === "confirmation" ? (
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => onConfirm(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              No
            </button>
            <button
              onClick={() => onConfirm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Yes
            </button>
          </div>
        ) : (
          <form onSubmit={handleInputSubmit} className="space-y-4">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={confirmation.placeholder || "Enter your response..."}
              autoFocus
              className="w-full rounded-lg bg-gray-700 px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-3 justify-end">
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
