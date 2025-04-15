import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSRequest {
  to: string;
  message: string;
  location?: { lat: number; lng: number };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Twilio config from database
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: twilioConfig, error: configError } = await supabaseClient
      .from('twilio_config')
      .select('*')
      .single();

    if (configError || !twilioConfig) {
      throw new Error('Missing Twilio environment variables');
    }

    const { to, message, location } = await req.json() as SMSRequest;

    // Validate phone number
    if (!to || !/^\+\d{1,15}$/.test(to)) {
      throw new Error('Invalid phone number format');
    }

    // Format message with location if provided
    let fullMessage = message;
    if (location) {
      const locationUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
      fullMessage = `EMERGENCY: ${message}\n\nLocation: ${locationUrl}\n\nPlease respond immediately if you receive this message.`;
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioConfig.account_sid}/Messages.json`;
    const authHeader = btoa(`${twilioConfig.account_sid}:${twilioConfig.auth_token}`);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: to,
        From: twilioConfig.phone_number,
        Body: fullMessage,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send SMS');
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});