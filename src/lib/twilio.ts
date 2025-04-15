import { supabase } from './supabase';
const POLICE_NUMBER = '100';
const WOMEN_HELPLINE = '181';

const sendSMS = async (to: string, message: string, location?: { lat: number; lng: number }) => {
  // Ensure phone number is in E.164 format
  const formattedNumber = formatPhoneNumber(to);
  if (!formattedNumber) {
    throw new Error('Invalid phone number format');
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  // Format location URL and message
  let fullMessage = message;
  if (location) {
    const locationUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
    fullMessage = `EMERGENCY: ${message}\n\nLocation: ${locationUrl}\n\nPlease respond immediately if you receive this message.`;
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`;
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      to: formattedNumber, 
      message: fullMessage 
    }),
  });

  if (!response || !response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send SMS');
  }

  return response.json();
};

const formatPhoneNumber = (phone: string): string | null => {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Check if number already starts with '+'
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // Add country code if not present (assuming US/Canada)
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  return null;
};

export const sendEmergencyAlert = async (
  to: string,
  location: { lat: number; lng: number },
  message: string
) => {
  try {
    // Format emergency message with location
    const locationUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
    const emergencyMessage = `${message}\n\nTrack location: ${locationUrl}\n\nThis is an emergency alert. Please respond immediately.`;
    
    await sendSMS(to.trim(), emergencyMessage);
    return true;
  } catch (error) {
    console.error('Error sending emergency alert:', error);
    return false;
  }
};

export const sendLocationUpdate = async (
  to: string,
  location: { lat: number; lng: number },
  message: string
) => {
  try {
    await sendSMS(to.trim(), message, location);
    return true;
  } catch (error) {
    console.error('Error sending location update:', error);
    return false;
  }
};

export const callPolice = () => {
  window.location.href = `tel:${POLICE_NUMBER}`;
};

export const textWomenHelpline = async (location: { lat: number; lng: number }) => {
  const message = `Emergency assistance needed`;
  
  try {
    await sendSMS(WOMEN_HELPLINE.trim(), message, location);
    return true;
  } catch (error) {
    console.error('Error sending message to helpline:', error);
    return false;
  }
};