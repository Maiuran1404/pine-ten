"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Query keys for cache management
export const queryKeys = {
  // User queries
  user: {
    all: ["user"] as const,
    credits: () => [...queryKeys.user.all, "credits"] as const,
    settings: () => [...queryKeys.user.all, "settings"] as const,
  },
  // Task queries
  tasks: {
    all: ["tasks"] as const,
    list: (filters?: { status?: string; limit?: number; offset?: number }) =>
      [...queryKeys.tasks.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.tasks.all, "detail", id] as const,
    messages: (id: string) => [...queryKeys.tasks.all, "messages", id] as const,
  },
  // Admin queries
  admin: {
    all: ["admin"] as const,
    stats: () => [...queryKeys.admin.all, "stats"] as const,
    clients: () => [...queryKeys.admin.all, "clients"] as const,
    freelancers: () => [...queryKeys.admin.all, "freelancers"] as const,
    tasks: () => [...queryKeys.admin.all, "tasks"] as const,
  },
  // Freelancer queries
  freelancer: {
    all: ["freelancer"] as const,
    profile: () => [...queryKeys.freelancer.all, "profile"] as const,
    stats: () => [...queryKeys.freelancer.all, "stats"] as const,
    availableTasks: () => [...queryKeys.freelancer.all, "available-tasks"] as const,
  },
  // Brand queries
  brand: {
    all: ["brand"] as const,
    current: () => [...queryKeys.brand.all, "current"] as const,
  },
  // Draft queries
  drafts: {
    all: ["drafts"] as const,
    list: () => [...queryKeys.drafts.all, "list"] as const,
    detail: (id: string) => [...queryKeys.drafts.all, "detail", id] as const,
  },
};

// Generic fetcher function
async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error?.message || error.error || "Request failed");
  }
  const data = await response.json();
  return data.data ?? data;
}

// User hooks
export function useUserCredits() {
  return useQuery({
    queryKey: queryKeys.user.credits(),
    queryFn: () => fetcher<{ credits: number }>("/api/user/credits"),
  });
}

export function useUserSettings() {
  return useQuery({
    queryKey: queryKeys.user.settings(),
    queryFn: () => fetcher<Record<string, unknown>>("/api/user/settings"),
  });
}

// Task hooks
interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  [key: string]: unknown;
}

interface TasksResponse {
  tasks: Task[];
  stats: {
    activeTasks: number;
    completedTasks: number;
    totalCreditsUsed: number;
  };
}

export function useTasks(filters?: { status?: string; limit?: number; offset?: number }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.limit) params.set("limit", filters.limit.toString());
  if (filters?.offset) params.set("offset", filters.offset.toString());

  const queryString = params.toString();
  const url = `/api/tasks${queryString ? `?${queryString}` : ""}`;

  return useQuery({
    queryKey: queryKeys.tasks.list(filters),
    queryFn: () => fetcher<TasksResponse>(url),
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(id),
    queryFn: () => fetcher<Task>(`/api/tasks/${id}`),
    enabled: !!id,
  });
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
}

export function useTaskMessages(taskId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.messages(taskId),
    queryFn: () => fetcher<{ messages: Message[] }>(`/api/tasks/${taskId}/messages`),
    enabled: !!taskId,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time feel
  });
}

// Admin hooks
interface AdminStats {
  totalClients: number;
  totalFreelancers: number;
  pendingApprovals: number;
  activeTasks: number;
  completedTasks: number;
  totalRevenue: number;
}

export function useAdminStats() {
  return useQuery({
    queryKey: queryKeys.admin.stats(),
    queryFn: () => fetcher<AdminStats>("/api/admin/stats"),
  });
}

export function useAdminClients() {
  return useQuery({
    queryKey: queryKeys.admin.clients(),
    queryFn: () => fetcher<{ clients: unknown[] }>("/api/admin/clients"),
  });
}

export function useAdminFreelancers() {
  return useQuery({
    queryKey: queryKeys.admin.freelancers(),
    queryFn: () => fetcher<{ freelancers: unknown[] }>("/api/admin/freelancers"),
  });
}

// Freelancer hooks
export function useFreelancerProfile() {
  return useQuery({
    queryKey: queryKeys.freelancer.profile(),
    queryFn: () => fetcher<unknown>("/api/freelancer/profile"),
  });
}

export function useFreelancerStats() {
  return useQuery({
    queryKey: queryKeys.freelancer.stats(),
    queryFn: () => fetcher<unknown>("/api/freelancer/stats"),
  });
}

export function useAvailableTasks() {
  return useQuery({
    queryKey: queryKeys.freelancer.availableTasks(),
    queryFn: () => fetcher<{ tasks: Task[] }>("/api/freelancer/available-tasks"),
  });
}

// Brand hooks
export function useBrand() {
  return useQuery({
    queryKey: queryKeys.brand.current(),
    queryFn: () => fetcher<unknown>("/api/brand"),
  });
}

// Mutation hooks
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      description: string;
      category: string;
      creditsRequired: number;
      [key: string]: unknown;
    }) => {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to create task");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate tasks list and user credits
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.credits() });
    },
  });
}

export function useApproveFreelancer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (freelancerId: string) => {
      const response = await fetch("/api/admin/freelancers/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freelancerId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to approve freelancer");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.freelancers() });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() });
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, content }: { taskId: string; content: string }) => {
      const response = await fetch(`/api/tasks/${taskId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to send message");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.messages(variables.taskId) });
    },
  });
}
