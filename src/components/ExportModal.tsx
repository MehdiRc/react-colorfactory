import React, { useState } from 'react';
import './ExportModal.css';
import { Node } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: Node[];
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, nodes }) => {
  const [format, setFormat] = useState<'hex' | 'rgb' | 'hsl' | 'css'>('hex');
  const [separator, setSeparator] = useState<'newline' | 'comma' | 'space'>('newline');
  const [includeVariants, setIncludeVariants] = useState(false);

  if (!isOpen) return null;

  const hexToRgb = (hex: string): [number, number, number] => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  };

  const hexToHsl = (hex: string): [number, number, number] => {
    const [r, g, b] = hexToRgb(hex);
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;
    
    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    const diff = max - min;
    
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    
    if (diff !== 0) {
      s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);
      
      if (max === rNorm) {
        h = (gNorm - bNorm) / diff + (gNorm < bNorm ? 6 : 0);
      } else if (max === gNorm) {
        h = (bNorm - rNorm) / diff + 2;
      } else {
        h = (rNorm - gNorm) / diff + 4;
      }
      h *= 60;
    }
    
    return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
  };

  // Add functions to lighten and darken colors
  const lightenColor = (hex: string): string => {
    const rgb = hexToRgb(hex);
    const lighten = (value: number): number =>
      Math.min(255, Math.floor(value + (255 - value) * 0.3)); // 30% lighter
    
    const newR = lighten(rgb[0]);
    const newG = lighten(rgb[1]);
    const newB = lighten(rgb[2]);
    
    return `#${[newR, newG, newB]
      .map(v => v.toString(16).padStart(2, '0'))
      .join('')}`.toUpperCase();
  };

  const darkenColor = (hex: string): string => {
    const rgb = hexToRgb(hex);
    const darken = (value: number): number =>
      Math.max(0, Math.floor(value * 0.7)); // 30% darker
    
    const newR = darken(rgb[0]);
    const newG = darken(rgb[1]);
    const newB = darken(rgb[2]);
    
    return `#${[newR, newG, newB]
      .map(v => v.toString(16).padStart(2, '0'))
      .join('')}`.toUpperCase();
  };

  const formatColor = (color: string, node: Node, variant?: 'light' | 'dark'): string => {
    const colorToFormat = variant === 'light' ? lightenColor(color) 
                       : variant === 'dark' ? darkenColor(color)
                       : color;

    switch (format) {
      case 'hex':
        return colorToFormat.toUpperCase();
      case 'rgb': {
        const [r, g, b] = hexToRgb(colorToFormat);
        return `rgb(${r}, ${g}, ${b})`;
      }
      case 'hsl': {
        const [h, s, l] = hexToHsl(colorToFormat);
        return `hsl(${h}, ${s}%, ${l}%)`;
      }
      case 'css': {
        // Convert title to kebab case and make it lowercase
        const cssName = node.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        
        // Add variant suffix if needed
        const suffix = variant === 'light' ? '-light'
                    : variant === 'dark' ? '-dark'
                    : '';
        
        return `--${cssName}${suffix}: ${colorToFormat.toUpperCase()};`;
      }
      default:
        return colorToFormat;
    }
  };

  const getSeparator = (): string => {
    switch (separator) {
      case 'newline':
        return '\n';
      case 'comma':
        return ', ';
      case 'space':
        return ' ';
      default:
        return '\n';
    }
  };

  const getFormattedColors = (): string => {
    return nodes.flatMap(node => {
      const colors = [formatColor(node.color, node)];
      if (includeVariants) {
        colors.push(formatColor(node.color, node, 'light'));
        colors.push(formatColor(node.color, node, 'dark'));
      }
      return colors;
    }).join(getSeparator());
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getFormattedColors()).then(() => {
      const tooltip = document.createElement('div');
      tooltip.className = 'copy-tooltip';
      tooltip.textContent = 'Colors copied to clipboard!';
      document.body.appendChild(tooltip);
      
      setTimeout(() => {
        tooltip.remove();
      }, 1500);
    });
  };

  const downloadAsFile = () => {
    const content = getFormattedColors();
    const extension = format === 'css' ? 'css' : 'txt';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `colors.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content export-modal">
        <h2>Export Colors</h2>
        
        <div className="export-options">
          <div className="option-group">
            <label>Format:</label>
            <select value={format} onChange={(e) => setFormat(e.target.value as any)}>
              <option value="hex">HEX</option>
              <option value="rgb">RGB</option>
              <option value="hsl">HSL</option>
              <option value="css">CSS Variables</option>
            </select>
          </div>

          <div className="option-group">
            <label>Separator:</label>
            <select value={separator} onChange={(e) => setSeparator(e.target.value as any)}>
              <option value="newline">New Line</option>
              <option value="comma">Comma</option>
              <option value="space">Space</option>
            </select>
          </div>

          <div className="option-group">
            <label>
              <input
                type="checkbox"
                checked={includeVariants}
                onChange={(e) => setIncludeVariants(e.target.checked)}
              />
              Include Light/Dark Variants
            </label>
          </div>
        </div>

        <div className="preview">
          <label>Preview:</label>
          <pre>{getFormattedColors()}</pre>
        </div>

        <div className="modal-actions">
          <button onClick={copyToClipboard}>Copy to Clipboard</button>
          <button onClick={downloadAsFile}>Download</button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal; 