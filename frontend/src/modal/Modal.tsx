import { ReactNode } from 'react';
import '../style.css';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
};

const Modal = ({ isOpen, onClose, title, content, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm = () => {} }: ModalProps) => {
  if (!isOpen) {
    return null;
  }

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className='modal-overlay'>
      <div 
        className='modal-backdrop'
        onClick={ onClose }
        aria-hidden='true'
      />
      
      <div className='modal-content' role='dialog' aria-modal='true' aria-labelledby='modal-title'>
        <div className='modal-header'>
          <h2 className='modal-title' id='modal-title'>{title}</h2>
          <button 
            onClick={ onClose }
            className='modal-close-button'
            aria-label='Close modal' >
            <svg className='modal-close-icon' viewBox='0 0 24 24' stroke='currentColor'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M6 18L18 6M6 6l12 12' />
            </svg>
          </button>
        </div>
        
        <div className='modal-body'>
          { content }
        </div>
        
        <div className='modal-footer'>
          <button
            onClick={ onClose }
            className='modal-button modal-button-cancel' >
            { cancelLabel }
          </button>
          <button
            onClick={ handleConfirm }
            className='modal-button modal-button-confirm' >
            { confirmLabel }
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;