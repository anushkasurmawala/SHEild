import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Eye, EyeOff, ChevronRight } from "lucide-react";
import { supabase } from "../../lib/supabase";

const SignUp = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match");
      setIsLoading(false);
      return;
    }

    try {
      // Create profile data
      const profileData = {
        full_name: formData.fullName.trim(),
        phone_number: formData.phoneNumber.trim(),
        email: formData.email.trim()
      };

      // Sign up with profile data in metadata
      const { data: { user, session }, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: profileData,
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (signUpError) {
        console.error("SignUp Error:", signUpError);
        throw signUpError;
      }
      
      if (!user) {
        throw new Error("Signup failed. Please try again.");
      }
      
      // If we have a session, user is automatically signed in and profile is created
      if (session) {
        // Pre-fetch profile and contacts for faster dashboard load
        await Promise.all([
          supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single(),
          supabase
            .from('emergency_contacts')
            .select('*')
            .eq('user_id', user.id)
        ]);

        navigate("/dashboard");
        return;
      }
      
      // If no session but signup successful, go to login
      setError(null);
      setFormData({
        fullName: "",
        email: "",
        phoneNumber: "",
        password: "",
        confirmPassword: ""
      });
      setStep(1);
      navigate("/login");
      
    } catch (err) {
      console.error("Signup Error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to create account. Please try again.";
      if (errorMessage.includes("User already registered")) {
        setError("This email is already registered. Please sign in instead.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex items-center justify-center p-4"
    >
      <div className="glass-card w-full max-w-md p-8 space-y-8">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto text-purple-400 mb-4" />
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Create Account
          </h2>
          <p className="text-gray-300 mt-2">Join our secure community</p>
        </div>

        {/* Steps UI */}
        <div className="flex justify-between mb-8">
          {[1, 2].map((num) => (
            <div key={num} className={`flex items-center ${num === 1 ? "flex-1" : ""}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 
                ${step >= num ? "border-purple-500 text-purple-500" : "border-gray-600 text-gray-600"}
                `}
              >
                {num}
              </div>
              {num === 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${step > 1 ? "bg-purple-500" : "bg-gray-600"}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSignUp} className="space-y-6">
          {step === 1 ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  className="input-field"
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="input-field"
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Phone Number</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  required
                  className="input-field"
                  placeholder="Enter your phone number"
                />
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="neon-button w-full flex items-center justify-center space-x-2"
              >
                <span>Next</span>
                <ChevronRight size={20} />
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="input-field pr-12"
                    placeholder="Create a password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="input-field pr-12"
                    placeholder="Confirm your password"
                  />
                </div>
              </div>
              {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}
              <button type="submit" disabled={isLoading} className="neon-button w-full">
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white rounded-full border-t-transparent"
                  />
                ) : (
                  <span>Create Account</span>
                )}
              </button>
            </>
          )}

          <p className="text-center text-gray-400">
            Already have an account?{" "}
            <button 
              onClick={() => navigate("/login")} 
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              Sign In
            </button>
          </p>
        </form>
      </div>
    </motion.div>
  );
};

export default SignUp;