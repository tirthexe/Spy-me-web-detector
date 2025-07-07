# SpyMe – Mic & Camera Access Detector

## Overview

SpyMe is a web-based security monitoring application that demonstrates real-time microphone and camera access detection. The system consists of a full-stack TypeScript application with React frontend and Express backend, designed to track and display access logs when the web app itself requests device permissions. This serves as a cybersecurity educational tool showing how access monitoring could work in principle.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **UI Components**: Comprehensive set of Radix UI primitives with custom styling

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Session Management**: In-memory storage with planned database persistence
- **Development**: Vite for hot module replacement and build tooling

### Database Schema
- **Users**: Authentication and user management
- **Access Logs**: Records of microphone/camera access attempts
- **Monitoring Status**: Toggle state for monitoring services

## Key Components

### Frontend Components
- **Home Page**: Main dashboard displaying live monitoring status, access logs, and controls
- **UI Library**: Complete set of accessible components (buttons, cards, forms, dialogs, etc.)
- **Firebase Integration**: Real-time database connectivity for Android app synchronization
- **Toast Notifications**: User feedback system for actions and alerts

### Backend Services
- **API Routes**: RESTful endpoints for access logs and monitoring status
- **Storage Layer**: Abstracted storage interface supporting both memory and database persistence
- **Validation**: Zod schemas for request/response validation
- **Error Handling**: Centralized error processing and logging

### Shared Components
- **Schema Definitions**: Shared TypeScript types and Zod validators
- **Database Models**: Drizzle ORM table definitions for PostgreSQL

## Data Flow

1. **Android App → Firebase**: Mobile app detects sensor access and pushes alerts to Firebase Realtime Database
2. **Firebase → Web App**: Real-time synchronization of access logs
3. **Web App → Backend**: User interactions trigger API calls to manage monitoring status and logs
4. **Backend → Database**: Persistent storage of access logs and monitoring configuration
5. **Database → Web App**: Query-based data retrieval for dashboard display

## External Dependencies

### Core Dependencies
- **Database**: Neon serverless PostgreSQL for production data storage
- **Firebase**: Realtime Database for mobile app synchronization
- **UI Framework**: Radix UI primitives for accessible components
- **Validation**: Zod for runtime type checking and schema validation

### Development Tools
- **Build System**: Vite for fast development and optimized production builds
- **Type Checking**: TypeScript for compile-time type safety
- **Code Quality**: ESLint integration for code standards

## Deployment Strategy

### Production Build
- **Frontend**: Vite builds optimized React bundle to `dist/public`
- **Backend**: esbuild compiles TypeScript server to `dist/index.js`
- **Database**: Drizzle migrations manage schema changes

### Environment Configuration
- **Database**: PostgreSQL connection via `DATABASE_URL` environment variable
- **Firebase**: Client-side configuration via environment variables
- **Development**: Local development with hot reloading and error overlay

### Scalability Considerations
- **Database**: Serverless PostgreSQL scales automatically with usage
- **Storage**: Abstracted storage layer allows easy migration from memory to persistent storage
- **API**: Stateless backend design supports horizontal scaling

## Current Implementation Status

### Working Features
- Real browser-based microphone and camera access detection
- Firebase integration for real-time alert logging
- Responsive cybersecurity-themed interface
- Permission status monitoring
- Access log history with timestamps
- Master monitoring toggle

### Web Browser Limitations
- Cannot detect other applications accessing device microphone/camera
- Cannot run background monitoring when browser is closed
- Cannot access system-level permissions like Android's AppOpsManager
- Limited to web browser security sandbox

### For True Android Implementation
To create a real Android app with full system-level monitoring:
1. Use Android Studio with Kotlin
2. Implement AppOpsManager for usage monitoring
3. Use UsageStatsManager for foreground app detection
4. Create foreground service for background monitoring
5. Request PACKAGE_USAGE_STATS permission

## Changelog

- July 07, 2025. Initial setup with Firebase integration
- July 07, 2025. Converted from simulation to real browser-based detection

## User Preferences

Preferred communication style: Simple, everyday language.
Wants fully functional real-world implementation for potential Play Store deployment.