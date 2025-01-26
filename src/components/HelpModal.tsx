import React from 'react';
import './HelpModal.css';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="help-modal">
        <h2>How to Use the Color Tool</h2>
        
        <div className="help-section">
          <h3>Basic Operations</h3>
          <ul>
            <li><strong>Add Node:</strong> Click the "Add Node" button to create a new color node</li>
            <li><strong>Move Node:</strong> Click and drag a node to move it (node stays on top after moving)</li>
            <li><strong>Delete Node:</strong> Toggle eraser mode or right-click a node</li>
            <li><strong>Pan Workspace:</strong> Hold middle mouse button and drag to move the workspace</li>
          </ul>
        </div>

        <div className="help-section">
          <h3>Node Interactions</h3>
          <ul>
            <li><strong>Clone Node:</strong> Hold Ctrl/Cmd and drag a node to create a copy</li>
            <li><strong>Connect Nodes:</strong> Right-click drag between nodes to create a connection</li>
            <li><strong>Copy Color:</strong> Click on any color square (original, light, or dark variant)</li>
            <li><strong>Preview Colors:</strong> Hover over color squares to preview the effect</li>
            <li><strong>Auto Highlight:</strong> Hover over a node for 3 seconds to highlight connections</li>
          </ul>
        </div>

        <div className="help-section">
          <h3>Color Controls</h3>
          <ul>
            <li><strong>HSV Controls:</strong> Use sliders to adjust Hue, Saturation, and Value</li>
            <li><strong>RGB Controls:</strong> Fine-tune colors using Red, Green, Blue sliders</li>
            <li><strong>Hex Input:</strong> Directly enter or paste hex color values</li>
            <li><strong>Color Variants:</strong> Each node shows light and dark variants that can be copied</li>
            <li><strong>Color Preview:</strong> Toggle preview mode to see color mixing effects</li>
          </ul>
        </div>

        <div className="help-section">
          <h3>File Operations</h3>
          <ul>
            <li><strong>Import:</strong> Drag & drop images or text files containing colors</li>
            <li><strong>Export:</strong> Export colors in HEX, RGB, HSL, or CSS variable format</li>
            <li><strong>Color Extraction:</strong> Extract color palettes from images using K-means</li>
            <li><strong>Undo:</strong> Use Ctrl+Z or the undo button to reverse actions</li>
          </ul>
        </div>

        <div className="help-section">
          <h3>Settings & Modes</h3>
          <ul>
            <li><strong>Simple Mode:</strong> Toggle between simple and advanced node views</li>
            <li><strong>Dark Mode:</strong> Switch between light and dark interface themes</li>
            <li><strong>Contrast Check:</strong> Adjust minimum contrast ratio for connections</li>
            <li><strong>Visibility:</strong> Toggle connection lines and hover effects</li>
            <li><strong>Variants:</strong> Customize light/dark variant percentages</li>
          </ul>
        </div>

        <button className="close-button" onClick={onClose}>
          <span className="material-icons">close</span>
        </button>
      </div>
    </div>
  );
};

export default HelpModal; 