---
name: Booking creation API
description: The createBooking endpoint is at /bookings (no propertyId in URL path)
---

The `useCreateBooking` mutation signature is `{ data: CreateBookingRequest }` — there is no `propertyId` path parameter. The property/room association comes from `roomId` inside the request body.

**Why:** The bookings route is `POST /bookings` not `POST /properties/:propertyId/bookings`. The room (which belongs to a property) is passed via `roomId` in the body. Passing `propertyId` as a top-level mutation param causes a TS2353 error.

**How to apply:** When building any booking creation form, call `createBooking({ data: { roomId, checkIn, checkOut, guestName, guestEmail, guestMobile, guestCount } })`.
