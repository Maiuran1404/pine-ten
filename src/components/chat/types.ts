/**
 * Shared types for chat components
 */

export interface UploadedFile {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

/**
 * Moodboard item for the visual moodboard panel
 */
export interface MoodboardItem {
  id: string;
  type: 'style' | 'color' | 'image' | 'upload';
  imageUrl: string;
  name: string;
  metadata?: {
    styleAxis?: string;
    deliverableType?: string;
    colorSamples?: string[];
    styleId?: string;
  };
  order: number;
  addedAt: Date;
}

/**
 * Chat stages for progress tracking
 */
export type ChatStage = 'brief' | 'style' | 'details' | 'review' | 'submit';

export interface QuickOptions {
  question: string;
  options: string[];
  multiSelect?: boolean;
}

export interface StyleReference {
  category: string;
  name: string;
  description?: string | null;
  imageUrl: string;
}

export interface DeliverableStyle {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string;
  deliverableType: string;
  styleAxis: string;
  subStyle: string | null;
  semanticTags: string[];
  // Brand-aware scoring fields
  brandMatchScore?: number;
  matchReason?: string;
}

export interface DeliverableStyleMarker {
  type: "initial" | "more" | "different";
  deliverableType: string;
  styleAxis?: string;
}

export interface TaskProposal {
  title: string;
  description: string;
  category: string;
  estimatedHours: number;
  deliveryDays?: number;
  creditsRequired: number;
  deadline?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  styleReferences?: StyleReference[];
  deliverableStyles?: DeliverableStyle[];
  deliverableStyleMarker?: DeliverableStyleMarker;
  taskProposal?: TaskProposal;
  attachments?: UploadedFile[];
  quickOptions?: QuickOptions;
}

/**
 * Calculate delivery date from business days
 */
export function getDeliveryDateString(businessDays: number): string {
  const date = new Date();
  let daysAdded = 0;
  while (daysAdded < businessDays) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
    }
  }
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayName = days[date.getDay()];
  const dayNum = date.getDate();
  const suffix = dayNum === 1 || dayNum === 21 || dayNum === 31 ? 'st' : dayNum === 2 || dayNum === 22 ? 'nd' : dayNum === 3 || dayNum === 23 ? 'rd' : 'th';
  const monthName = months[date.getMonth()];
  return `${dayName} ${dayNum}${suffix} ${monthName}`;
}
