/**
 * Shared types for chat components
 */

export interface UploadedFile {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

export interface QuickOptions {
  question: string;
  options: string[];
}

export interface StyleReference {
  category: string;
  name: string;
  imageUrl: string;
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
