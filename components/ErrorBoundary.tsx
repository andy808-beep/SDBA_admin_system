// components/ErrorBoundary.tsx
// Enhanced error boundary component with better error recovery and user experience

"use client";

import React, { Component, type ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";
import { categorizeError, generateErrorId, isTransientError, getRetryDelay, ErrorCategory } from "@/lib/error-categories";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
  isRetrying: boolean;
  userFeedback: string;
  showFeedbackForm: boolean;
}

const MAX_RETRY_ATTEMPTS = 3;

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isRetrying: false,
      userFeedback: "",
      showFeedbackForm: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: generateErrorId(),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Save form data to sessionStorage before error
    this.saveFormData();

    // Categorize error
    const errorCategory = categorizeError(error);

    // Capture error in Sentry with React component stack
    const eventId = Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      tags: {
        error_boundary: true,
        error_type: "react_error",
        error_category: errorCategory.category,
      },
      extra: {
        errorInfo,
        errorId: this.state.errorId,
      },
    });

    // Update state with error info
    this.setState({
      errorInfo,
      errorId: this.state.errorId || generateErrorId(),
    });

    // Handle auth errors - redirect to login
    if (errorCategory.shouldRedirect) {
      setTimeout(() => {
        window.location.href = errorCategory.shouldRedirect!;
      }, 2000);
    }

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  /**
   * Save form data to sessionStorage for recovery
   */
  private saveFormData(): void {
    try {
      const forms = document.querySelectorAll("form");
      const formData: Record<string, any> = {};

      forms.forEach((form, index) => {
        const formEntries = new FormData(form);
        const data: Record<string, any> = {};
        formEntries.forEach((value, key) => {
          data[key] = value;
        });
        if (Object.keys(data).length > 0) {
          formData[`form_${index}`] = data;
        }
      });

      if (Object.keys(formData).length > 0) {
        sessionStorage.setItem("error_recovery_form_data", JSON.stringify(formData));
      }
    } catch (error) {
      // Silently fail if sessionStorage is not available
      console.warn("Failed to save form data:", error);
    }
  }

  /**
   * Restore form data from sessionStorage
   */
  private restoreFormData(): void {
    try {
      const savedData = sessionStorage.getItem("error_recovery_form_data");
      if (!savedData) return;

      const formData = JSON.parse(savedData);
      const forms = document.querySelectorAll("form");

      forms.forEach((form, index) => {
        const key = `form_${index}`;
        if (formData[key]) {
          Object.entries(formData[key]).forEach(([name, value]) => {
            const input = form.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
            if (input) {
              input.value = String(value);
            }
          });
        }
      });

      sessionStorage.removeItem("error_recovery_form_data");
    } catch (error) {
      console.warn("Failed to restore form data:", error);
    }
  }

  /**
   * Reset error state and retry
   */
  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isRetrying: false,
      userFeedback: "",
      showFeedbackForm: false,
    });
  };

  /**
   * Retry with exponential backoff
   */
  private handleRetry = async (): Promise<void> => {
    const { error, retryCount } = this.state;

    if (!error || retryCount >= MAX_RETRY_ATTEMPTS) {
      return;
    }

    if (!isTransientError(error)) {
      return;
    }

    this.setState({ isRetrying: true });

    const delay = getRetryDelay(retryCount);
    
    this.retryTimeoutId = setTimeout(() => {
      this.setState(
        (prevState) => ({
          retryCount: prevState.retryCount + 1,
          isRetrying: false,
        }),
        () => {
          // Try to recover by resetting error state
          this.handleReset();
        }
      );
    }, delay);
  };

  /**
   * Report error to Sentry with user feedback
   */
  private handleReportIssue = async (): Promise<void> => {
    const { error, errorInfo, errorId, userFeedback } = this.state;

    if (!error) return;

    // Capture user feedback in Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo?.componentStack,
        },
        feedback: {
          message: userFeedback,
          errorId,
        },
      },
      tags: {
        error_boundary: true,
        user_reported: true,
      },
      extra: {
        errorInfo,
        errorId,
        userFeedback,
      },
    });

    // Show success message
    alert("Thank you for reporting this issue. Our team has been notified.");
    this.setState({ showFeedbackForm: false, userFeedback: "" });
  };

  /**
   * Reload the page
   */
  private handleReload = (): void => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorCategory = this.state.error ? categorizeError(this.state.error) : null;
      const isDevelopment = process.env.NODE_ENV === "development";

      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-6 shadow-xl">
            {/* Error Icon */}
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-red-100 p-4">
                <svg
                  className="h-12 w-12 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>

            {/* Error Title */}
            <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
              {errorCategory?.category === ErrorCategory.NETWORK
                ? "Connection Lost"
                : errorCategory?.category === ErrorCategory.AUTH
                ? "Session Expired"
                : "Something Went Wrong"}
            </h2>

            {/* Error Message */}
            <p className="mb-4 text-center text-sm text-gray-600">
              {errorCategory?.userMessage || "An unexpected error occurred. Please try again."}
            </p>

            {/* Error ID */}
            {this.state.errorId && (
              <div className="mb-4 rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-xs text-gray-500">Error ID</p>
                <p className="font-mono text-sm font-semibold text-gray-700">
                  {this.state.errorId}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Please reference this ID when contacting support
                </p>
              </div>
            )}

            {/* Stack Trace (Development Only) */}
            {isDevelopment && this.state.error && (
              <details className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-gray-700">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 max-h-48 overflow-auto text-xs text-gray-600">
                  {this.state.error.stack}
                </pre>
                {this.state.errorInfo && (
                  <pre className="mt-2 max-h-48 overflow-auto text-xs text-gray-600">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}

            {/* User Feedback Form */}
            {this.state.showFeedbackForm && (
              <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  What were you doing when this error occurred?
                </label>
                <textarea
                  value={this.state.userFeedback}
                  onChange={(e) => this.setState({ userFeedback: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-2 text-sm"
                  rows={3}
                  placeholder="Describe what you were doing..."
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={this.handleReportIssue}
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Send Report
                  </button>
                  <button
                    onClick={() => this.setState({ showFeedbackForm: false })}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 sm:flex-row">
              {/* Reset Button */}
              <button
                onClick={this.handleReset}
                className="flex-1 rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
              >
                Try Again
              </button>

              {/* Retry Button (for transient errors) */}
              {errorCategory?.canRetry &&
                this.state.retryCount < MAX_RETRY_ATTEMPTS && (
                  <button
                    onClick={this.handleRetry}
                    disabled={this.state.isRetrying}
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {this.state.isRetrying
                      ? `Retrying in ${Math.ceil(getRetryDelay(this.state.retryCount) / 1000)}s...`
                      : errorCategory.recoveryAction || "Retry"}
                  </button>
                )}

              {/* Report Issue Button */}
              {!this.state.showFeedbackForm && (
                <button
                  onClick={() => this.setState({ showFeedbackForm: true })}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Report Issue
                </button>
              )}

              {/* Reload Button */}
            <button
                onClick={this.handleReload}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Reload Page
            </button>
            </div>

            {/* Restore Form Data Option */}
            {sessionStorage.getItem("error_recovery_form_data") && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="mb-2 text-sm text-blue-800">
                  We saved your form data before the error occurred.
                </p>
                <button
                  onClick={() => {
                    this.restoreFormData();
                    this.handleReset();
                  }}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                >
                  Restore and Continue
                </button>
              </div>
            )}

            {/* Retry Count Info */}
            {this.state.retryCount > 0 && (
              <p className="mt-4 text-center text-xs text-gray-500">
                Retry attempt {this.state.retryCount} of {MAX_RETRY_ATTEMPTS}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
