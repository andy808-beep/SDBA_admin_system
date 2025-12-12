/**
 * @jest-environment jsdom
 */
// components/__tests__/ErrorBoundary.test.tsx
// Comprehensive tests for ErrorBoundary component

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ErrorBoundary } from "../ErrorBoundary";
import * as Sentry from "@sentry/nextjs";

// Mock Sentry
jest.mock("@sentry/nextjs", () => ({
  captureException: jest.fn(() => "event-id-123"),
}));

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "sessionStorage", {
  value: sessionStorageMock,
});

// Mock error categories
jest.mock("@/lib/error-categories", () => ({
  categorizeError: jest.fn((error) => {
    const message = error instanceof Error ? error.message : String(error);
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("network") || lowerMessage.includes("connection")) {
      return {
        category: "NETWORK",
        message,
        userMessage: "Connection lost. Please check your internet connection and try again.",
        canRetry: true,
        recoveryAction: "Retry connection",
      };
    }

    if (lowerMessage.includes("auth") || lowerMessage.includes("unauthorized")) {
      return {
        category: "AUTH",
        message,
        userMessage: "Your session has expired. Please log in again.",
        canRetry: false,
        shouldRedirect: "/auth",
        recoveryAction: "Go to login",
      };
    }

    return {
      category: "UNKNOWN",
      message,
      userMessage: "Something unexpected went wrong. Our team has been notified.",
      canRetry: true,
      recoveryAction: "Try again",
    };
  }),
  generateErrorId: jest.fn(() => "ERR-1234567890-ABC123"),
  isTransientError: jest.fn((error) => {
    const message = error instanceof Error ? error.message : String(error);
    return message.toLowerCase().includes("network") || message.toLowerCase().includes("server");
  }),
  getRetryDelay: jest.fn((attempt) => 1000 * Math.pow(2, attempt)),
  ErrorCategory: {
    NETWORK: "NETWORK",
    AUTH: "AUTH",
    VALIDATION: "VALIDATION",
    SERVER: "SERVER",
    UNKNOWN: "UNKNOWN",
  },
}));

// Component that throws an error
const ThrowError = ({ error }: { error: Error }) => {
  throw error;
};

// Component that doesn't throw
const NoError = () => <div>No Error</div>;

describe("ErrorBoundary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear sessionStorage
    sessionStorageMock.clear();
    // Mock window.location.reload
    delete (window as any).location;
    (window as any).location = { reload: jest.fn(), href: "" };
    // Reset document body
    document.body.innerHTML = "";
  });

  describe("Error Display", () => {
    it("should display error message when error occurs", () => {
      const error = new Error("Test error");
      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Something Went Wrong/i)).toBeInTheDocument();
    });

    it("should display network error message for network errors", () => {
      const error = new Error("Network request failed");
      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Connection Lost/i)).toBeInTheDocument();
      expect(screen.getByText(/Connection lost. Please check your internet connection/i)).toBeInTheDocument();
    });

    it("should display auth error message for auth errors", () => {
      const error = new Error("Unauthorized");
      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Session Expired/i)).toBeInTheDocument();
      expect(screen.getByText(/Your session has expired/i)).toBeInTheDocument();
    });

    it("should display error ID", () => {
      const error = new Error("Test error");
      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/ERR-1234567890-ABC123/i)).toBeInTheDocument();
    });

    it("should show stack trace only in development", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const error = new Error("Test error");
      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Error Details \(Development\)/i)).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it("should not show stack trace in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const error = new Error("Test error");
      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );

      expect(screen.queryByText(/Error Details/i)).not.toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("Reset Functionality", () => {
    it("should reset error state when reset button is clicked", () => {
      const error = new Error("Test error");
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Something Went Wrong/i)).toBeInTheDocument();

      const resetButton = screen.getByText(/Try Again/i);
      fireEvent.click(resetButton);

      // Re-render with no error
      rerender(
        <ErrorBoundary>
          <NoError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/No Error/i)).toBeInTheDocument();
    });
  });

  describe("Error Reporting", () => {
    it("should show feedback form when Report Issue is clicked", () => {
      const error = new Error("Test error");
      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );

      const reportButton = screen.getByText(/Report Issue/i);
      fireEvent.click(reportButton);

      expect(screen.getByText(/What were you doing when this error occurred/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Describe what you were doing/i)).toBeInTheDocument();
    });

    it("should send error report to Sentry with user feedback", async () => {
      const error = new Error("Test error");
      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );

      // Open feedback form
      const reportButton = screen.getByText(/Report Issue/i);
      fireEvent.click(reportButton);

      // Enter feedback
      const textarea = screen.getByPlaceholderText(/Describe what you were doing/i);
      fireEvent.change(textarea, { target: { value: "I was submitting a form" } });

      // Send report
      const sendButton = screen.getByText(/Send Report/i);
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(Sentry.captureException).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({
            contexts: expect.objectContaining({
              feedback: expect.objectContaining({
                message: "I was submitting a form",
              }),
            }),
            tags: expect.objectContaining({
              user_reported: true,
            }),
          })
        );
      });
    });

    it("should capture error in Sentry on error", () => {
      const error = new Error("Test error");
      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );

      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.objectContaining({
            error_boundary: true,
            error_type: "react_error",
          }),
        })
      );
    });
  });

  describe("Recovery Strategies", () => {
    it("should redirect to login on auth errors", async () => {
      const error = new Error("Unauthorized");
      jest.useFakeTimers();

      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );

      jest.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(window.location.href).toBe("/auth");
      });

      jest.useRealTimers();
    });

    it("should save form data to sessionStorage on error", () => {
      // Create a form in the document
      const form = document.createElement("form");
      form.id = "test-form";
      const input1 = document.createElement("input");
      input1.name = "field1";
      input1.value = "value1";
      const input2 = document.createElement("input");
      input2.name = "field2";
      input2.value = "value2";
      form.appendChild(input1);
      form.appendChild(input2);
      document.body.appendChild(form);

      const error = new Error("Test error");
      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );

      // Check if form data was saved
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        "error_recovery_form_data",
        expect.stringContaining("field1")
      );
    });

    it("should show restore form data option when form data exists", () => {
      sessionStorageMock.setItem(
        "error_recovery_form_data",
        JSON.stringify({ form_0: { field1: "value1" } })
      );

      const error = new Error("Test error");
      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/We saved your form data/i)).toBeInTheDocument();
      expect(screen.getByText(/Restore and Continue/i)).toBeInTheDocument();
    });

    it("should restore form data when restore button is clicked", () => {
      // Create a form
      const form = document.createElement("form");
      form.id = "test-form";
      const input = document.createElement("input");
      input.name = "field1";
      input.value = "";
      form.appendChild(input);
      document.body.appendChild(form);

      sessionStorageMock.setItem(
        "error_recovery_form_data",
        JSON.stringify({ form_0: { field1: "restored_value" } })
      );

      const error = new Error("Test error");
      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );

      const restoreButton = screen.getByText(/Restore and Continue/i);
      fireEvent.click(restoreButton);

      const inputElement = document.querySelector('input[name="field1"]') as HTMLInputElement;
      expect(inputElement.value).toBe("restored_value");
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith("error_recovery_form_data");
    });
  });

  describe("Retry Logic", () => {
    it("should show retry button for transient errors", () => {
      const error = new Error("Network error");
      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Retry connection/i)).toBeInTheDocument();
    });

    it("should not show retry button for non-transient errors", () => {
      const error = new Error("Unauthorized");
      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );

      expect(screen.queryByText(/Retry/i)).not.toBeInTheDocument();
    });

    it("should show retry count", async () => {
      const error = new Error("Network error");
      jest.useFakeTimers();

      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );

      const retryButton = screen.getByText(/Retry connection/i);
      fireEvent.click(retryButton);

      // Wait for retry delay
      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText(/Retry attempt 1 of 3/i)).toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    it("should show loading state during retry", () => {
      const error = new Error("Network error");
      jest.useFakeTimers();

      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );

      const retryButton = screen.getByText(/Retry connection/i);
      fireEvent.click(retryButton);

      expect(screen.getByText(/Retrying in/i)).toBeInTheDocument();

      jest.useRealTimers();
    });
  });

  describe("Reload Functionality", () => {
    it("should reload page when reload button is clicked", () => {
      const error = new Error("Test error");
      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByText(/Reload Page/i);
      fireEvent.click(reloadButton);

      expect(window.location.reload).toHaveBeenCalled();
    });
  });

  describe("Custom Fallback", () => {
    it("should use custom fallback if provided", () => {
      const error = new Error("Test error");
      const customFallback = <div>Custom Error Message</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError error={error} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Custom Error Message/i)).toBeInTheDocument();
      expect(screen.queryByText(/Something Went Wrong/i)).not.toBeInTheDocument();
    });
  });

  describe("No Error State", () => {
    it("should render children when no error occurs", () => {
      render(
        <ErrorBoundary>
          <NoError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/No Error/i)).toBeInTheDocument();
      expect(screen.queryByText(/Something Went Wrong/i)).not.toBeInTheDocument();
    });
  });
});

