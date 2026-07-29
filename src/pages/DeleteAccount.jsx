import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { deleteUser } from "firebase/auth";
import AccountCleanupService from "../services/accountCleanupService";

const DeleteAccount = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCancel = () => {
    setIsOpen(false);
    navigate(-1); // Goes back to the previous page
  };

  const handleDeleteAccount = async () => {
    if (!user) {
      setError("No user is currently signed in");
      return;
    }

    setIsDeleting(true);
    setError(null);
    setWarning(null);

    try {
      const currentUserId = user.uid;

      // Capture token before deletion; it stays valid long enough for the
      // cleanup API call and proves ownership of the uid being wiped.
      let idToken = null;
      try {
        idToken = await user.getIdToken();
      } catch {
        // proceed; cleanup will be rejected server-side without a token
      }

      // Delete the user account from Firebase Auth
      await deleteUser(user);

      // Best-effort cleanup of user-scoped app data after account deletion
      const cleanupResult = await AccountCleanupService.cleanupDeletedAccountData(currentUserId, idToken);
      if (cleanupResult.partial) {
        setWarning("Account deleted. Some saved data may take time to be fully removed.");
      }

      // Redirect to home page after successful deletion
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Error deleting account:", error);

      // Handle specific Firebase errors
      if (error.code === "auth/requires-recent-login") {
        setError(
          "For security reasons, please sign in again before deleting your account."
        );
      } else if (error.code === "auth/user-not-found") {
        setError("User account not found.");
      } else {
        setError("Failed to delete account. Please try again.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center font-poppins">
      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-gray-500/70 bg-opacity-50 flex items-center justify-center z-50">
          {/* Modal Content */}
          <div className="bg-white dark:bg-[#1C1C1E] rounded-lg shadow-xl p-6 w-96 max-w-md mx-4">
            {/* Header */}
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Delete Account
            </h2>

            {/* Message */}
            <p className="text-gray-600 text-sm leading-relaxed mb-4 dark:text-white">
              Are you sure you want to delete your account? This action cannot
              be undone and will permanently remove all your data including
              bookmarks and settings.
            </p>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800">
                <p className="text-red-600 dark:text-red-400 text-sm">
                  {error}
                </p>
              </div>
            )}

            {/* Warning Message */}
            {warning && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md dark:bg-amber-900/20 dark:border-amber-800">
                <p className="text-amber-700 dark:text-amber-300 text-sm">
                  {warning}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 border dark:text-white dark:hover:bg-[#1C1C1E] border-gray-300 rounded hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || !user}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  "Delete Account"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeleteAccount;
