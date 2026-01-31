"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreativeIntakeChat } from "@/components/creative-intake";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { IntakeData } from "@/lib/creative-intake/types";

export default function IntakePage() {
  const router = useRouter();
  const [isComplete, setIsComplete] = useState(false);

  const handleComplete = async (data: IntakeData) => {
    setIsComplete(true);

    // TODO: Create task from intake data
    // This would call the tasks API to create a new task
    // For now, we just show completion state

    // After a delay, redirect to tasks or dashboard
    setTimeout(() => {
      router.push("/dashboard/tasks");
    }, 2000);
  };

  const handleCancel = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <div className="text-sm text-muted-foreground">
            New Project Brief
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container max-w-2xl mx-auto py-8">
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden min-h-[600px]">
          <CreativeIntakeChat
            onComplete={handleComplete}
            onCancel={handleCancel}
          />
        </div>
      </main>
    </div>
  );
}
