type ConfirmationModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  confirmButtonClassName?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

function ConfirmationModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  confirmButtonClassName = "",
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="confirmation-modal-backdrop"
      role="presentation"
      onClick={onCancel}
    >
      <div
        className="confirmation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="confirmation-modal-title">{title}</h3>
        <p>{message}</p>

        <div className="confirmation-modal-actions">
          <button
            type="button"
            className="confirmation-button confirmation-button-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            className={`confirmation-button ${confirmButtonClassName || "confirmation-button-primary"}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;
