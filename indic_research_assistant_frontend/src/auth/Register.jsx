import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FontImports, Header } from "../components/Shell";
import { useAuth } from "../AuthContext";
import { PageTransition } from "../components/PageTransition";
import axiosInstance from "../instances/axiosInstance"

function Register() {
  const { login, saveUser } = useAuth();
  const navigate = useNavigate();
  const AUTH_BASE = '/api/scholar';

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [otp, setOtp] = useState("");
  const [showOtpModal, setShowOtpModal] = useState(false);

  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const [otpStatus, setOtpStatus] = useState("idle");
  const [otpMessage, setOtpMessage] = useState("");

  // --------------------------------------------------
  // Step 1: Send OTP
  // --------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 8) {
      setStatus("error");
      setMessage("Password must be at least 8 characters.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const response = await axiosInstance.post(`${AUTH_BASE}/verify-otp`, {
        name,
        email,
        password,
      });

      if (response.status === 200) {
        setShowOtpModal(true);
        setStatus("idle");
        setOtpStatus("idle");
        setOtpMessage("");
      }
    } catch (err) {
      console.error("OTP error:", err);

      setStatus("error");
      setMessage(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to send OTP. Please try again.",
      );
    }
  };

  // --------------------------------------------------
  // Step 2: Verify OTP + Create Account
  // --------------------------------------------------
  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    if (otp.length !== 6) {
      setOtpStatus("error");
      setOtpMessage("Please enter the 6-digit OTP.");
      return;
    }

    setOtpStatus("loading");
    setOtpMessage("");

    try {
      const response = await axiosInstance.post(`${AUTH_BASE}/register`, {
        name,
        email,
        password,
        otp,
      });

      if (response.status === 201) {
        saveUser(response.data.user)
        // If your AuthContext login expects the token
        if (response.data?.token) {
          login(response.data.token);
        }

        setShowOtpModal(false);

        navigate("/");
      }
    } catch (err) {
      console.error("OTP verification error:", err);

      setOtpStatus("error");

      setOtpMessage(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Invalid OTP. Please try again.",
      );
    }
  };

  // --------------------------------------------------
  // Close OTP modal
  // --------------------------------------------------
  const closeOtpModal = () => {
    if (otpStatus === "loading") return;

    setShowOtpModal(false);
    setOtp("");
    setOtpStatus("idle");
    setOtpMessage("");
  };

  return (
    <div className="min-h-screen bg-[#10101B] text-[#F1EEE4] font-body">
      <FontImports />
      <Header variant="back" />

      <PageTransition className="flex items-center mt-12 justify-center px-6 py-16">
        <div className="w-full max-w-sm">

          <div className="mb-8">
            <p className="font-mono text-xs tracking-[0.2em] text-[#E8A33D] uppercase mb-2">
              Get started
            </p>

            <h1 className="font-display text-3xl font-semibold">
              Create an account
            </h1>

            <p className="text-sm text-[#F1EEE4]/50 mt-2">
              Build your own research library, in your own language
            </p>
          </div>

          {/* Registration Form */}
          <motion.form
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04, duration: 0.2 }}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm text-[#F1EEE4]/70 mb-1"
              >
                Name
              </label>

              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Yugesh Karan"
                className="w-full rounded-md border border-[#2A2A3D] bg-[#181826]
                           px-3 py-2 text-sm outline-none
                           focus:border-[#E8A33D]/60
                           placeholder:text-[#F1EEE4]/30"
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm text-[#F1EEE4]/70 mb-1"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                className="w-full rounded-md border border-[#2A2A3D] bg-[#181826]
                           px-3 py-2 text-sm outline-none
                           focus:border-[#E8A33D]/60
                           placeholder:text-[#F1EEE4]/30"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm text-[#F1EEE4]/70 mb-1"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-md border border-[#2A2A3D] bg-[#181826]
                           px-3 py-2 text-sm outline-none
                           focus:border-[#E8A33D]/60
                           placeholder:text-[#F1EEE4]/30"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={status === "loading"}
              className="w-full rounded-md bg-[#E8A33D] text-[#10101B] py-2.5
                         text-sm font-medium hover:bg-[#f0b158]
                         transition-colors disabled:opacity-50
                         disabled:cursor-not-allowed"
            >
              {status === "loading"
                ? "Sending OTP…"
                : "Create account"}
            </motion.button>
          </motion.form>

          {/* Registration Error */}
          {status === "error" && (
            <div className="mt-4 rounded-md border border-red-900
                            bg-red-950/40 p-3 text-sm text-red-300">
              {message}
            </div>
          )}

          <p className="text-sm text-[#F1EEE4]/50 mt-6 text-center">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-[#E8A33D] hover:text-[#f0b158] transition-colors"
            >
              Log in
            </Link>
          </p>
        </div>
      </PageTransition>

      {/* OTP Modal */}
      <AnimatePresence>
        {showOtpModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center
                       bg-black/70 backdrop-blur-sm px-5"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-xl border border-[#2A2A3D]
                         bg-[#181826] p-6 shadow-2xl"
            >
              {/* Header */}
              <div className="mb-6">
                <p className="font-mono text-xs tracking-[0.2em]
                              text-[#E8A33D] uppercase mb-2">
                  Verify email
                </p>

                <h2 className="text-xl font-semibold">
                  Enter verification code
                </h2>

                <p className="text-sm text-[#F1EEE4]/50 mt-2 leading-relaxed">
                  We sent a 6-digit verification code to
                  <span className="text-[#F1EEE4]/80">
                    {" "}{email}
                  </span>
                  .
                </p>
              </div>

              {/* OTP Form */}
              <form onSubmit={handleVerifyOTP}>
                <label
                  htmlFor="otp"
                  className="block text-sm text-[#F1EEE4]/70 mb-2"
                >
                  Verification code
                </label>

                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="000000"
                  className="w-full rounded-md border border-[#2A2A3D]
                             bg-[#10101B] px-4 py-3 text-center
                             text-xl tracking-[0.4em] outline-none
                             focus:border-[#E8A33D]/60
                             placeholder:text-[#F1EEE4]/20"
                />

                {/* OTP Error */}
                {otpStatus === "error" && (
                  <p className="mt-3 text-sm text-red-400">
                    {otpMessage}
                  </p>
                )}

                {/* Verify */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  disabled={otpStatus === "loading"}
                  className="w-full mt-5 rounded-md bg-[#E8A33D]
                             text-[#10101B] py-2.5 text-sm font-medium
                             hover:bg-[#f0b158] transition-colors
                             disabled:opacity-50
                             disabled:cursor-not-allowed"
                >
                  {otpStatus === "loading"
                    ? "Verifying…"
                    : "Verify & Create Account"}
                </motion.button>

                {/* Cancel */}
                <button
                  type="button"
                  onClick={closeOtpModal}
                  disabled={otpStatus === "loading"}
                  className="w-full mt-3 py-2 text-sm text-[#F1EEE4]/50
                             hover:text-[#F1EEE4]/80 transition-colors
                             disabled:opacity-50"
                >
                  Cancel
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Register;