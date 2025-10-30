import React, { useContext, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AppContext } from "../context/AppContext";
import { Page, Department, Designation } from "../types";
// import { ToyotaLogo } from './icons';

const AuthPage: React.FC = () => {
  const { currentPage, setCurrentPage, currentUser, login, signup } =
    useContext(AppContext);
  const [isLogin, setIsLogin] = useState(currentPage === Page.LOGIN);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (
      currentUser &&
      (currentPage === Page.LOGIN || currentPage === Page.SIGNUP)
    ) {
      setCurrentPage(Page.DASHBOARD);
    }
  }, [currentUser, currentPage, setCurrentPage]);

  // cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (nameWarnTimer.current) window.clearTimeout(nameWarnTimer.current);
      if (passWarnLoginTimer.current)
        window.clearTimeout(passWarnLoginTimer.current);
      if (passWarnSignupTimer.current)
        window.clearTimeout(passWarnSignupTimer.current);
      if (passWarnConfirmTimer.current)
        window.clearTimeout(passWarnConfirmTimer.current);
    };
  }, []);

  // welcome video modal
  const [showWelcomeVideo, setShowWelcomeVideo] = useState(false);

  // Login state
  const [userId, setUserId] = useState("");
  const [department, setDepartment] = useState<Department | "">("");
  const [passcode, setPasscode] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [error, setError] = useState("");
  const [departmentError, setDepartmentError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  // password visibility toggles
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [showSignupPass, setShowSignupPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  // warnings when user types invalid characters
  const [nameWarning, setNameWarning] = useState("");
  const [passWarningLogin, setPassWarningLogin] = useState("");
  const [passWarningSignup, setPassWarningSignup] = useState("");
  const [passWarningConfirm, setPassWarningConfirm] = useState("");
  const nameWarnTimer = React.useRef<number | null>(null);
  const passWarnLoginTimer = React.useRef<number | null>(null);
  const passWarnSignupTimer = React.useRef<number | null>(null);
  const passWarnConfirmTimer = React.useRef<number | null>(null);

  // Signup state
  const [newUserId, setNewUserId] = useState("");
  const [newName, setNewName] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState("");
  const [newDepartment, setNewDepartment] = useState<Department | "">("");
  const [newDesignation, setNewDesignation] = useState<Designation | "">("");
  const [signupMessage, setSignupMessage] = useState("");
  const [agreeDeclaration, setAgreeDeclaration] = useState(false);
  const [agreeError, setAgreeError] = useState("");

  const validateUserId = (id: string): string | null => {
    // Employee ID should be digits only, length between 1 and 6
    const sanitizedId = id.replace(/\D/g, "");
    if (sanitizedId.length < 1 || sanitizedId.length > 6) {
      return "Employee ID must be between 1 and 6 digits.";
    }
    if (!/^\d+$/.test(sanitizedId)) {
      return "Employee ID must contain only numbers.";
    }
    return null;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setDepartmentError("");
    // Validate userId length between 1 and 6 digits
    const sanitizedUserId = userId.replace(/\D/g, "");
    if (sanitizedUserId.length < 1 || sanitizedUserId.length > 6) {
      setError("Employee ID must be between 1 and 6 digits.");
      setLoading(false);
      return;
    }

    // Ensure passcode is provided and exactly 4 digits
    const sanitizedPass = passcode.replace(/\D/g, "");
    if (!sanitizedPass) {
      setError("Please enter your passcode.");
      setLoading(false);
      return;
    }
    if (sanitizedPass.length !== 4) {
      setError("Passcode must be exactly 4 digits.");
      setLoading(false);
      return;
    }
    const result = await login(userId, passcode, role);
    if (!result.success) {
      if (result.error === "Invalid User ID or you may need to register.") {
        setShowModal(true);
        setModalMessage(
          "Employee ID not found in database. Click 'Create One' to register."
        );
      } else if (
        result.error === "The selected department does not match this User ID."
      ) {
        setError("Invalid credentials");
      } else {
        setError(result.error || "Invalid credentials.");
      }
    } else {
      setDepartmentError("");
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    // sanitize name strictly to letters A-Z / a-z only
    const sanitizedNewName = String(newName || "").replace(/[^A-Za-z]/g, "");
    setNewName(sanitizedNewName);
    if (!newUserId || !sanitizedNewName) {
      setError(
        "User ID and Name cannot be empty. Name must contain only letters A-Z or a-z."
      );
      // if name was empty due to invalid chars, show warning as well
      if (!sanitizedNewName && newName) {
        setNameWarning("Only letters A–Z are allowed");
        if (nameWarnTimer.current) window.clearTimeout(nameWarnTimer.current);
        nameWarnTimer.current = window.setTimeout(
          () => setNameWarning(""),
          3000
        );
      }
      return;
    }

    const userIdValidationError = validateUserId(newUserId);
    if (userIdValidationError) {
      setError(userIdValidationError);
      return;
    }

    if (!newDepartment) {
      setError("Please select a department.");
      return;
    }

    if (!newPasscode) {
      setError("Please provide a passcode (will be used as your password).");
      return;
    }

    // Ensure passcode is exactly 4 characters
    if (newPasscode.length !== 4) {
      setError("Passcode must be exactly 4 characters long.");
      return;
    }

    // Check confirm password
    if (newPasscode !== confirmPasscode) {
      setError("Passcode and Confirm Passcode do not match.");
      return;
    }

    if (!newDesignation) {
      setError("Please select a designation.");
      return;
    }

    if (!agreeDeclaration) {
      setAgreeError(
        "Please confirm that the details provided are voluntarily by you."
      );
      return;
    }

    setLoading(true);
    setError("");
    setSignupMessage("");

    const result = await signup({
      userId: newUserId,
      name: newName,
      department: newDepartment as Department,
      designation: newDesignation as Designation,
      passcode: newPasscode,
    });

    if (result.success) {
      setSignupMessage("Account created! Redirecting to dashboard...");
      // After signup, the user is automatically logged in.
      // The onAuthStateChange listener in AppContext will handle redirecting to the dashboard.
      // We no longer need to manually switch back to the login form.
    } else {
      setError(
        result.error ||
          "Failed to create account. User ID might already be in use."
      );
    }
    setLoading(false);
  };

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setError("");
    setSignupMessage("");
    setUserId("");
    setAgreeDeclaration(false);
    setAgreeError("");
    setCurrentPage(isLogin ? Page.SIGNUP : Page.LOGIN);
  };

  const inputClass =
    "w-full px-4 py-3 bg-gray-200/50 border-2 border-transparent rounded-lg focus:outline-none focus:border-red-500 transition-colors";
  // Support/help WhatsApp number (use international format without +). Change if needed.
  const supportPhone = "917975398660"; // e.g. 91 for India + phone
  const supportWhatsAppUrl = `https://wa.me/${supportPhone}`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white animate-fade-in p-4">
      <button
        onClick={() => setShowWelcomeVideo(true)}
        className="flex items-center gap-2 text-gray-800 dark:text-red-600 hover:text-red-600 dark:hover:text-red-500 transition-colors px-2 py-1 rounded"
      >
        Watch Tutorial
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="red"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            d="M5 3v18l15-9L5 3z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div className="relative w-full max-w-md bg-white backdrop-blur-lg p-8 rounded-2xl shadow-2xl">
        <div className="flex justify-center mb-6">
          <img src="/company-logo.png" alt="company logo" className="h-12" />
        </div>

        {isLogin ? (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="flex items-center justify-center gap-3">
              <h2 className="text-3xl font-bold text-center text-gray-800">
                Login
              </h2>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">
                Employee ID
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{1,6}"
                maxLength={6}
                placeholder="Enter 1-6 digits"
                value={userId}
                onChange={(e) => {
                  // Allow only digits and limit to 6 characters for login
                  const sanitized = e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6);
                  setUserId(sanitized);
                  setError("");
                }}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">
                Passcode
              </label>
              <div className="relative">
                <input
                  type={showLoginPass ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={passcode}
                  onChange={(e) => {
                    // Allow only digits and limit to 4 characters
                    const raw = e.target.value || "";
                    const v = raw.replace(/\D/g, "").slice(0, 4);
                    if (raw !== v) {
                      setPassWarningLogin("Only digits 0-9 allowed");
                      if (passWarnLoginTimer.current)
                        window.clearTimeout(passWarnLoginTimer.current);
                      passWarnLoginTimer.current = window.setTimeout(
                        () => setPassWarningLogin(""),
                        3000
                      );
                    }
                    setPasscode(v);
                    setError("");
                  }}
                  className={inputClass}
                  required
                />
                <button
                  type="button"
                  aria-label={showLoginPass ? "Hide passcode" : "Show passcode"}
                  onClick={() => setShowLoginPass((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 p-1 rounded hover:bg-gray-100"
                >
                  {/* eye icon */}
                  {showLoginPass ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path
                        d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9.27-3.11-11-8 1.02-2.6 2.6-4.71 4.49-6.22"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M1 1l22 22"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path
                        d="M1.05 12C2.76 7.11 7.02 4 12 4c5 0 9.27 3.11 11 8-1.02 2.6-2.6 4.71-4.49 6.22"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {passWarningLogin && (
                <p className="text-yellow-600 text-xs mt-1">
                  {passWarningLogin}
                </p>
              )}
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors transform hover:scale-105 disabled:bg-red-400 disabled:scale-100"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
            <p className="text-center text-sm text-gray-600">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={toggleForm}
                className="font-semibold text-red-600 hover:underline"
              >
                Create one →
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <h2 className="text-3xl font-bold text-center text-gray-800">
                Create Account
              </h2>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">
                Employee ID
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{1,6}"
                maxLength={6}
                placeholder="Enter 1-6 digits"
                value={newUserId}
                onChange={(e) => {
                  // Allow only digits and limit length to 6
                  const sanitized = e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6);
                  setNewUserId(sanitized);
                }}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => {
                  // Allow only letters A-Z and a-z. Strip everything else.
                  const raw = e.target.value || "";
                  const sanitized = raw.replace(/[^A-Za-z]/g, "");
                  if (raw !== sanitized) {
                    setNameWarning("Only letters A–Z are allowed");
                    if (nameWarnTimer.current)
                      window.clearTimeout(nameWarnTimer.current);
                    nameWarnTimer.current = window.setTimeout(
                      () => setNameWarning(""),
                      3000
                    );
                  }
                  setNewName(sanitized);
                  setError("");
                }}
                onPaste={(e) => {
                  // Sanitize pasted text to letters only
                  const paste =
                    (e.clipboardData || (window as any).clipboardData).getData(
                      "text"
                    ) || "";
                  const sanitized = paste.replace(/[^A-Za-z]/g, "");
                  if (paste !== sanitized) {
                    setNameWarning(
                      "Pasted content contained invalid characters; only A–Z allowed"
                    );
                    if (nameWarnTimer.current)
                      window.clearTimeout(nameWarnTimer.current);
                    nameWarnTimer.current = window.setTimeout(
                      () => setNameWarning(""),
                      3000
                    );
                  }
                  e.preventDefault();
                  // append sanitized paste to current value
                  setNewName((prev) => prev + sanitized);
                }}
                className={inputClass}
                required
              />
              {nameWarning && (
                <p className="text-yellow-600 text-xs mt-1">{nameWarning}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">
                Department
              </label>
              <select
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value as Department)}
                className={inputClass}
                required
              >
                <option value="">Select Department</option>
                {Object.values(Department).map((dep) => (
                  <option key={dep} value={dep}>
                    {dep}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">
                Designation
              </label>
              <select
                value={newDesignation}
                onChange={(e) =>
                  setNewDesignation(e.target.value as Designation)
                }
                className={inputClass}
                required
              >
                <option value="">Select Designation</option>
                {Object.values(Designation).map((des) => (
                  <option key={des} value={des}>
                    {des}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">
                Passcode
              </label>
              <div className="relative">
                <input
                  type={showSignupPass ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={newPasscode}
                  maxLength={4}
                  onChange={(e) => {
                    const raw = e.target.value || "";
                    const v = raw.replace(/\D/g, "").slice(0, 4);
                    if (raw !== v) {
                      setPassWarningSignup("Only digits 0-9 allowed");
                      if (passWarnSignupTimer.current)
                        window.clearTimeout(passWarnSignupTimer.current);
                      passWarnSignupTimer.current = window.setTimeout(
                        () => setPassWarningSignup(""),
                        3000
                      );
                    }
                    setNewPasscode(v);
                    // clear passcode-specific errors when typing
                    setPasscodeError("");
                    setError("");
                  }}
                  onPaste={(e) => {
                    const paste =
                      (
                        e.clipboardData || (window as any).clipboardData
                      ).getData("text") || "";
                    const sanitized = paste.replace(/\D/g, "").slice(0, 4);
                    if (paste !== sanitized) {
                      setPassWarningSignup(
                        "Pasted content contained non-digits; only 0-9 allowed"
                      );
                      if (passWarnSignupTimer.current)
                        window.clearTimeout(passWarnSignupTimer.current);
                      passWarnSignupTimer.current = window.setTimeout(
                        () => setPassWarningSignup(""),
                        3000
                      );
                    }
                    e.preventDefault();
                    setNewPasscode((prev) => (prev + sanitized).slice(0, 4));
                  }}
                  className={inputClass}
                  required
                />
                <button
                  type="button"
                  aria-label={
                    showSignupPass ? "Hide passcode" : "Show passcode"
                  }
                  onClick={() => setShowSignupPass((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 p-1 rounded hover:bg-gray-100"
                >
                  {showSignupPass ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path
                        d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9.27-3.11-11-8 1.02-2.6 2.6-4.71 4.49-6.22"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M1 1l22 22"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path
                        d="M1.05 12C2.76 7.11 7.02 4 12 4c5 0 9.27 3.11 11 8-1.02 2.6-2.6 4.71-4.49 6.22"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
                {passWarningSignup && (
                  <p className="text-yellow-600 text-xs mt-1">
                    {passWarningSignup}
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">
                Confirm Passcode
              </label>
              <div className="relative">
                <input
                  type={showConfirmPass ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={confirmPasscode}
                  maxLength={4}
                  onChange={(e) => {
                    const raw = e.target.value || "";
                    const v = raw.replace(/\D/g, "").slice(0, 4);
                    if (raw !== v) {
                      setPassWarningConfirm("Only digits 0-9 allowed");
                      if (passWarnConfirmTimer.current)
                        window.clearTimeout(passWarnConfirmTimer.current);
                      passWarnConfirmTimer.current = window.setTimeout(
                        () => setPassWarningConfirm(""),
                        3000
                      );
                    }
                    setConfirmPasscode(v);
                    setPasscodeError("");
                    setError("");
                  }}
                  onPaste={(e) => {
                    const paste =
                      (
                        e.clipboardData || (window as any).clipboardData
                      ).getData("text") || "";
                    const sanitized = paste.replace(/\D/g, "").slice(0, 4);
                    if (paste !== sanitized) {
                      setPassWarningConfirm(
                        "Pasted content contained non-digits; only 0-9 allowed"
                      );
                      if (passWarnConfirmTimer.current)
                        window.clearTimeout(passWarnConfirmTimer.current);
                      passWarnConfirmTimer.current = window.setTimeout(
                        () => setPassWarningConfirm(""),
                        3000
                      );
                    }
                    e.preventDefault();
                    setConfirmPasscode((prev) =>
                      (prev + sanitized).slice(0, 4)
                    );
                  }}
                  className={inputClass}
                  required
                />
                <button
                  type="button"
                  aria-label={
                    showConfirmPass
                      ? "Hide confirm passcode"
                      : "Show confirm passcode"
                  }
                  onClick={() => setShowConfirmPass((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 p-1 rounded hover:bg-gray-100"
                >
                  {showConfirmPass ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path
                        d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9.27-3.11-11-8 1.02-2.6 2.6-4.71 4.49-6.22"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M1 1l22 22"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path
                        d="M1.05 12C2.76 7.11 7.02 4 12 4c5 0 9.27 3.11 11 8-1.02 2.6-2.6 4.71-4.49 6.22"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
                {passWarningConfirm && (
                  <p className="text-yellow-600 text-xs mt-1">
                    {passWarningConfirm}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 mt-2">
              <input
                id="agreeDeclaration"
                type="checkbox"
                checked={agreeDeclaration}
                onChange={(e) => {
                  setAgreeDeclaration(e.target.checked);
                  setAgreeError("");
                  setError("");
                }}
                className="mt-1 w-4 h-4 text-red-600 bg-white border-gray-300 rounded focus:ring-red-500"
              />
              <label
                htmlFor="agreeDeclaration"
                className="text-sm text-gray-700"
              >
                I agree that above details provided are accurate and can be used
                for competition and organizational communication purposes.
              </label>
            </div>

            {passcodeError && (
              <p className="text-red-500 text-sm">{passcodeError}</p>
            )}
            {agreeError && <p className="text-red-500 text-sm">{agreeError}</p>}
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {signupMessage && (
              <p className="text-green-500 text-sm">{signupMessage}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors transform hover:scale-105 disabled:bg-red-400 disabled:scale-100"
            >
              {loading ? "Creating..." : "Create Account"}
            </button>
            <p className="text-center text-sm text-gray-600">
              Already have an account?{" "}
              <button
                type="button"
                onClick={toggleForm}
                className="font-semibold text-red-600 hover:underline"
              >
                Login →
              </button>
            </p>
          </form>
        )}
      </div>

      {/* Help link below the form layout (outside the form) */}
      <div className="w-full max-w-md mx-auto mt-4 text-center">
        <a
          href={supportWhatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-red-600 hover:underline"
        >
          Need help? Press this link to get in touch with us.
        </a>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full mx-4">
            <p className="text-gray-700 mb-4">{modalMessage}</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  setIsLogin(false);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Create One
              </button>
            </div>
          </div>
        </div>
      )}
      {showWelcomeVideo &&
        createPortal(
          <div
            onClick={() => setShowWelcomeVideo(false)}
            className="fixed inset-0 bg-black/70 flex items-center justify-center p-4"
            style={{ zIndex: 99999 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-black rounded-lg w-full max-w-3xl relative shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 bg-black/80">
                <div className="text-white text-sm font-medium">Welcome</div>
                <div>
                  <button
                    onClick={() => setShowWelcomeVideo(false)}
                    aria-label="Close video"
                    className="text-white bg-white/10 hover:bg-white/20 rounded-md px-3 py-1 text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="p-4 bg-black">
                <div className="w-full h-auto rounded-lg max-h-[80vh] overflow-hidden">
                  <video
                    src="/welcome.mp4"
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-auto bg-black"
                  />
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default AuthPage;
