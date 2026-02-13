'use client'

import dynamic from 'next/dynamic'
import 'swagger-ui-react/swagger-ui.css'
import { apiSpec } from '@/lib/api-spec'

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  ),
})

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <style jsx global>{`
        /* Custom Swagger UI styling */
        .swagger-ui {
          font-family:
            'Satoshi',
            system-ui,
            -apple-system,
            sans-serif !important;
        }
        .swagger-ui .topbar {
          display: none;
        }
        .swagger-ui .info {
          margin: 30px 0;
        }
        .swagger-ui .info .title {
          font-size: 2rem;
          font-weight: 700;
        }
        .swagger-ui .scheme-container {
          background: transparent;
          box-shadow: none;
          padding: 0;
        }
        .swagger-ui .opblock-tag {
          font-size: 1.25rem;
          font-weight: 600;
          border-bottom: 1px solid hsl(var(--border));
        }
        .swagger-ui .opblock {
          border-radius: 8px;
          margin-bottom: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .swagger-ui .opblock .opblock-summary {
          border-radius: 8px;
        }
        .swagger-ui .opblock.opblock-get .opblock-summary {
          border-color: #61affe;
        }
        .swagger-ui .opblock.opblock-post .opblock-summary {
          border-color: #49cc90;
        }
        .swagger-ui .opblock.opblock-put .opblock-summary {
          border-color: #fca130;
        }
        .swagger-ui .opblock.opblock-delete .opblock-summary {
          border-color: #f93e3e;
        }
        .swagger-ui .opblock.opblock-patch .opblock-summary {
          border-color: #50e3c2;
        }
        .swagger-ui .btn {
          border-radius: 6px;
        }
        .swagger-ui select {
          border-radius: 6px;
        }
        .swagger-ui input[type='text'] {
          border-radius: 6px;
        }
        .swagger-ui textarea {
          border-radius: 6px;
        }
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .swagger-ui {
            filter: invert(88%) hue-rotate(180deg);
          }
          .swagger-ui .opblock {
            filter: invert(100%) hue-rotate(180deg);
          }
        }
      `}</style>
      <div className="container mx-auto px-4 py-8">
        <SwaggerUI spec={apiSpec} />
      </div>
    </div>
  )
}
