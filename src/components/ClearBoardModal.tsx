import React from 'react';

interface ClearBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const ClearBoardModal: React.FC<ClearBoardModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Clear Board</h2>
        <p>Are you sure you want to clear the board? This action can be undone.</p>
        <div className="modal-actions">
          <button
            onClick={onClose}
            className="cancel-button"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="danger-button"
          >
            Clear Board
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClearBoardModal; 