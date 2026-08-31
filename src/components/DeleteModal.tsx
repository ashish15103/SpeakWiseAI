export function DeleteModal({
  isOpen,
  chatTitle,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  chatTitle: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4 backdrop-blur-[2px]">
      <div
        className="
          w-full max-w-[300px]
          rounded-2xl
          bg-white
          p-5
          shadow-2xl
          dark:border dark:border-gray-800
          dark:bg-gray-900
        "
      >
        {/* Title */}
        <h2 className="text-[16px] font-medium text-gray-900 dark:text-white">
          Delete chat?
        </h2>

        {/* Message */}
        <p className="mt-3 text-[13px] leading-5 text-gray-700 dark:text-gray-300">
          This will delete{" "}
          <span className="font-semibold text-gray-900 dark:text-white">
            {chatTitle}
          </span>
          .
        </p>

        {/* Buttons */}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="
              rounded-full
              border border-gray-300
              bg-white
              px-4 py-1.5
              text-[12px]
              font-medium
              text-gray-700
              transition
              hover:bg-gray-50
              dark:border-gray-700
              dark:bg-gray-800
              dark:text-gray-300
              dark:hover:bg-gray-700
            "
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="
              rounded-full
              border-2 border-black
              bg-[#E53935]
              px-4 py-1.5
              text-[12px]
              font-medium
              text-white
              transition
              hover:bg-red-600
              dark:border-gray-900
            "
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
