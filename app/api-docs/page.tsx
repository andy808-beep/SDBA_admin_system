// app/api-docs/page.tsx
// API documentation page with Swagger UI (admin-only)

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });
import "swagger-ui-react/swagger-ui.css";

export default function ApiDocsPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [openApiSpec, setOpenApiSpec] = useState<any>(null);

  useEffect(() => {
    // Check admin authentication
    const checkAuth = async () => {
      try {
        // Check if user is authenticated by calling a protected endpoint
        const response = await fetch("/api/admin/counters");
        if (response.status === 403) {
          setIsAuthorized(false);
          router.push("/auth?error=forbidden&redirectedFrom=/api-docs");
        } else {
          setIsAuthorized(true);
          // Load OpenAPI spec from the route handler
          setOpenApiSpec("/docs/openapi.yaml");
        }
      } catch (error) {
        setIsAuthorized(false);
        router.push("/auth?error=forbidden&redirectedFrom=/api-docs");
      }
    };

    checkAuth();
  }, [router]);

  if (isAuthorized === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-gray-900 border-r-transparent"></div>
          <p className="text-gray-600">Loading API documentation...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-bold text-gray-900">API Documentation</h1>
          <p className="mt-1 text-sm text-gray-600">
            Interactive API documentation with "Try it out" functionality
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-6 py-8">
        {openApiSpec && (
          <SwaggerUI
            url={openApiSpec}
            docExpansion="list"
            defaultModelsExpandDepth={2}
            defaultModelExpandDepth={2}
            persistAuthorization={true}
            tryItOutEnabled={true}
            requestInterceptor={(request) => {
              // Automatically include CSRF token for state-changing requests
              if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
                // Get CSRF token from cookie or fetch it
                const csrfToken = document.cookie
                  .split("; ")
                  .find((row) => row.startsWith("__Host-csrf-token="))
                  ?.split("=")[1];

                if (csrfToken) {
                  request.headers["X-CSRF-Token"] = csrfToken;
                }
              }
              return request;
            }}
          />
        )}
      </div>
    </div>
  );
}

