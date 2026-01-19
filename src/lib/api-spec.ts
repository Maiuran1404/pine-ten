import { OpenAPIV3 } from "openapi-types";

/**
 * OpenAPI 3.0 specification for Crafted API
 */
export const apiSpec: OpenAPIV3.Document = {
  openapi: "3.0.0",
  info: {
    title: "Crafted API",
    version: "1.0.0",
    description: "API documentation for Crafted - a creative design platform",
    contact: {
      name: "Support",
      email: "support@getcrafted.ai",
    },
  },
  servers: [
    {
      url: "/api",
      description: "API Server",
    },
  ],
  tags: [
    { name: "Auth", description: "Authentication endpoints" },
    { name: "Tasks", description: "Task management" },
    { name: "Brand", description: "Brand profile management" },
    { name: "Admin", description: "Admin-only endpoints" },
    { name: "Portal", description: "Freelancer portal endpoints" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        description: "Check if the API is running",
        responses: {
          "200": {
            description: "API is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/auth/get-session": {
      get: {
        tags: ["Auth"],
        summary: "Get current session",
        description: "Returns the current user session if authenticated",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Session data",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Session" },
              },
            },
          },
          "401": {
            description: "Not authenticated",
          },
        },
      },
    },
    "/auth/sign-in/email": {
      post: {
        tags: ["Auth"],
        summary: "Sign in with email",
        description: "Authenticate user with email and password",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Successfully signed in",
          },
          "401": {
            description: "Invalid credentials",
          },
        },
      },
    },
    "/auth/onboarding": {
      post: {
        tags: ["Auth"],
        summary: "Complete onboarding",
        description: "Complete user onboarding with brand or freelancer data",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["type", "data"],
                properties: {
                  type: { type: "string", enum: ["client", "freelancer"] },
                  data: { type: "object" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Onboarding completed",
          },
          "400": {
            description: "Invalid data",
          },
          "401": {
            description: "Not authenticated",
          },
        },
      },
    },
    "/tasks": {
      get: {
        tags: ["Tasks"],
        summary: "List tasks",
        description: "Get a list of tasks for the authenticated user",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "List of tasks",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Task" },
                },
              },
            },
          },
          "401": {
            description: "Not authenticated",
          },
        },
      },
      post: {
        tags: ["Tasks"],
        summary: "Create a task",
        description: "Create a new design task",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateTask" },
            },
          },
        },
        responses: {
          "201": {
            description: "Task created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Task" },
              },
            },
          },
          "400": {
            description: "Invalid data",
          },
          "401": {
            description: "Not authenticated",
          },
        },
      },
    },
    "/tasks/{id}": {
      get: {
        tags: ["Tasks"],
        summary: "Get task details",
        description: "Get detailed information about a specific task",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Task details",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TaskDetail" },
              },
            },
          },
          "404": {
            description: "Task not found",
          },
        },
      },
      patch: {
        tags: ["Tasks"],
        summary: "Update task",
        description: "Update task status or details",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateTask" },
            },
          },
        },
        responses: {
          "200": {
            description: "Task updated",
          },
          "404": {
            description: "Task not found",
          },
        },
      },
    },
    "/tasks/{id}/messages": {
      get: {
        tags: ["Tasks"],
        summary: "Get task messages",
        description: "Get all messages for a task",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "List of messages",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Message" },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Tasks"],
        summary: "Send message",
        description: "Send a message on a task",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["content"],
                properties: {
                  content: { type: "string" },
                  attachments: {
                    type: "array",
                    items: { type: "string", format: "uri" },
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Message sent",
          },
        },
      },
    },
    "/tasks/{id}/approve": {
      post: {
        tags: ["Tasks"],
        summary: "Approve task delivery",
        description: "Client approves the final delivery",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Task approved",
          },
          "403": {
            description: "Not authorized",
          },
        },
      },
    },
    "/tasks/{id}/revision": {
      post: {
        tags: ["Tasks"],
        summary: "Request revision",
        description: "Client requests revisions on the delivery",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["feedback"],
                properties: {
                  feedback: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Revision requested",
          },
        },
      },
    },
    "/brand": {
      get: {
        tags: ["Brand"],
        summary: "Get brand profile",
        description: "Get the authenticated user's brand profile",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Brand profile",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Brand" },
              },
            },
          },
        },
      },
      patch: {
        tags: ["Brand"],
        summary: "Update brand profile",
        description: "Update brand profile settings",
        security: [{ cookieAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateBrand" },
            },
          },
        },
        responses: {
          "200": {
            description: "Brand updated",
          },
        },
      },
    },
    "/brand/extract": {
      post: {
        tags: ["Brand"],
        summary: "Extract brand from website",
        description: "Extract brand information from a website URL",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["websiteUrl"],
                properties: {
                  websiteUrl: { type: "string", format: "uri" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Extracted brand data",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Brand" },
              },
            },
          },
        },
      },
    },
    "/admin/stats": {
      get: {
        tags: ["Admin"],
        summary: "Get platform statistics",
        description: "Get overview statistics for the admin dashboard",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Platform statistics",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AdminStats" },
              },
            },
          },
          "403": {
            description: "Admin access required",
          },
        },
      },
    },
    "/admin/freelancers": {
      get: {
        tags: ["Admin"],
        summary: "List freelancers",
        description: "Get all freelancers with their approval status",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "List of freelancers",
          },
          "403": {
            description: "Admin access required",
          },
        },
      },
    },
    "/admin/freelancers/approve": {
      post: {
        tags: ["Admin"],
        summary: "Approve freelancer",
        description: "Approve a freelancer application",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userId"],
                properties: {
                  userId: { type: "string", format: "uuid" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Freelancer approved",
          },
          "403": {
            description: "Admin access required",
          },
        },
      },
    },
    "/admin/freelancers/reject": {
      post: {
        tags: ["Admin"],
        summary: "Reject freelancer",
        description: "Reject a freelancer application",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userId"],
                properties: {
                  userId: { type: "string", format: "uuid" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Freelancer rejected",
          },
          "403": {
            description: "Admin access required",
          },
        },
      },
    },
    "/admin/freelancers/bulk": {
      post: {
        tags: ["Admin"],
        summary: "Bulk update freelancers",
        description: "Approve or reject multiple freelancers at once",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userIds", "action"],
                properties: {
                  userIds: {
                    type: "array",
                    items: { type: "string", format: "uuid" },
                  },
                  action: { type: "string", enum: ["approve", "reject"] },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Bulk operation completed",
          },
          "403": {
            description: "Admin access required",
          },
        },
      },
    },
    "/portal/tasks": {
      get: {
        tags: ["Portal"],
        summary: "List assigned tasks",
        description: "Get tasks assigned to the authenticated freelancer",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "List of assigned tasks",
          },
          "403": {
            description: "Freelancer access required",
          },
        },
      },
    },
    "/portal/available": {
      get: {
        tags: ["Portal"],
        summary: "List available tasks",
        description: "Get tasks available for claiming by freelancers",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "List of available tasks",
          },
          "403": {
            description: "Freelancer access required",
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "better_auth.session_token",
        description: "Session cookie set by Better Auth",
      },
    },
    schemas: {
      Session: {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/User" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          name: { type: "string" },
          role: { type: "string", enum: ["client", "freelancer", "admin"] },
          image: { type: "string", format: "uri", nullable: true },
          onboardingCompleted: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Task: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          description: { type: "string" },
          status: {
            type: "string",
            enum: [
              "PENDING",
              "PAYMENT_PENDING",
              "QUEUED",
              "ASSIGNED",
              "IN_PROGRESS",
              "IN_REVIEW",
              "REVISION_REQUESTED",
              "COMPLETED",
              "CANCELLED",
            ],
          },
          credits: { type: "integer" },
          deliveryOption: { type: "string", enum: ["STANDARD", "EXPRESS"] },
          categoryId: { type: "string", format: "uuid", nullable: true },
          clientId: { type: "string", format: "uuid" },
          freelancerId: { type: "string", format: "uuid", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      TaskDetail: {
        allOf: [
          { $ref: "#/components/schemas/Task" },
          {
            type: "object",
            properties: {
              client: { $ref: "#/components/schemas/User" },
              freelancer: { $ref: "#/components/schemas/User" },
              category: { $ref: "#/components/schemas/Category" },
              files: {
                type: "array",
                items: { $ref: "#/components/schemas/TaskFile" },
              },
              messages: {
                type: "array",
                items: { $ref: "#/components/schemas/Message" },
              },
            },
          },
        ],
      },
      CreateTask: {
        type: "object",
        required: ["title", "description", "deliveryOption"],
        properties: {
          title: { type: "string", minLength: 1 },
          description: { type: "string" },
          deliveryOption: { type: "string", enum: ["STANDARD", "EXPRESS"] },
          categoryId: { type: "string", format: "uuid" },
          styleReferences: {
            type: "array",
            items: { type: "string", format: "uri" },
          },
          attachments: {
            type: "array",
            items: { type: "string", format: "uri" },
          },
        },
      },
      UpdateTask: {
        type: "object",
        properties: {
          status: { type: "string" },
          freelancerId: { type: "string", format: "uuid" },
        },
      },
      Message: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          content: { type: "string" },
          senderId: { type: "string", format: "uuid" },
          taskId: { type: "string", format: "uuid" },
          isSystemMessage: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      TaskFile: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          fileName: { type: "string" },
          fileUrl: { type: "string", format: "uri" },
          fileType: { type: "string" },
          fileSize: { type: "integer" },
          uploadedBy: { type: "string", format: "uuid" },
          isDeliverable: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Category: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          slug: { type: "string" },
          description: { type: "string" },
          baseCredits: { type: "integer" },
        },
      },
      Brand: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          name: { type: "string" },
          website: { type: "string", format: "uri" },
          description: { type: "string" },
          industry: { type: "string" },
          primaryColor: { type: "string" },
          secondaryColor: { type: "string" },
          logoUrl: { type: "string", format: "uri", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      UpdateBrand: {
        type: "object",
        properties: {
          name: { type: "string" },
          website: { type: "string", format: "uri" },
          description: { type: "string" },
          industry: { type: "string" },
          primaryColor: { type: "string" },
          secondaryColor: { type: "string" },
        },
      },
      AdminStats: {
        type: "object",
        properties: {
          totalClients: { type: "integer" },
          totalFreelancers: { type: "integer" },
          pendingApprovals: { type: "integer" },
          activeTasks: { type: "integer" },
          completedTasks: { type: "integer" },
          totalRevenue: { type: "number" },
        },
      },
    },
  },
};
