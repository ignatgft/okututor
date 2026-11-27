import { auth } from "./endpoints/auth";
import { users, tutors } from "./endpoints/users";
import { courses, search, reviews } from "./endpoints/courses";
import { messages, meetings, notifications, support, adminSupport, admin, adminMetrics } from "./endpoints/messaging";

export const endpoints = {
  auth,
  tutors,
  users,
  courses,
  search,
  reviews,
  messages,
  meetings,
  notifications,
  support,
  adminSupport,
  admin,
  adminMetrics,
} as const;

export const pageParams = (page = 0, size = 20): string => `page=${page}&size=${size}`;

export type Endpoints = typeof endpoints;

// Re-export individual groups for direct import if needed
export { auth, users, tutors, courses, search, reviews, messages, meetings, notifications, support, adminSupport, admin, adminMetrics };
