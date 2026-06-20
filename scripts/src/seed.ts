import { db } from "@workspace/db";
import { usersTable, propertiesTable, roomsTable } from "@workspace/db";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("password123", 10);

  const [host1] = await db
    .insert(usersTable)
    .values({
      name: "Kavitha Nair",
      email: "kavitha@example.com",
      mobile: "9876543210",
      passwordHash,
      role: "host",
    })
    .onConflictDoNothing()
    .returning();

  const [host2] = await db
    .insert(usersTable)
    .values({
      name: "Rajan Pillai",
      email: "rajan@example.com",
      mobile: "9876543211",
      passwordHash,
      role: "host",
    })
    .onConflictDoNothing()
    .returning();

  const [host3] = await db
    .insert(usersTable)
    .values({
      name: "Sunita Sharma",
      email: "sunita@example.com",
      mobile: "9876543212",
      passwordHash,
      role: "host",
    })
    .onConflictDoNothing()
    .returning();

  await db
    .insert(usersTable)
    .values({
      name: "Arjun Guest",
      email: "guest@example.com",
      mobile: "9123456789",
      passwordHash,
      role: "guest",
    })
    .onConflictDoNothing();

  if (!host1 || !host2 || !host3) {
    console.log("Hosts already exist, skipping property seed.");
    return;
  }

  const [prop1] = await db
    .insert(propertiesTable)
    .values({
      hostId: host1.id,
      name: "Kavitha's Coorg Cottage",
      address: "Madikeri Road, Kushalnagar",
      city: "Coorg",
      state: "Karnataka",
      description:
        "A serene coffee estate homestay nestled in the misty hills of Coorg. Wake up to the aroma of fresh coffee and birdsong. Perfect for couples and families seeking a peaceful retreat.",
      amenities: ["WiFi", "Parking", "Breakfast", "Coffee Tour", "Garden", "Hot Water"],
      mealsIncluded: true,
      nearbyAttractions: ["Abbey Falls", "Raja's Seat", "Dubare Elephant Camp", "Talakaveri"],
      bookingMode: "instant",
      locationLat: 12.4244,
      locationLng: 75.7382,
      photos: [
        "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800",
        "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800",
      ],
      status: "active",
    })
    .returning();

  const [prop2] = await db
    .insert(propertiesTable)
    .values({
      hostId: host2.id,
      name: "Ooty Nilgiri Heritage Home",
      address: "Charring Cross, Ooty",
      city: "Ooty",
      state: "Tamil Nadu",
      description:
        "A colonial-era bungalow surrounded by tea gardens and eucalyptus forests. Enjoy authentic Nilgiri tea on the veranda while taking in breathtaking mountain views.",
      amenities: ["WiFi", "Fireplace", "Garden", "Parking", "Hot Water", "Library"],
      mealsIncluded: true,
      nearbyAttractions: ["Ooty Lake", "Doddabetta Peak", "Botanical Gardens", "Tea Museum"],
      bookingMode: "inquiry",
      locationLat: 11.4102,
      locationLng: 76.6950,
      photos: [
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800",
        "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=800",
      ],
      status: "active",
    })
    .returning();

  const [prop3] = await db
    .insert(propertiesTable)
    .values({
      hostId: host3.id,
      name: "Munnar Tea Valley Retreat",
      address: "Devikulam Road, Munnar",
      city: "Munnar",
      state: "Kerala",
      description:
        "Immerse yourself in the lush green tea gardens of Munnar. This traditional Kerala-style homestay offers authentic local cuisine and guided nature walks through tea estates.",
      amenities: ["WiFi", "Parking", "Breakfast", "Nature Walk", "Hot Water", "Ayurvedic Massage"],
      mealsIncluded: true,
      nearbyAttractions: ["Eravikulam National Park", "Mattupetty Dam", "Kundala Lake", "Top Station"],
      bookingMode: "instant",
      locationLat: 10.0889,
      locationLng: 77.0595,
      photos: [
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
        "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      ],
      status: "active",
    })
    .returning();

  const [prop4] = await db
    .insert(propertiesTable)
    .values({
      hostId: host1.id,
      name: "Goa Spice Garden Villa",
      address: "Ponda, North Goa",
      city: "Goa",
      state: "Goa",
      description:
        "A tropical villa surrounded by a working spice plantation. Enjoy spice tours, traditional Goan cuisine, and the laid-back Portuguese colonial charm just 20 min from the beaches.",
      amenities: ["WiFi", "Pool", "Parking", "Spice Tour", "Breakfast", "Air Conditioning"],
      mealsIncluded: false,
      nearbyAttractions: ["Dudhsagar Falls", "Old Goa Churches", "Calangute Beach", "Mapusa Market"],
      bookingMode: "instant",
      locationLat: 15.4094,
      locationLng: 74.0158,
      photos: [
        "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800",
        "https://images.unsplash.com/photo-1621275471769-e6aa344546e0?w=800",
      ],
      status: "active",
    })
    .returning();

  const [prop5] = await db
    .insert(propertiesTable)
    .values({
      hostId: host2.id,
      name: "Manali Pine Forest Homestay",
      address: "Old Manali Road, Vashisht",
      city: "Manali",
      state: "Himachal Pradesh",
      description:
        "A cozy mountain homestay in the apple orchards of Old Manali. Wood-panelled rooms with valley views, bonfire evenings, and homemade Himachali meals.",
      amenities: ["WiFi", "Bonfire", "Parking", "Breakfast", "Hot Water", "Mountain View"],
      mealsIncluded: true,
      nearbyAttractions: ["Solang Valley", "Rohtang Pass", "Hadimba Temple", "Beas River"],
      bookingMode: "inquiry",
      locationLat: 32.2396,
      locationLng: 77.1887,
      photos: [
        "https://images.unsplash.com/photo-1584395630827-860eee694d7b?w=800",
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      ],
      status: "active",
    })
    .returning();

  if (!prop1 || !prop2 || !prop3 || !prop4 || !prop5) return;

  await db.insert(roomsTable).values([
    {
      propertyId: prop1.id,
      name: "Coffee Blossom Suite",
      type: "Suite",
      pricePerNight: 4500,
      capacity: 2,
      status: "available",
      photos: ["https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800"],
    },
    {
      propertyId: prop1.id,
      name: "Estate Family Room",
      type: "Family Room",
      pricePerNight: 6500,
      capacity: 4,
      status: "available",
      photos: ["https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800"],
    },
    {
      propertyId: prop2.id,
      name: "Nilgiri View Room",
      type: "Deluxe Room",
      pricePerNight: 3800,
      capacity: 2,
      status: "available",
      photos: ["https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800"],
    },
    {
      propertyId: prop2.id,
      name: "Colonial Suite",
      type: "Suite",
      pricePerNight: 5500,
      capacity: 2,
      status: "available",
      photos: ["https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800"],
    },
    {
      propertyId: prop3.id,
      name: "Tea Garden Room",
      type: "Standard Room",
      pricePerNight: 3200,
      capacity: 2,
      status: "available",
      photos: ["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800"],
    },
    {
      propertyId: prop3.id,
      name: "Valley View Cottage",
      type: "Cottage",
      pricePerNight: 7500,
      capacity: 4,
      status: "available",
      photos: ["https://images.unsplash.com/photo-1568495248636-6432b97bd949?w=800"],
    },
    {
      propertyId: prop4.id,
      name: "Spice Garden Room",
      type: "Standard Room",
      pricePerNight: 3500,
      capacity: 2,
      status: "available",
      photos: ["https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800"],
    },
    {
      propertyId: prop4.id,
      name: "Pool Villa",
      type: "Villa",
      pricePerNight: 9500,
      capacity: 6,
      status: "available",
      photos: ["https://images.unsplash.com/photo-1549294413-26f195200c16?w=800"],
    },
    {
      propertyId: prop5.id,
      name: "Apple Orchard Room",
      type: "Standard Room",
      pricePerNight: 2800,
      capacity: 2,
      status: "available",
      photos: ["https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800"],
    },
    {
      propertyId: prop5.id,
      name: "Mountain View Suite",
      type: "Suite",
      pricePerNight: 4800,
      capacity: 3,
      status: "available",
      photos: ["https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800"],
    },
  ]);

  console.log("✅ Seeded 3 hosts, 1 guest, 5 properties, 10 rooms");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
