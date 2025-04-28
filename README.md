# SHEild - Women Safety App

## Overview

The **SHEild** app is designed to be a real-time guardian — smart, subtle, and strong. The app helps keep women safe in everyday life by providing a suite of safety features for emergency situations. With the app, users can quickly send alerts, track their route for incidents, and access critical safety resources with just a tap or a voice command.

## Features

### Live Features:
- **SOS Alerts**: One tap sends your location to emergency contacts instantly.
- **Nearby SOS Notifications**: See alerts triggered near you in real-time.
- **Emergency Call Shortcut**: Quickly dial the police from inside the app.
- **Manual Incident Reports**: Log details of suspicious or unsafe situations.
- **Stealth Recording**: Record video or audio in the background — with a black screen to avoid detection.
- **Recording Playback**: Access and manage your recordings right in the app.
- **Fake Call Feature**: Trigger a fake call to get out of uncomfortable or dangerous situations — discreet and effective.
- **Emergency Contacts**: Easily add and manage trusted contacts.
- **Incident-Aware Routing**: View incidents along your route, color-coded by threat level.
- **Safe Zones**: Set safe areas with custom radius — alerts are triggered if you exit them.

### Coming Soon:
- **Voice-Activated SOS**: Say a keyword like “help” to send alerts — hands-free protection.
- **Gesture-Based Trigger**: Shake your phone to activate SOS — no screen interaction needed.
- **Authority Integration**: Enable police/authorities to verify and respond to reported incidents.
- **Community Responders**: See nearby users who can offer help during emergencies.
- **Chat + Helpline Access**: A dedicated support channel inside the app.
- **Safe Navigation (Planned)**: Intelligent routing using Google Maps — on the roadmap for future versions.

## Tech Stack

- **Frontend**: React + TypeScript
- **Backend**: Supabase (DB, Auth, Storage)
- **SMS Service**: Twilio (SMS)
- **UI**: Tailwind CSS
- **State Management**: Zustand
- **Maps**: Leaflet Maps
- **Authentication**: Supabase Auth

## Setup and Installation

1. Clone the repository
```bash
git clone https://github.com/anushkasurmawala/SHEild.git
cd SHEild

2. Install dependencies
npm install

3. Environment Variables

Create a .env file in the root of the project and add the following keys:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token

4. Run the App
npm run dev

The app will be running on http://localhost:3000.







