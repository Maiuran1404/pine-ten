"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { LoadingSpinner } from "@/components/shared/loading";
import { ArrowRight, ArrowLeft, Check, Clock } from "lucide-react";

interface FreelancerOnboardingProps {
  onComplete: () => void;
}

const skills = [
  { id: "photoshop", label: "Adobe Photoshop" },
  { id: "illustrator", label: "Adobe Illustrator" },
  { id: "figma", label: "Figma" },
  { id: "canva", label: "Canva" },
  { id: "after_effects", label: "After Effects" },
  { id: "premiere", label: "Premiere Pro" },
  { id: "other", label: "Other" },
];

const specializations = [
  { id: "static_ads", label: "Static Ads" },
  { id: "video_motion", label: "Video/Motion Graphics" },
  { id: "social_media", label: "Social Media Content" },
  { id: "branding", label: "Branding & Identity" },
  { id: "ui_ux", label: "UI/UX Design" },
];

export function FreelancerOnboarding({ onComplete }: FreelancerOnboardingProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    bio: "",
    skills: [] as string[],
    specializations: [] as string[],
    portfolioUrls: "",
    whatsappNumber: "",
    hourlyRate: "",
  });

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const handleSkillToggle = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.includes(id)
        ? prev.skills.filter((s) => s !== id)
        : [...prev.skills, id],
    }));
  };

  const handleSpecializationToggle = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      specializations: prev.specializations.includes(id)
        ? prev.specializations.filter((s) => s !== id)
        : [...prev.specializations, id],
    }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "freelancer",
          data: {
            ...formData,
            portfolioUrls: formData.portfolioUrls
              .split(",")
              .map((url) => url.trim())
              .filter(Boolean),
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to complete onboarding");
      }

      toast.success("Application submitted! We'll review it shortly.");
      onComplete();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">
          {step === 1 && "About You"}
          {step === 2 && "Your Skills"}
          {step === 3 && "Contact & Portfolio"}
        </CardTitle>
        <CardDescription>
          {step === 1 && "Tell us about your experience"}
          {step === 2 && "What are you great at?"}
          {step === 3 && "How can clients reach you?"}
        </CardDescription>
        <Progress value={progress} className="mt-4" />
      </CardHeader>
      <CardContent>
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself and your design experience..."
                value={formData.bio}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, bio: e.target.value }))
                }
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Expected Hourly Rate (USD)</Label>
              <Input
                id="hourlyRate"
                type="number"
                placeholder="e.g., 25"
                value={formData.hourlyRate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, hourlyRate: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                This helps us match you with appropriate projects
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label>Tools & Software</Label>
              <div className="grid grid-cols-2 gap-3">
                {skills.map((skill) => (
                  <div
                    key={skill.id}
                    className={`flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      formData.skills.includes(skill.id)
                        ? "border-primary bg-primary/5"
                        : "hover:border-muted-foreground/50"
                    }`}
                    onClick={() => handleSkillToggle(skill.id)}
                  >
                    <Checkbox
                      checked={formData.skills.includes(skill.id)}
                      onCheckedChange={() => handleSkillToggle(skill.id)}
                    />
                    <span className="text-sm font-medium">{skill.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Specializations</Label>
              <div className="grid grid-cols-2 gap-3">
                {specializations.map((spec) => (
                  <div
                    key={spec.id}
                    className={`flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      formData.specializations.includes(spec.id)
                        ? "border-primary bg-primary/5"
                        : "hover:border-muted-foreground/50"
                    }`}
                    onClick={() => handleSpecializationToggle(spec.id)}
                  >
                    <Checkbox
                      checked={formData.specializations.includes(spec.id)}
                      onCheckedChange={() => handleSpecializationToggle(spec.id)}
                    />
                    <span className="text-sm font-medium">{spec.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
              <Input
                id="whatsappNumber"
                type="tel"
                placeholder="+1 234 567 8900"
                value={formData.whatsappNumber}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, whatsappNumber: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                We&apos;ll notify you of new tasks via WhatsApp
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="portfolioUrls">Portfolio Links</Label>
              <Textarea
                id="portfolioUrls"
                placeholder="Behance, Dribbble, or personal website URLs (comma-separated)"
                value={formData.portfolioUrls}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, portfolioUrls: e.target.value }))
                }
                rows={3}
              />
            </div>

            <div className="rounded-lg border bg-muted/50 p-4 mt-6">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">What happens next?</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Our team will review your application within 24-48 hours. Once approved,
                    you&apos;ll start receiving task notifications matching your skills.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-6">
          {step > 1 ? (
            <Button
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              disabled={isLoading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <Button onClick={() => setStep((s) => s + 1)}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Application
                  <Check className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
