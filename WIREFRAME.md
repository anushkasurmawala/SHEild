# Safety App Wireframe Documentation

## Core Screens

### 1. Authentication Flow
```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│      Login          │    │     Sign Up         │    │  Forgot Password    │
├─────────────────────┤    ├─────────────────────┤    ├─────────────────────┤
│ ┌─────────────┐     │    │ ┌─────────────┐     │    │ ┌─────────────┐     │
│ │   Logo      │     │    │ │   Logo      │     │    │ │   Logo      │     │
│ └─────────────┘     │    │ └─────────────┘     │    │ └─────────────┘     │
│                     │    │                     │    │                     │
│ ┌─────────────┐     │    │ Step 1 of 2        │    │ Enter Phone Number  │
│ │  Email      │     │    │ ┌─────────────┐     │    │ ┌─────────────┐     │
│ └─────────────┘     │    │ │  Name       │     │    │ │  Phone      │     │
│                     │    │ └─────────────┘     │    │ └─────────────┘     │
│ ┌─────────────┐     │    │ ┌─────────────┐     │    │                     │
│ │  Password   │     │    │ │  Email      │     │    │ [Send Reset Code]   │
│ └─────────────┘     │    │ └─────────────┘     │    │                     │
│                     │    │ ┌─────────────┐     │    │ Step 2:             │
│ [Sign In]           │    │ │  Phone      │     │    │ ┌─────────────┐     │
│                     │    │ └─────────────┘     │    │ │  OTP Code   │     │
│ [Forgot Password?]  │    │                     │    │ └─────────────┘     │
│                     │    │ [Next]              │    │                     │
│ [Create Account]    │    │                     │    │ [Verify & Reset]    │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

### 2. Dashboard (Main Screen)
```
┌─────────────────────────────────────────────────────────────────┐
│ ┌─────────┐  Safety Dashboard             🔔 ⚙️ 👤              │
│ │ Profile │  Welcome back, [Name]                               │
│ │ Picture │                                                     │
│ └─────────┘                                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐    ┌─────────────────────┐            │
│  │   🆘 SOS Button    │    │   📍 Live Location  │            │
│  │                     │    │    Sharing Active    │            │
│  └─────────────────────┘    └─────────────────────┘            │
│                                                                 │
│  ┌─────────────────────┐    ┌─────────────────────┐            │
│  │   📞 Fake Call     │    │   🎥 Quick Record   │            │
│  │                     │    │                     │            │
│  └─────────────────────┘    └─────────────────────┘            │
│                                                                 │
│  ┌─────────────────────────────────────────────────┐           │
│  │              Gesture Detection                   │           │
│  │   Shake phone 3 times to trigger emergency      │           │
│  └─────────────────────────────────────────────────┘           │
│                                                                 │
│  ┌─────────────────────────────────────────────────┐           │
│  │           Community Responders Nearby            │           │
│  │  [List of verified helpers with distance/rating] │           │
│  └─────────────────────────────────────────────────┘           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
   🏠    👥    🗺️    📝    ⚙️
   Home  Contacts Map  Records Settings
```

### 3. Emergency Contacts
```
┌─────────────────────────────────────────────────┐
│  Emergency Contacts                    [+ Add]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────────────────────────┐        │
│  │  Anushka                            │        │
│  │  Friend •   +91 1234567890          │        │
│  │  [Call] [Message] [Delete]          │        │
│  └─────────────────────────────────────┘        │
│                                                 │
│  ┌─────────────────────────────────────┐        │
│  │  Grishma                            │        │
│  │  Sister  • +91 1234567890           │        │
│  │  [Call] [Message] [Delete]          │        │
│  └─────────────────────────────────────┘        │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 4. Safe Routes & Zones
```
┌─────────────────────────────────────────────────┐
│  Safe Navigation                      [+ Zone]   │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────────────────────────┐        │
│  │                                     │        │
│  │            Interactive Map          │        │
│  │      [Current Location Marker]      │        │
│  │      [Safe Zone Circles]            │        │
│  │                                     │        │
│  └─────────────────────────────────────┘        │
│                                                 │
│  Safe Zones:                                    │
│  ┌─────────────────────────────────────┐        │
│  │  Home                               │        │
│  │  500m radius                        │        │
│  │  [Edit] [Delete]                    │        │
│  └─────────────────────────────────────┘        │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 5. Recordings
```
┌─────────────────────────────────────────────────┐
│  Emergency Recordings              [Grid│List]   │
├─────────────────────────────────────────────────┤
│  Filter: [All Types ▼] [All Dates ▼]            │
│                                                 │
│  ┌─────────────────┐    ┌─────────────────┐     │
│  │  Video          │    │  Audio          │     │
│  │  Mar 15, 2024   │    │  Mar 14, 2024   │     │
│  │  [Play] [Delete]│    │  [Play] [Delete]│     │
│  └─────────────────┘    └─────────────────┘     │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Modal Screens

### Add Emergency Contact Modal
```
┌─────────────────────────────────────┐
│  Add Emergency Contact       [✕]    │
├─────────────────────────────────────┤
│                                     │
│  Contact Name:                      │
│  ┌─────────────────────┐            │
│  │                     │            │
│  └─────────────────────┘            │
│                                     │
│  Phone Number:                      │
│  ┌─────────────────────┐            │
│  │                     │            │
│  └─────────────────────┘            │
│                                     │
│  Relationship:                      │
│  ┌─────────────────────┐            │
│  │                     │            │
│  └─────────────────────┘            │
│                                     │
│  [Cancel]        [Save Contact]     │
│                                     │
└─────────────────────────────────────┘
```

### Add Safe Zone Modal
```
┌─────────────────────────────────────┐
│  Add Safe Zone              [✕]     │
├─────────────────────────────────────┤
│                                     │
│  Preset Locations:                  │
│  [Home] [Work] [School] [Custom]    │
│                                     │
│  Zone Name:                         │
│  ┌─────────────────────┐            │
│  │                     │            │
│  └─────────────────────┘            │
│                                     │
│  Address:                           │
│  ┌─────────────────────┐            │
│  │                     │            │
│  └─────────────────────┘            │
│                                     │
│  Safe Zone Radius: 500m             │
│  [──────●──────] 100m - 2000m      │
│                                     │
│  ┌─────────────────────┐            │
│  │      Map View       │            │
│  │   [Select Location] │            │
│  └─────────────────────┘            │
│                                     │
│  [Cancel]          [Save Zone]      │
│                                     │
└─────────────────────────────────────┘
```

## Key Features & Interactions

### Emergency Alert Flow
1. User triggers emergency (SOS button, gesture, or voice)
2. Visual feedback (screen flashes red)
3. Audio alert plays
4. SMS alerts sent to emergency contacts
5. Location shared with contacts
6. Incident recorded in system

### Safe Zone Monitoring
1. Continuous location tracking
2. Alert when leaving safe zone
3. Safety score calculation
4. Emergency contact notification

### Voice Command Detection
1. Background listening for trigger words
2. Immediate response to "help", "SOS"
3. Automatic emergency protocol activation

### Quick Recording
1. One-tap video/audio recording
2. Automatic cloud backup
3. Location and timestamp embedded
4. Instant share with emergency contacts

### Fake Call Feature
1. Simulated incoming call
2. Pre-recorded conversation
3. Customizable caller info
4. Automatic duration setting

### Community Response System
1. Verified responder network
2. Distance-based matching
3. Rating and review system
4. Direct communication channel

## Design Elements

### Color Scheme
- Primary: Purple (#9333EA)
- Secondary: Indigo (#4F46E5)
- Accent: Pink (#EC4899)
- Alert: Red (#EF4444)
- Success: Green (#10B981)
- Warning: Yellow (#F59E0B)

### Typography
- Headings: Inter (Bold)
- Body: Inter (Regular)
- Monospace: JetBrains Mono (for codes/numbers)

### Icons
- Lucide React icons library
- Consistent 24px sizing
- Interactive elements: 20px

### Components
- Glass-morphism cards
- Neon-style buttons
- Floating action buttons
- Bottom navigation bar
- Modal overlays
- Toast notifications

### Animations
- Smooth transitions (300ms)
- Loading spinners
- Pulse effects for active states
- Slide transitions between screens
- Scale animations for buttons