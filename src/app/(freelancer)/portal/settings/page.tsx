"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { User, Mail, Phone, Calendar, RefreshCw, LogOut, Briefcase, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserSettings {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
  createdAt: string;
}

interface FreelancerProfile {
  bio: string | null;
  skills: string[];
  specializations: string[];
  portfolioUrls: string[];
  whatsappNumber: string | null;
  availability: boolean;
}

const GlassCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div
    className={cn("rounded-xl overflow-hidden border border-border bg-card", className)}
  >
    {children}
  </div>
);

export default function FreelancerSettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [freelancerProfile, setFreelancerProfile] = useState<FreelancerProfile | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    bio: "",
    whatsappNumber: "",
    portfolioUrls: "",
  });
  const [availability, setAvailability] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const [userResponse, profileResponse] = await Promise.all([
        fetch("/api/user/settings"),
        fetch("/api/freelancer/profile"),
      ]);

      if (userResponse.ok) {
        const data = await userResponse.json();
        setUserSettings(data.user);
        setFormData(prev => ({
          ...prev,
          name: data.user.name || "",
          phone: data.user.phone || "",
        }));
      }

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setFreelancerProfile(profileData.profile);
        setFormData(prev => ({
          ...prev,
          bio: profileData.profile?.bio || "",
          whatsappNumber: profileData.profile?.whatsappNumber || "",
          portfolioUrls: profileData.profile?.portfolioUrls?.join(", ") || "",
        }));
        setAvailability(profileData.profile?.availability ?? true);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone || null,
        }),
      });

      if (response.ok) {
        toast.success("Profile updated successfully");
      } else {
        throw new Error("Failed to update profile");
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveFreelancerProfile = async () => {
    setIsSaving(true);
    try {
      const portfolioUrls = formData.portfolioUrls
        .split(",")
        .map(url => url.trim())
        .filter(url => url.length > 0);

      const response = await fetch("/api/freelancer/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: formData.bio,
          whatsappNumber: formData.whatsappNumber || null,
          portfolioUrls,
          availability,
        }),
      });

      if (response.ok) {
        toast.success("Freelancer profile updated successfully");
      } else {
        throw new Error("Failed to update freelancer profile");
      }
    } catch {
      toast.error("Failed to update freelancer profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      router.push("/login");
    } catch {
      toast.error("Failed to log out");
      setIsLoggingOut(false);
    }
  };

  const initials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  if (isLoading) {
    return (
      <div className="min-h-full bg-background p-6 space-y-6">
        <div>
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <GlassCard className="p-6">
          <Skeleton className="h-20 w-full" />
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-0.5 sm:mt-1">
          Manage your account settings and freelancer profile
        </p>
      </div>

      {/* Profile Section */}
      <GlassCard>
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-medium text-foreground">Profile</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Update your personal information</p>
        </div>
        <div className="p-5 space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={session?.user?.image || undefined} />
              <AvatarFallback className="bg-muted text-muted-foreground text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-foreground">{session?.user?.name}</p>
              <p className="text-sm text-muted-foreground">
                {session?.user?.email}
              </p>
            </div>
          </div>

          <div className="h-px bg-muted/40" />

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-muted-foreground">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Your name"
                className=""
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email" className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                value={userSettings?.email || ""}
                disabled
                className="bg-muted text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone" className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+1 (555) 000-0000"
                className=""
              />
            </div>
          </div>

          <Button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className=""
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </GlassCard>

      {/* Freelancer Profile Section */}
      <GlassCard>
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-medium text-foreground">Freelancer Profile</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Update your professional profile</p>
        </div>
        <div className="p-5 space-y-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="bio" className="text-muted-foreground">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                placeholder="Tell us about yourself and your design experience..."
                className=" min-h-[100px]"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="whatsapp" className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                WhatsApp Number
              </Label>
              <Input
                id="whatsapp"
                value={formData.whatsappNumber}
                onChange={(e) =>
                  setFormData({ ...formData, whatsappNumber: e.target.value })
                }
                placeholder="+1 234 567 8900"
                className=""
              />
              <p className="text-xs text-muted-foreground">
                We&apos;ll notify you of new tasks via WhatsApp
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="portfolio" className="flex items-center gap-2 text-muted-foreground">
                <LinkIcon className="h-4 w-4" />
                Portfolio Links
              </Label>
              <Input
                id="portfolio"
                value={formData.portfolioUrls}
                onChange={(e) =>
                  setFormData({ ...formData, portfolioUrls: e.target.value })
                }
                placeholder="Behance, Dribbble, or personal website URLs (comma-separated)"
                className=""
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <Label className="text-foreground">Available for work</Label>
                <p className="text-xs text-muted-foreground">
                  Toggle off if you&apos;re not accepting new tasks
                </p>
              </div>
              <Switch
                checked={availability}
                onCheckedChange={setAvailability}
              />
            </div>
          </div>

          <Button
            onClick={handleSaveFreelancerProfile}
            disabled={isSaving}
            className=""
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Freelancer Profile"
            )}
          </Button>
        </div>
      </GlassCard>

      {/* Account Info */}
      <GlassCard>
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-medium text-foreground">Account</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Your account information</p>
        </div>
        <div className="p-5">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Account ID</span>
              <span className="font-mono text-xs text-muted-foreground">
                {userSettings?.id?.slice(0, 8)}...
              </span>
            </div>
            <div className="h-px bg-muted/40" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Member Since</span>
              <span className="text-muted-foreground">
                {userSettings?.createdAt
                  ? new Date(userSettings.createdAt).toLocaleDateString()
                  : "-"}
              </span>
            </div>
            {freelancerProfile && (
              <>
                <div className="h-px bg-muted/40" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Skills</span>
                  <span className="text-muted-foreground">
                    {freelancerProfile.skills?.length || 0} skills
                  </span>
                </div>
                <div className="h-px bg-muted/40" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Specializations</span>
                  <span className="text-muted-foreground">
                    {freelancerProfile.specializations?.length || 0} specializations
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Logout Section */}
      <GlassCard>
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <LogOut className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-medium text-foreground">Session</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Manage your current session</p>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Log out of your account</p>
              <p className="text-xs text-muted-foreground mt-1">
                You will need to sign in again to access your portal
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/50"
            >
              {isLoggingOut ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Logging out...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  Log Out
                </>
              )}
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
