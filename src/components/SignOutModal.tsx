export function SignOutModal({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px] transition-opacity">
      {/* Rectangular Modal Container */}
      <div className="w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-2xl dark:border dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">
          Sign out?
        </h2>

        <p className="mt-4 text-[15px] text-gray-800 dark:text-gray-200">
          Are you sure you want to sign out of your account?
        </p>

        {/* Buttons */}
        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>

          {/* Sign Out Button with the distinct black border */}
          <button
            onClick={onConfirm}
            className="rounded-full border-2 border-black bg-[#E53935] px-5 py-2 text-sm font-medium text-white transition hover:bg-red-600 dark:border-gray-900"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
