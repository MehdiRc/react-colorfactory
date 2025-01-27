import React, { useState, useEffect } from "react";
import { Node } from "../types";
import "./Cnode.css";

interface CnodeProps {
  node: Node;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  highlightNode: (id: string) => void;
  unhighlightAll: () => void;
  onMouseDownNode: (e: React.MouseEvent, id: string) => void;
  onMouseDownRight: (e: React.MouseEvent, id: string) => void;
  getNodeOpacity: (id: string) => number;
  changeNodeColor: (
    id: string,
    color: string,
    pushToUndo: boolean,
    oldColor?: string
  ) => void;
  colorBeforeDragRef: React.MutableRefObject<{ [key: string]: string }>;
  colorBeforeHexRef: React.MutableRefObject<{ [key: string]: string }>;
  simpleMode: boolean;
  onPreviewColor: (id: string, color: string | null) => void;
  lightnessPercentage: number;
  darknessPercentage: number;
  style?: React.CSSProperties;
  isDragging: boolean;
  onTouchStart?: (e: React.TouchEvent, id: string) => void;
  onTouchMove?: (e: React.TouchEvent, id: string) => void;
  onTouchEnd?: (e: React.TouchEvent, id: string) => void;
}

// Helper function to lighten a hex color by percentage
function lightenColor(hex: string, percentage: number): string {
  // Remove the "#" if present
  hex = hex.replace("#", "");

  // Convert 3-character hex to 6-character hex
  if (hex.length === 3) {
      hex = hex.split("").map((char) => char + char).join("");
  }

  // Parse the r, g, b values from the hex string
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate the new r, g, b values
  const lighten = (value: number): number =>
      Math.min(255, Math.floor(value + (255 - value) * (percentage / 100)));

  const newR = lighten(r);
  const newG = lighten(g);
  const newB = lighten(b);

  // Convert back to hex and return the new color
  return (
      "#" +
      [newR, newG, newB]
          .map((value) => value.toString(16).padStart(2, "0"))
          .join("")
  );
}

// Helper function to darken a hex color by percentage
function darkenColor(hex: string, percentage: number): string {
    // Remove the "#" if present
    hex = hex.replace("#", "");

    // Convert 3-character hex to 6-character hex
    if (hex.length === 3) {
        hex = hex.split("").map((char) => char + char).join("");
    }

    // Parse the r, g, b values from the hex string
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Calculate the new r, g, b values
    const darken = (value: number): number =>
        Math.max(0, Math.floor(value * (1 - percentage / 100)));

    const newR = darken(r);
    const newG = darken(g);
    const newB = darken(b);

    // Convert back to hex and return the new color
    return (
        "#" +
        [newR, newG, newB]
            .map((value) => value.toString(16).padStart(2, "0"))
            .join("")
    );
}

// Update the HSV to RGB conversion helper to handle zero values properly
function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  // If value is 0, return black but preserve hue and saturation
  if (v === 0) {
    return [0, 0, 0];
  }

  s /= 100;
  v /= 100;
  
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) {
    [r, g, b] = [c, x, 0];
  } else if (h >= 60 && h < 120) {
    [r, g, b] = [x, c, 0];
  } else if (h >= 120 && h < 180) {
    [r, g, b] = [0, c, x];
  } else if (h >= 180 && h < 240) {
    [r, g, b] = [0, x, c];
  } else if (h >= 240 && h < 300) {
    [r, g, b] = [x, 0, c];
  } else {
    [r, g, b] = [c, 0, x];
  }

  // If saturation is 0, convert to grayscale but preserve value
  if (s === 0) {
    return [
      Math.round(v * 255),
      Math.round(v * 255),
      Math.round(v * 255)
    ];
  }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  ];
}

// Update the RGB to HSV conversion helper
function rgbToHsv(r: number, g: number, b: number, lastHue?: number, lastSat?: number): [number, number, number] {
  
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  const v = max * 100;

  // Calculate saturation
  let s = max === 0 ? lastSat || 0 : (diff / max) * 100;

  // Calculate hue
  let h = lastHue || 0;
  if (diff > 0.0001) {
    if (max === r) {
      h = 60 * ((g - b) / diff + (g < b ? 6 : 0));
    } else if (max === g) {
      h = 60 * ((b - r) / diff + 2);
    } else {
      h = 60 * ((r - g) / diff + 4);
    }
  }

  // For black color (r=g=b=0), keep last values
  if (max === 0) {
    return [lastHue || 0, lastSat || 0, 0];
  }

  // For grayscale colors (r=g=b), keep last hue
  if (diff < 0.0001) {
    return [lastHue || 0, 0, v];
  }

  return [Math.round(h), Math.round(s), Math.round(v)];
}

const Cnode: React.FC<CnodeProps> = ({
  node,
  setNodes,
  highlightNode,
  unhighlightAll,
  onMouseDownNode,
  onMouseDownRight,
  getNodeOpacity,
  changeNodeColor,
  colorBeforeDragRef,
  colorBeforeHexRef,
  simpleMode,
  onPreviewColor,
  lightnessPercentage,
  darknessPercentage,
  style,
  isDragging,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}) => {
  const opacity = getNodeOpacity(node.id);

  // Add refs to store last hue and saturation for this node
  const lastHueRef = React.useRef<number>(0);
  const lastSatRef = React.useRef<number>(0);

  // Add state for the currently hovered color
  const [hoveredColor, setHoveredColor] = React.useState<string | null>(null);

  // Use either hovered color or node color for display
  const displayColor = hoveredColor || node.color;

  // Extract R,G,B from display color
  const displayR = parseInt(displayColor.slice(1, 3), 16);
  const displayG = parseInt(displayColor.slice(3, 5), 16);
  const displayB = parseInt(displayColor.slice(5, 7), 16);

  // Convert RGB to HSV using the stored values for both hue and saturation
  const [displayH, displayS, displayV] = rgbToHsv(
    displayR, 
    displayG, 
    displayB, 
    lastHueRef.current, 
    lastSatRef.current
  );

  // Update the stored values only if we're not showing a hovered color
  if (!hoveredColor) {
    lastHueRef.current = displayH;
    lastSatRef.current = displayS;
  }

  // Update the color calculation functions
  const lightenColor = (color: string): string => {
    const rgb = color.match(/\w\w/g)?.map(x => parseInt(x, 16)) || [0, 0, 0];
    const amount = lightnessPercentage / 100;
    return '#' + rgb.map(x => {
      const increased = Math.round(x + (255 - x) * amount);
      return Math.min(255, increased).toString(16).padStart(2, '0');
    }).join('');
  };

  const darkenColor = (color: string): string => {
    const rgb = color.match(/\w\w/g)?.map(x => parseInt(x, 16)) || [0, 0, 0];
    const amount = darknessPercentage / 100;
    return '#' + rgb.map(x => {
      const decreased = Math.round(x * (1 - amount));
      return Math.max(0, decreased).toString(16).padStart(2, '0');
    }).join('');
  };

  // Use these functions when rendering
  const lightenedColor = lightenColor(node.color);
  const darkenedColor = darkenColor(node.color);

  // Calculate pure color (100% saturation and value) for current hue
  const [pureR, pureG, pureB] = hsvToRgb(displayH, 100, 100);
  const pureColor = `#${pureR.toString(16).padStart(2, '0')}${pureG.toString(16).padStart(2, '0')}${pureB.toString(16).padStart(2, '0')}`;

  // Calculate fully saturated color at current hue and value
  const [satR, satG, satB] = hsvToRgb(displayH, 100, displayV);
  const satColor = `#${satR.toString(16).padStart(2, '0')}${satG.toString(16).padStart(2, '0')}${satB.toString(16).padStart(2, '0')}`;

  // Update the handleColorSquareClick function and add hover handlers
  const handleColorSquareClick = (color: string) => {
    navigator.clipboard.writeText(color).then(() => {
      const tooltip = document.createElement('div');
      tooltip.className = 'copy-tooltip';
      tooltip.textContent = `Color ${color} copied!`;
      document.body.appendChild(tooltip);
      
      setTimeout(() => {
        tooltip.remove();
      }, 1500);
    });
  };

  // Update the hover handlers to report preview colors
  const handleColorSquareEnter = (color: string) => {
    setHoveredColor(color);
    onPreviewColor(node.id, color);
  };

  const handleColorSquareLeave = () => {
    setHoveredColor(null);
    onPreviewColor(node.id, null);
  };

  // Update the hex input section in the Cnode component
  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow empty value for editing
    if (value === '') {
      setNodes(prev =>
        prev.map(n => {
          if (n.id === node.id) {
            return { ...n, color: value };
          }
          return n;
        })
      );
      return;
    }

    // Only update if it's a valid hex color
    if (/^#?[0-9A-Fa-f]{0,6}$/.test(value)) {
      const formattedValue = value.startsWith('#') ? value : `#${value}`;
      
      // Only update the node if we have a complete valid hex color
      if (/^#[0-9A-Fa-f]{6}$/.test(formattedValue)) {
        changeNodeColor(node.id, formattedValue.toUpperCase(), false);
        colorBeforeHexRef.current[node.id] = formattedValue.toUpperCase();
      } else {
        // Update the input value without changing the actual color
        setNodes(prev =>
          prev.map(n => {
            if (n.id === node.id) {
              return { ...n, color: formattedValue };
            }
            return n;
          })
        );
      }
    }
  };

  // Update the hex input blur handler
  const handleHexBlur = () => {
    // If the hex value is empty or invalid, revert to the last valid color
    if (!node.color || !/^#[0-9A-Fa-f]{6}$/.test(node.color)) {
      const lastValidColor = colorBeforeHexRef.current[node.id] || '#FFFFFF';
      changeNodeColor(node.id, lastValidColor, false);
    }
  };

  // Add ref to store the highlight timeout
  const highlightTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Clear timeout on unmount
  React.useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  // Helper function to convert HSV to RGB for gradient
  const hsvToRgbString = (h: number, s: number, v: number) => {
    const [r, g, b] = hsvToRgb(h, s, v);
    return `rgb(${r}, ${g}, ${b})`;
  };

  // Create gradient backgrounds for HSV sliders
  const saturationGradient = `linear-gradient(to right, 
    ${hsvToRgbString(displayH, 0, displayV)}, 
    ${hsvToRgbString(displayH, 100, displayV)}
  )`;

  const valueGradient = `linear-gradient(to right, 
    ${hsvToRgbString(displayH, displayS, 0)}, 
    ${hsvToRgbString(displayH, displayS, 100)}
  )`;

  // Update the hue slider handler
  const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newH = parseInt(e.target.value);
    // Ensure hue stays within 0-360 range
    newH = newH === 360 ? 359 : newH; // Prevent 360 which can cause issues
    
    // Use 10 for S and V when they are 0 to maintain hue visibility
    const effectiveS = displayS || 10;
    const effectiveV = displayV || 10;
    const [newR, newG, newB] = hsvToRgb(newH, effectiveS, effectiveV);
    const newHex = `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    changeNodeColor(node.id, newHex, false);
  };

  // Update the mouseUp handler for hue as well
  const handleHueMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    const oldColor = colorBeforeDragRef.current[node.id];
    let newH = parseInt((e.target as HTMLInputElement).value);
    newH = newH === 360 ? 359 : newH; // Same protection here
    
    const [newR, newG, newB] = hsvToRgb(newH, displayS, displayV);
    const newHex = `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    changeNodeColor(node.id, newHex, true, oldColor);
  };

  // Add touch handling state
  const [touchStartTime, setTouchStartTime] = useState<number>(0);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isTouching, setIsTouching] = useState(false);

  // Add touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    
    if (onTouchStart) {
      onTouchStart(e, node.id);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    
    if (onTouchMove) {
      onTouchMove(e, node.id);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    
    if (onTouchEnd) {
      onTouchEnd(e, node.id);
    }
  };

  // Add cleanup effect
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  return (
    <div
      key={node.id}
      className={`node ${simpleMode ? 'simple-mode' : ''} ${isDragging ? 'dragging' : ''}`}
      data-id={node.id}
      style={{
        left: node.x,
        top: node.y,
        backgroundColor: hoveredColor || node.color,
        opacity,
        minHeight: simpleMode ? '60px' : '180px',
        width: simpleMode ? '180px' : '220px',
        ...style,
        touchAction: 'none'
      }}
      onMouseEnter={() => {
        // Clear any existing timeout
        if (highlightTimeoutRef.current) {
          clearTimeout(highlightTimeoutRef.current);
        }
        // Set new timeout for 2 seconds
        highlightTimeoutRef.current = setTimeout(() => {
          highlightNode(node.id);
        }, 2000);
      }}
      onMouseLeave={() => {
        // Clear the timeout when mouse leaves
        if (highlightTimeoutRef.current) {
          clearTimeout(highlightTimeoutRef.current);
        }
        if (!isDragging) {
          unhighlightAll();
          handleColorSquareLeave();
        }
      }}
      onMouseDown={(e) => {
        // Clear the timeout when mouse is pressed
        if (highlightTimeoutRef.current) {
          clearTimeout(highlightTimeoutRef.current);
        }
        onMouseDownNode(e, node.id);
      }}
      onContextMenu={(e) => onMouseDownRight(e, node.id)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="node-header">
        <input
          type="text"
          className="title-input"
          value={node.title}
          onChange={(e) => {
            const val = e.target.value;
            setNodes((prev) =>
              prev.map((n) => {
                if (n.id === node.id) return { ...n, title: val };
                return n;
              })
            );
          }}
        />
      </div>

      {!simpleMode && (
        <div className="color-controls">
          <div className="hsv-controls">
            <div className="color-slider">
              <label>H</label>
              <input
                type="range"
                className="slider hue-slider"
                min="0"
                max="359"
                value={displayH}
                onChange={handleHueChange}
                onMouseDown={() => {
                  colorBeforeDragRef.current[node.id] = node.color;
                }}
                onMouseUp={handleHueMouseUp}
              />
              <span className="value">{Math.round(displayH)}°</span>
            </div>

            <div className="color-slider">
              <label>S</label>
              <input
                type="range"
                className="slider saturation-slider"
                min="0"
                max="100"
                value={displayS}
                style={{ background: saturationGradient }}
                onChange={(e) => {
                  const newS = parseInt(e.target.value);
                  const [newR, newG, newB] = hsvToRgb(displayH, newS, displayV);
                  const newHex = `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
                  changeNodeColor(node.id, newHex, false);
                }}
                onMouseDown={() => {
                  colorBeforeDragRef.current[node.id] = node.color;
                }}
                onMouseUp={(e: any) => {
                  const oldColor = colorBeforeDragRef.current[node.id];
                  const newS = parseInt(e.target.value);
                  const [newR, newG, newB] = hsvToRgb(displayH, newS, displayV);
                  const newHex = `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
                  changeNodeColor(node.id, newHex, true, oldColor);
                }}
              />
              <span className="value">{Math.round(displayS)}%</span>
            </div>

            <div className="color-slider">
              <label>V</label>
              <input
                type="range"
                className="slider value-slider"
                min="0"
                max="100"
                value={displayV}
                style={{ background: valueGradient }}
                onChange={(e) => {
                  const newV = parseInt(e.target.value);
                  const [newR, newG, newB] = hsvToRgb(displayH, displayS, newV);
                  const newHex = `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
                  changeNodeColor(node.id, newHex, false);
                }}
                onMouseDown={() => {
                  colorBeforeDragRef.current[node.id] = node.color;
                }}
                onMouseUp={(e: any) => {
                  const oldColor = colorBeforeDragRef.current[node.id];
                  const newV = parseInt(e.target.value);
                  const [newR, newG, newB] = hsvToRgb(displayH, displayS, newV);
                  const newHex = `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
                  changeNodeColor(node.id, newHex, true, oldColor);
                }}
              />
              <span className="value">{Math.round(displayV)}%</span>
            </div>
          </div>

          <div className="rgb-controls">
            <div className="color-slider">
              <label>R</label>
              <input
                type="range"
                min="0"
                max="255"
                value={displayR}
                className="slider red-slider"
                readOnly={!!hoveredColor}
                style={{
                  background: `linear-gradient(to right, 
                    rgb(0, ${displayG}, ${displayB}),
                    rgb(255, ${displayG}, ${displayB})
                  )`
                }}
                onMouseDown={() => {
                  colorBeforeDragRef.current[node.id] = node.color;
                }}
                onChange={(e) => {
                  const newR = parseInt(e.target.value)
                    .toString(16)
                    .padStart(2, "0");
                  const newHex = `#${newR}${node.color.slice(
                    3,
                    5
                  )}${node.color.slice(5, 7)}`;
                  changeNodeColor(node.id, newHex, false);
                }}
                onMouseUp={(e: any) => {
                  const oldColor = colorBeforeDragRef.current[node.id];
                  const newR = parseInt(e.target.value)
                    .toString(16)
                    .padStart(2, "0");
                  const newHex = `#${newR}${node.color.slice(
                    3,
                    5
                  )}${node.color.slice(5, 7)}`;
                  changeNodeColor(node.id, newHex, true, oldColor);
                }}
              />
              <span className="value">{displayR}</span>
            </div>

            <div className="color-slider">
              <label>G</label>
              <input
                type="range"
                min="0"
                max="255"
                value={displayG}
                className="slider green-slider"
                readOnly={!!hoveredColor}
                style={{
                  background: `linear-gradient(to right, 
                    rgb(${displayR}, 0, ${displayB}),
                    rgb(${displayR}, 255, ${displayB})
                  )`
                }}
                onMouseDown={() => {
                  colorBeforeDragRef.current[node.id] = node.color;
                }}
                onChange={(e) => {
                  const newG = parseInt(e.target.value)
                    .toString(16)
                    .padStart(2, "0");
                  const newHex = `#${node.color.slice(
                    1,
                    3
                  )}${newG}${node.color.slice(5, 7)}`;
                  changeNodeColor(node.id, newHex, false);
                }}
                onMouseUp={(e: any) => {
                  const oldColor = colorBeforeDragRef.current[node.id];
                  const newG = parseInt(e.target.value)
                    .toString(16)
                    .padStart(2, "0");
                  const newHex = `#${node.color.slice(
                    1,
                    3
                  )}${newG}${node.color.slice(5, 7)}`;
                  changeNodeColor(node.id, newHex, true, oldColor);
                }}
              />
              <span className="value">{displayG}</span>
            </div>

            <div className="color-slider">
              <label>B</label>
              <input
                type="range"
                min="0"
                max="255"
                value={displayB}
                className="slider blue-slider"
                readOnly={!!hoveredColor}
                style={{
                  background: `linear-gradient(to right, 
                    rgb(${displayR}, ${displayG}, 0),
                    rgb(${displayR}, ${displayG}, 255)
                  )`
                }}
                onMouseDown={() => {
                  colorBeforeDragRef.current[node.id] = node.color;
                }}
                onChange={(e) => {
                  const newB = parseInt(e.target.value)
                    .toString(16)
                    .padStart(2, "0");
                  const newHex = `#${node.color.slice(1, 3)}${node.color.slice(
                    3,
                    5
                  )}${newB}`;
                  changeNodeColor(node.id, newHex, false);
                }}
                onMouseUp={(e: any) => {
                  const oldColor = colorBeforeDragRef.current[node.id];
                  const newB = parseInt(e.target.value)
                    .toString(16)
                    .padStart(2, "0");
                  const newHex = `#${node.color.slice(1, 3)}${node.color.slice(
                    3,
                    5
                  )}${newB}`;
                  changeNodeColor(node.id, newHex, true, oldColor);
                }}
              />
              <span className="value">{displayB}</span>
            </div>
          </div>

          <div className="hex-input">
            <label>Hex:</label>
            <input
              type="text"
              value={node.color}
              onChange={handleHexChange}
              onBlur={handleHexBlur}
              maxLength={7}
            />
          </div>
        </div>
      )}

      <div className={`color-squares ${simpleMode ? 'simple-layout' : ''}`}>
        <div 
          className="color-square"
          style={{ backgroundColor: lightenedColor }}
          title="Click to copy lightened color"
          onClick={(e) => {
            e.stopPropagation();
            handleColorSquareClick(lightenedColor);
          }}
          onMouseEnter={() => handleColorSquareEnter(lightenedColor)}
          onMouseLeave={handleColorSquareLeave}
        />
        <div 
          className="color-square"
          style={{ backgroundColor: node.color }}
          title="Click to copy original color"
          onClick={(e) => {
            e.stopPropagation();
            handleColorSquareClick(node.color);
          }}
          onMouseEnter={() => handleColorSquareEnter(node.color)}
          onMouseLeave={handleColorSquareLeave}
        />
        <div 
          className="color-square"
          style={{ backgroundColor: darkenedColor }}
          title="Click to copy darkened color"
          onClick={(e) => {
            e.stopPropagation();
            handleColorSquareClick(darkenedColor);
          }}
          onMouseEnter={() => handleColorSquareEnter(darkenedColor)}
          onMouseLeave={handleColorSquareLeave}
        />
      </div>
    </div>
  );
};

export default Cnode;
