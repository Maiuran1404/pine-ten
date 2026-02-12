/**
 * Utility functions for the ClientBrandOnboarding component.
 * Contains slider label logic and style name detection.
 */

/** Get a slider label based on its value and low/high labels. */
export function getSliderLabel(value: number, lowLabel: string, highLabel: string): string {
  if (value < 35) return lowLabel;
  if (value > 65) return highLabel;
  return "Balanced";
}

/** Determine the brand style name based on detected tone/energy buckets. */
export function detectStyleName(
  tone?: string,
  energy?: string
): string {
  if (tone === "playful" && energy === "bold") {
    return "Vibrant Bold";
  } else if (tone === "playful" && energy === "minimal") {
    return "Playful Minimal";
  } else if (tone === "serious" && energy === "bold") {
    return "Professional Impact";
  } else if (tone === "serious" && energy === "minimal") {
    return "Elegant Refined";
  } else if (tone === "balanced" && energy === "balanced") {
    return "Versatile Classic";
  } else if (tone === "playful") {
    return "Spirited Modern";
  } else if (tone === "serious") {
    return "Corporate Clean";
  } else if (energy === "bold") {
    return "Bold Statement";
  } else if (energy === "minimal") {
    return "Clean Minimal";
  }
  return "Your Brand Style";
}
