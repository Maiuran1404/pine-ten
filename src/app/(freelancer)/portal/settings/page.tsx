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
import { User, Bell, Mail, Phone, Calendar, RefreshCw, LogOut, Briefcase, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationPreferences {
  email: boolean;
  inApp: boolean;
  taskUpdates: boolean;
  marketing: boolean;
}

interface UserSettings {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
  notificationPreferences: NotificationPreferences | null;
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
    className={cn("rounded-xl overflow-hidden border border-[#2a2a30]/50", className)}
    style={{
      background: 'linear-gradient(180deg, rgba(20, 20, 24, 0.6) 0%, rgba(12, 12, 15, 0.8) 100%)',
      backdropFilter: 'blur(12px)',
    }}
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
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    email: true,
    inApp: true,
    taskUpdates: true,
    marketing: false,
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
        if (data.user.notificationPreferences) {
          setNotifications(data.user.notificationPreferences);
        }
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

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notificationPreferences: notifications,
        }),
      });

      if (response.ok) {
        toast.success("Notification preferences updated");
      } else {
        throw new Error("Failed to update notifications");
      }
    } catch {
      toast.error("Failed to update notification preferences");
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
      <div className="min-h-full bg-[#0a0a0a] p-6 space-y-6">
        <div>
          <Skeleton className="h-7 w-32 bg-[#2a2a30]" />
          <Skeleton className="h-4 w-64 mt-2 bg-[#2a2a30]" />
        </div>
        <GlassCard className="p-6">
          <Skeleton className="h-20 w-full bg-[#2a2a30]" />
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#0a0a0a] p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="text-[#6b6b6b] mt-1">
          Manage your account settings and freelancer profile
        </p>
      </div>

      {/* Profile Section */}
      <GlassCard>
        <div className="p-5 border-b border-[#2a2a30]/40">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-[#6b6b6b]" />
            <h2 className="text-sm font-medium text-white">Profile</h2>
          </div>
          <p className="text-xs text-[#4a4a4a] mt-1">Update your personal information</p>
        </div>
        <div className="p-5 space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={session?.user?.image || undefined} />
              <AvatarFallback className="bg-[#2a2a30] text-[#6b6b6b] text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-white">{session?.user?.name}</p>
              <p className="text-sm text-[#6b6b6b]">
                {session?.user?.email}
              </p>
            </div>
          </div>

          <div className="h-px bg-[#2a2a30]/40" />

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-[#9a9a9a]">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Your name"
                className="bg-[#0a0a0a] border-[#2a2a30] text-white focus:border-[#3a3a40]"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email" className="flex items-center gap-2 text-[#9a9a9a]">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                value={userSettings?.email || ""}
                disabled
                className="bg-[#1a1a1f] border-[#2a2a30] text-[#6b6b6b]"
              />
              <p className="text-xs text-[#4a4a4a]">
                Email cannot be changed
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone" className="flex items-center gap-2 text-[#9a9a9a]">
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
                className="bg-[#0a0a0a] border-[#2a2a30] text-white focus:border-[#3a3a40]"
              />
            </div>
          </div>

          <Button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="bg-white text-black hover:bg-white/90"
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
        <div className="p-5 border-b border-[#2a2a30]/40">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-[#6b6b6b]" />
            <h2 className="text-sm font-medium text-white">Freelancer Profile</h2>
          </div>
          <p className="text-xs text-[#4a4a4a] mt-1">Update your professional profile</p>
        </div>
        <div className="p-5 space-y-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="bio" className="text-[#9a9a9a]">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                placeholder="Tell us about yourself and your design experience..."
                className="bg-[#0a0a0a] border-[#2a2a30] text-white focus:border-[#3a3a40] min-h-[100px]"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="whatsapp" className="flex items-center gap-2 text-[#9a9a9a]">
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
                className="bg-[#0a0a0a] border-[#2a2a30] text-white focus:border-[#3a3a40]"
              />
              <p className="text-xs text-[#4a4a4a]">
                We&apos;ll notify you of new tasks via WhatsApp
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="portfolio" className="flex items-center gap-2 text-[#9a9a9a]">
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
                className="bg-[#0a0a0a] border-[#2a2a30] text-white focus:border-[#3a3a40]"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <Label className="text-white">Available for work</Label>
                <p className="text-xs text-[#4a4a4a]">
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
            className="bg-white text-black hover:bg-white/90"
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

      {/* Notification Preferences */}
      <GlassCard>
        <div className="p-5 border-b border-[#2a2a30]/40">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[#6b6b6b]" />
            <h2 className="text-sm font-medium text-white">Notifications</h2>
          </div>
          <p className="text-xs text-[#4a4a4a] mt-1">Choose how you want to receive notifications</p>
        </div>
        <div className="p-5 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-white">Email Notifications</Label>
                <p className="text-xs text-[#4a4a4a]">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                checked={notifications.email}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, email: checked })
                }
              />
            </div>

            <div className="h-px bg-[#2a2a30]/40" />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-white">In-App Notifications</Label>
                <p className="text-xs text-[#4a4a4a]">
                  Receive notifications in the portal
                </p>
              </div>
              <Switch
                checked={notifications.inApp}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, inApp: checked })
                }
              />
            </div>

            <div className="h-px bg-[#2a2a30]/40" />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-white">Task Updates</Label>
                <p className="text-xs text-[#4a4a4a]">
                  Get notified about new available tasks
                </p>
              </div>
              <Switch
                checked={notifications.taskUpdates}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, taskUpdates: checked })
                }
              />
            </div>

            <div className="h-px bg-[#2a2a30]/40" />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-white">Marketing Emails</Label>
                <p className="text-xs text-[#4a4a4a]">
                  Receive news and promotional content
                </p>
              </div>
              <Switch
                checked={notifications.marketing}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, marketing: checked })
                }
              />
            </div>
          </div>

          <Button
            onClick={handleSaveNotifications}
            disabled={isSaving}
            className="bg-white text-black hover:bg-white/90"
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Preferences"
            )}
          </Button>
        </div>
      </GlassCard>

      {/* Account Info */}
      <GlassCard>
        <div className="p-5 border-b border-[#2a2a30]/40">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#6b6b6b]" />
            <h2 className="text-sm font-medium text-white">Account</h2>
          </div>
          <p className="text-xs text-[#4a4a4a] mt-1">Your account information</p>
        </div>
        <div className="p-5">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[#6b6b6b]">Account ID</span>
              <span className="font-mono text-xs text-[#9a9a9a]">
                {userSettings?.id?.slice(0, 8)}...
              </span>
            </div>
            <div className="h-px bg-[#2a2a30]/40" />
            <div className="flex justify-between text-sm">
              <span className="text-[#6b6b6b]">Member Since</span>
              <span className="text-[#9a9a9a]">
                {userSettings?.createdAt
                  ? new Date(userSettings.createdAt).toLocaleDateString()
                  : "-"}
              </span>
            </div>
            {freelancerProfile && (
              <>
                <div className="h-px bg-[#2a2a30]/40" />
                <div className="flex justify-between text-sm">
                  <span className="text-[#6b6b6b]">Skills</span>
                  <span className="text-[#9a9a9a]">
                    {freelancerProfile.skills?.length || 0} skills
                  </span>
                </div>
                <div className="h-px bg-[#2a2a30]/40" />
                <div className="flex justify-between text-sm">
                  <span className="text-[#6b6b6b]">Specializations</span>
                  <span className="text-[#9a9a9a]">
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
        <div className="p-5 border-b border-[#2a2a30]/40">
          <div className="flex items-center gap-2">
            <LogOut className="h-4 w-4 text-[#6b6b6b]" />
            <h2 className="text-sm font-medium text-white">Session</h2>
          </div>
          <p className="text-xs text-[#4a4a4a] mt-1">Manage your current session</p>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Log out of your account</p>
              <p className="text-xs text-[#4a4a4a] mt-1">
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
