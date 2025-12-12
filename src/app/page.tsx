import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import {
  ArrowRight,
  MessageSquare,
  Zap,
  Shield,
  Users,
  CheckCircle,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center py-20 px-4">
        <div className="container max-w-5xl text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Professional Design
            <br />
            <span className="text-muted-foreground">On Demand</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Get high-quality static ads, video content, and social media graphics
            created by vetted freelance designers. Simply describe what you need.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/register">
                Start Creating
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/register?type=freelancer">Join as Designer</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            How It Works
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Describe Your Need</h3>
              <p className="text-muted-foreground">
                Chat with our AI assistant to create a detailed brief for your
                design project.
              </p>
            </div>
            <div className="text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary mx-auto mb-4">
                <Users className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Expert Assignment</h3>
              <p className="text-muted-foreground">
                Your task is matched to a skilled freelancer who specializes in
                your project type.
              </p>
            </div>
            <div className="text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Get Your Design</h3>
              <p className="text-muted-foreground">
                Receive high-quality deliverables with source files. Request
                revisions if needed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="container max-w-5xl">
          <div className="grid gap-12 md:grid-cols-2 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">
                Why Choose Us
              </h2>
              <div className="space-y-4">
                {[
                  {
                    icon: Zap,
                    title: "Fast Turnaround",
                    description:
                      "Get your designs delivered quickly, often within 24-48 hours.",
                  },
                  {
                    icon: Shield,
                    title: "Quality Guaranteed",
                    description:
                      "All freelancers are vetted. Includes 2 revision rounds.",
                  },
                  {
                    icon: Users,
                    title: "Expert Designers",
                    description:
                      "Work with professionals skilled in your specific design needs.",
                  },
                ].map((benefit) => (
                  <div key={benefit.title} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <benefit.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{benefit.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-muted rounded-lg p-8">
              <h3 className="text-2xl font-bold mb-4">Simple Pricing</h3>
              <p className="text-4xl font-bold mb-2">
                $49 <span className="text-xl font-normal text-muted-foreground">/ credit</span>
              </p>
              <p className="text-muted-foreground mb-6">
                Pay only for what you need. Volume discounts available.
              </p>
              <ul className="space-y-2 mb-6">
                {[
                  "Static ads: 1-3 credits",
                  "Video/motion: 3-5 credits",
                  "Social media packs: 2-3 credits",
                  "Source files included",
                  "Commercial usage rights",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button className="w-full" asChild>
                <Link href="/register">Get Started Free</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container max-w-3xl text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your Design Workflow?
          </h2>
          <p className="text-lg opacity-90 mb-8">
            Join hundreds of businesses getting professional designs on demand.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/register">
              Create Free Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo />
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Nameless. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
