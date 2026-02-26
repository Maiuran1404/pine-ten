export interface BrandReference {
  id: string
  name: string
  description: string | null
  imageUrl: string
  toneBucket: string
  energyBucket: string
  densityBucket: string
  colorBucket: string
  score?: number
}
