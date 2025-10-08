export const CATEGORIES = [
  "Writing Materials",
  "Paper Products",
  "Art Supplies",
  "Office Supplies",
  "Technology",
  "Classroom Equipment",
  "Sports Equipment",
  "Books & Reading Materials",
  "Science Lab Equipment",
  "Other",
] as const

export type Category = (typeof CATEGORIES)[number]
