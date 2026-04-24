export const AMENITY_OPTIONS = [
  "24/7 Security",
  "Power Backup",
  "Water Supply",
  "Parking",
  "Elevator",
  "Garden",
  "Gym",
  "Swimming Pool",
  "Air Conditioning",
  "Wifi",
  "Furnished",
  "Semi-Furnished",
  "Balcony",
  "Pet Friendly",
  "Club House",
  "Children's Play Area",
  "Intercom",
  "CCTV",
  "Fire Safety",
  "Gas Pipeline",
] as const;

export type Amenity = (typeof AMENITY_OPTIONS)[number];
