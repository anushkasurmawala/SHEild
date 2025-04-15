import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OTPRequest {
  phone: string;
  action: 'send' | 'verify';
  otp?: string;
  newPassword?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!supabaseUrl || !supabaseServiceKey || !twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error('Missing environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { phone, action, otp, newPassword }: OTPRequest = await req.json();

    // Validate phone number
    if (!phone || !/^\+\d{1,15}$/.test(phone)) {
      throw new Error('Invalid phone number format');
    }

    if (action === 'send') {
      // Generate 6-digit OTP
      const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP in database with expiration
      const { error: deleteError } = await supabase
        .from('reset_tokens')
        .delete()
        .eq('phone', phone);

      const { error: insertError } = await supabase
        .from('reset_tokens')
        .insert({
          phone,
          token: generatedOTP,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes expiry
        });

      if (insertError) throw insertError;

      // Send OTP via SMS
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
      const authHeader = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
      const message = `Your password reset code is: ${generatedOTP}. Valid for 10 minutes.`;

      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: phone,
          From: twilioPhoneNumber,
          Body: message,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send OTP');
      }

      return new Response(
        JSON.stringify({ message: 'OTP sent successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'verify') {
      if (!otp || !newPassword) {
        throw new Error('OTP and new password are required');
      }

      // Verify OTP
      const { data: tokens, error: fetchError } = await supabase
        .from('reset_tokens')
        .select('*')
        .eq('phone', phone)
        .eq('token', otp)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (fetchError || !tokens) {
        throw new Error('Invalid or expired OTP');
      }

      // Get user by phone number
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('phone_number', phone)
        .single();

      if (profileError || !profiles) {
        throw new Error('User not found');
      }

      // Update password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        profiles.user_id,
        { password: newPassword }
      );

      if (updateError) {
        throw updateError;
      }

      // Delete used token
      await supabase
        .from('reset_tokens')
        .delete()
        .eq('phone', phone);

      return new Response(
        JSON.stringify({ message: 'Password reset successful' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});