import iconSuccess from '../assets/icon-success.png';
import iconConfirm from '../assets/icon-confirm.png';

// Green checkmark badge + title + message + single "Close" button (bottom-right)
export function SuccessModal({ title, message, buttonText = 'Close', onClose }) {
  return (
    <div className="modal-overlay">
      <div className="confirm-card">
        <img src={iconSuccess} alt="" className="confirm-icon" />
        <h2 className="confirm-title">{title}</h2>
        {message && <p className="confirm-message">{message}</p>}
        <div className="confirm-actions confirm-actions-end">
          <button className="btn btn-outline" onClick={onClose}>{buttonText}</button>
        </div>
      </div>
    </div>
  );
}

// Question-mark speech-bubble badge + title + Yes/No buttons (centered)
export function ConfirmModal({ title, message, confirmText = 'Yes', cancelText = 'No', onConfirm, onCancel }) {
  return (
    <div className="modal-overlay">
      <div className="confirm-card">
        <img src={iconConfirm} alt="" className="confirm-icon" />
        <h2 className="confirm-title">{title}</h2>
        {message && <p className="confirm-message">{message}</p>}
        <div className="confirm-actions confirm-actions-center">
          <button className="btn btn-outline" onClick={onConfirm}>{confirmText}</button>
          <button className="btn btn-outline" onClick={onCancel}>{cancelText}</button>
        </div>
      </div>
    </div>
  );
}