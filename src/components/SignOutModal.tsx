import { useEffect } from "react";
import { createPortal } from "react-dom";
import { LogOut, X } from "lucide-react";

interface SignOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function SignOutModal({
  isOpen,
  onClose,
  onConfirm,
}: SignOutModalProps) {
  // Prevent background page scrolling while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    // Close with Escape
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  /*
   * IMPORTANT:
   * Render directly into document.body.
   *
   * This prevents the modal from being trapped inside
   * the mobile sidebar's fixed/transform stacking context.
   */
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signout-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="
          relative
          w-full
          max-w-[360px]
          overflow-hidden
          rounded-2xl
          border
          border-gray-200
          bg-white
          shadow-[0_24px_80px_rgba(15,23,42,0.22)]
          dark:border-gray-800
          dark:bg-gray-900
          animate-[modalIn_160ms_ease-out]
        "
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sign out dialog"
          className="
            absolute
            right-3
            top-3
            flex
            h-8
            w-8
            items-center
            justify-center
            rounded-full
            text-gray-400
            transition
            hover:bg-gray-100
            hover:text-gray-700
            active:scale-95
            dark:hover:bg-gray-800
            dark:hover:text-gray-200
          "
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="px-5 pb-5 pt-6 sm:px-6 sm:pb-6">
          {/* Icon */}
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-500 dark:bg-red-950/30 dark:text-red-400">
            <LogOut className="h-5 w-5" />
          </div>

          {/* Heading */}
          <h2
            id="signout-title"
            className="pr-8 text-lg font-semibold tracking-tight text-gray-900 dark:text-white"
          >
            Sign out?
          </h2>

          <p className="mt-2 max-w-[290px] text-sm leading-5 text-gray-500 dark:text-gray-400">
            Are you sure you want to sign out of your SpeakWise AI account?
          </p>

          {/* Buttons */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="
                flex-1
                rounded-xl
                border
                border-gray-200
                bg-white
                px-4
                py-2.5
                text-sm
                font-medium
                text-gray-700
                transition
                hover:bg-gray-50
                active:scale-[0.98]
                dark:border-gray-700
                dark:bg-gray-900
                dark:text-gray-200
                dark:hover:bg-gray-800
              "
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirm}
              className="
                flex-1
                rounded-xl
                bg-red-500
                px-4
                py-2.5
                text-sm
                font-semibold
                text-white
                shadow-sm
                transition
                hover:bg-red-600
                active:scale-[0.98]
                focus:outline-none
                focus:ring-2
                focus:ring-red-500/30
              "
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Modal animation */}
      <style>{`
        @keyframes modalIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.97);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>,
    document.body,
  );
}
