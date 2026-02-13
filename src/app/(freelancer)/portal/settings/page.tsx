'use client'

import { useEffect, useState, useRef } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useSession } from '@/lib/auth-client'
import { Phone, RefreshCw, Briefcase, Link as LinkIcon, Sparkles, X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettings } from '@/hooks/use-settings'
import { SettingsCard, SettingsCardHeader } from '@/components/settings/settings-card'
import { ProfileSection } from '@/components/settings/profile-section'
import { AccountInfoSection } from '@/components/settings/account-info-section'
import { SessionSection } from '@/components/settings/session-section'

interface FreelancerProfile {
  bio: string | null
  skills: string[]
  specializations: string[]
  portfolioUrls: string[]
  whatsappNumber: string | null
  availability: boolean
}

// Common skill suggestions
const skillSuggestions = [
  'Illustration',
  'Graphic Design',
  'UI/UX Design',
  'Brand Design',
  'Motion Graphics',
  '3D Design',
  'Web Design',
  'Social Media Design',
  'Packaging Design',
  'Typography',
  'Photo Editing',
  'Video Editing',
]

const specializationSuggestions = [
  'Logo Design',
  'Brand Identity',
  'Marketing Materials',
  'App Design',
  'Website Design',
  'Product Design',
  'Editorial Design',
  'Presentation Design',
  'Icon Design',
  'Infographics',
]

// Editable tag input component
function TagInput({
  tags,
  onTagsChange,
  suggestions,
  placeholder,
  label,
}: {
  tags: string[]
  onTagsChange: (tags: string[]) => void
  suggestions: string[]
  placeholder: string
  label: string
}) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onTagsChange([...tags, trimmedTag])
    }
    setInputValue('')
    setShowSuggestions(false)
  }

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  const filteredSuggestions = suggestions.filter(
    (s) => !tags.includes(s) && s.toLowerCase().includes(inputValue.toLowerCase())
  )

  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground">{label}</Label>
      <div className="relative">
        <div
          className={cn(
            'flex flex-wrap gap-2 p-3 min-h-[44px] rounded-md border bg-background cursor-text',
            'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2'
          )}
          onClick={() => inputRef.current?.focus()}
        >
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1 pr-1">
              {tag}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeTag(tag)
                }}
                className="ml-1 rounded-full p-0.5 hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
              setShowSuggestions(true)
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={tags.length === 0 ? placeholder : 'Add more...'}
            className="flex-1 min-w-[120px] bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full max-h-48 overflow-auto rounded-md border bg-popover shadow-md">
            {filteredSuggestions.slice(0, 8).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  addTag(suggestion)
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
              >
                <Plus className="h-3 w-3" />
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Press Enter to add a custom {label.toLowerCase().replace('your ', '')}
      </p>
    </div>
  )
}

export default function FreelancerSettingsPage() {
  const { data: session } = useSession()
  const {
    isLoading,
    isSaving,
    isLoggingOut,
    userSettings,
    formData,
    setFormData,
    handleSaveProfile,
    handleLogout,
    getInitials,
  } = useSettings()
  const [isSavingSkills, setIsSavingSkills] = useState(false)
  const [freelancerProfile, setFreelancerProfile] = useState<FreelancerProfile | null>(null)
  const [freelancerFormData, setFreelancerFormData] = useState({
    bio: '',
    whatsappNumber: '',
    portfolioUrls: '',
  })
  const [skills, setSkills] = useState<string[]>([])
  const [specializations, setSpecializations] = useState<string[]>([])
  const [availability, setAvailability] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function loadFreelancerProfile() {
      try {
        const profileResponse = await fetch('/api/freelancer/profile')
        if (profileResponse.ok && !cancelled) {
          const profileData = await profileResponse.json()
          setFreelancerProfile(profileData)
          setFreelancerFormData({
            bio: profileData?.bio || '',
            whatsappNumber: profileData?.whatsappNumber || '',
            portfolioUrls: profileData?.portfolioUrls?.join(', ') || '',
          })
          setSkills(profileData?.skills || [])
          setSpecializations(profileData?.specializations || [])
          setAvailability(profileData?.availability ?? true)
        }
      } catch (error) {
        console.error('Failed to fetch freelancer profile:', error)
      }
    }
    loadFreelancerProfile()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSaveFreelancerProfile = async () => {
    try {
      const portfolioUrls = freelancerFormData.portfolioUrls
        .split(',')
        .map((url) => url.trim())
        .filter((url) => url.length > 0)

      const response = await fetch('/api/freelancer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio: freelancerFormData.bio,
          whatsappNumber: freelancerFormData.whatsappNumber || null,
          portfolioUrls,
          availability,
        }),
      })

      if (response.ok) {
        toast.success('Freelancer profile updated successfully')
      } else {
        throw new Error('Failed to update freelancer profile')
      }
    } catch {
      toast.error('Failed to update freelancer profile')
    }
  }

  const handleSaveSkills = async () => {
    setIsSavingSkills(true)
    try {
      const response = await fetch('/api/freelancer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skills,
          specializations,
        }),
      })

      if (response.ok) {
        toast.success('Skills updated successfully')
        setFreelancerProfile((prev) => (prev ? { ...prev, skills, specializations } : null))
      } else {
        throw new Error('Failed to update skills')
      }
    } catch {
      toast.error('Failed to update skills')
    } finally {
      setIsSavingSkills(false)
    }
  }

  const initials = getInitials(session?.user?.name)

  if (isLoading) {
    return (
      <div className="min-h-full bg-background">
        <div className="border-b border-border">
          <div className="max-w-6xl mx-auto px-6 py-5">
            <Skeleton className="h-7 w-32" />
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 py-4 space-y-6">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-4 space-y-4 sm:space-y-6">
        {/* Profile Section */}
        <ProfileSection
          session={session}
          initials={initials}
          formData={formData}
          setFormData={setFormData}
          isSaving={isSaving}
          onSave={handleSaveProfile}
          emailValue={userSettings?.email || ''}
          phoneIcon={Phone}
          phonePlaceholder="+1 (555) 000-0000"
        />

        {/* Skills & Specializations Section */}
        <SettingsCard>
          <SettingsCardHeader
            icon={Sparkles}
            title="Skills & Expertise"
            description="Add your skills to help us match you with relevant tasks"
          />
          <div className="p-5 space-y-6">
            <TagInput
              tags={skills}
              onTagsChange={setSkills}
              suggestions={skillSuggestions}
              placeholder="Type a skill like Illustration, UI/UX Design..."
              label="Your Skills"
            />

            <TagInput
              tags={specializations}
              onTagsChange={setSpecializations}
              suggestions={specializationSuggestions}
              placeholder="Type a specialization like Logo Design, Brand Identity..."
              label="Your Specializations"
            />

            <Button onClick={handleSaveSkills} disabled={isSavingSkills}>
              {isSavingSkills ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Skills'
              )}
            </Button>
          </div>
        </SettingsCard>

        {/* Freelancer Profile Section */}
        <SettingsCard>
          <SettingsCardHeader
            icon={Briefcase}
            title="Freelancer Profile"
            description="Update your professional profile"
          />
          <div className="p-5 space-y-6">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="bio" className="text-muted-foreground">
                  Bio
                </Label>
                <Textarea
                  id="bio"
                  value={freelancerFormData.bio}
                  onChange={(e) =>
                    setFreelancerFormData({ ...freelancerFormData, bio: e.target.value })
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
                  value={freelancerFormData.whatsappNumber}
                  onChange={(e) =>
                    setFreelancerFormData({
                      ...freelancerFormData,
                      whatsappNumber: e.target.value,
                    })
                  }
                  placeholder="+1 234 567 8900"
                  className=""
                />
                <p className="text-xs text-muted-foreground">
                  We&apos;ll notify you of new tasks via WhatsApp
                </p>
              </div>

              <div className="grid gap-2">
                <Label
                  htmlFor="portfolio"
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <LinkIcon className="h-4 w-4" />
                  Portfolio Links
                </Label>
                <Input
                  id="portfolio"
                  value={freelancerFormData.portfolioUrls}
                  onChange={(e) =>
                    setFreelancerFormData({
                      ...freelancerFormData,
                      portfolioUrls: e.target.value,
                    })
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
                <Switch checked={availability} onCheckedChange={setAvailability} />
              </div>
            </div>

            <Button onClick={handleSaveFreelancerProfile} disabled={isSaving} className="">
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Freelancer Profile'
              )}
            </Button>
          </div>
        </SettingsCard>

        {/* Account Info */}
        <AccountInfoSection userSettings={userSettings}>
          {freelancerProfile && (
            <>
              <div className="h-px bg-muted/40" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Skills</span>
                <span className="text-muted-foreground">{skills.length} skills</span>
              </div>
              <div className="h-px bg-muted/40" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Specializations</span>
                <span className="text-muted-foreground">
                  {specializations.length} specializations
                </span>
              </div>
            </>
          )}
        </AccountInfoSection>

        {/* Logout Section */}
        <SessionSection
          isLoggingOut={isLoggingOut}
          onLogout={handleLogout}
          description="You will need to sign in again to access your portal"
          className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/50"
        />
      </div>
    </div>
  )
}
