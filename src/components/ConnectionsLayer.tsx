import React from "react";
import { Connection, Node, DraggingLine } from "../types";

interface WorkspaceSize {
  width: number;
  height: number;
}

interface ConnectionsLayerProps {
  connections: Connection[];
  nodes: Node[];
  draggingLine: DraggingLine | null;
  contrastThreshold: number;
  calculateContrast: (hex1: string, hex2: string) => number;
  getConnectionOpacity: (conn: Connection) => number;
  getEffectiveColor: (nodeId: string) => string;
  previewColorsEnabled: boolean;
  workspaceSize: WorkspaceSize;
  isDarkMode?: boolean;
}

const ConnectionsLayer: React.FC<ConnectionsLayerProps> = ({
  connections,
  nodes,
  draggingLine,
  contrastThreshold,
  calculateContrast,
  getConnectionOpacity,
  getEffectiveColor,
  previewColorsEnabled,
  workspaceSize,
  isDarkMode = false
}: ConnectionsLayerProps) => {
  // Add state to track swapped colors for each connection
  const [swappedConnections, setSwappedConnections] = React.useState<Set<string>>(new Set());

  const toggleSwapped = (connId: string) => {
    setSwappedConnections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(connId)) {
        newSet.delete(connId);
      } else {
        newSet.add(connId);
      }
      return newSet;
    });
  };

  // Helper function to mix two colors
  const mixColors = (color1: string, color2: string): string => {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);
    
    const r = Math.round((r1 + r2) / 2);
    const g = Math.round((g1 + g2) / 2);
    const b = Math.round((b1 + b2) / 2);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  return (
    <svg 
      id="connections" 
      width={workspaceSize.width} 
      height={workspaceSize.height}
    >
      {connections.map((conn, idx) => {
        const fromNode = nodes.find((n) => n.id === conn.fromId);
        const toNode = nodes.find((n) => n.id === conn.toId);
        if (!fromNode || !toNode) return null;

        const fromColor = getEffectiveColor(fromNode.id);
        const toColor = getEffectiveColor(toNode.id);
        const contrast = calculateContrast(fromColor, toColor);
        const strokeColor = contrast < contrastThreshold ? "red" : "green";
        const opacity = getConnectionOpacity(conn);

        const x1 = fromNode.x + 110;
        const y1 = fromNode.y + 90;
        const x2 = toNode.x + 110;
        const y2 = toNode.y + 90;

        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2 - 5;

        const contrastText = `Contrast: ${contrast.toFixed(2)} ${contrast >= contrastThreshold ? '✅' : '❌'}`;

        const textWidth = contrastText.length * 7;
        const padding = 16;
        const rectWidth = textWidth + padding * 2;
        const rectHeight = 24;

        const connId = `${conn.fromId}-${conn.toId}`;
        const isSwapped = swappedConnections.has(connId);

        return (
          <g key={idx}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={strokeColor}
              strokeWidth={2}
              opacity={opacity}
              data-from={conn.fromId}
              data-to={conn.toId}
            />
            {previewColorsEnabled ? (
              <g
                style={{ cursor: 'pointer' }}
                onClick={() => toggleSwapped(connId)}
              >
                <rect
                  x={midX - rectWidth/2}
                  y={midY - rectHeight/2}
                  width={rectWidth}
                  height={rectHeight}
                  fill={isSwapped ? fromColor : toColor}
                  rx={4}
                  opacity={opacity}
                />
                <text
                  x={midX}
                  y={midY}
                  fontSize={12}
                  fill={isSwapped ? toColor : fromColor}
                  opacity={opacity}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  data-from={conn.fromId}
                  data-to={conn.toId}
                  style={{ fill: isSwapped ? toColor : fromColor }}
                >
                  {contrastText}
                </text>
              </g>
            ) : (
              <text
                x={midX}
                y={midY}
                fontSize={12}
                fill={isDarkMode ? "#ffffff" : "#000000"}
                opacity={opacity}
                textAnchor="middle"
                dominantBaseline="middle"
                data-from={conn.fromId}
                data-to={conn.toId}
              >
                {contrastText}
              </text>
            )}
          </g>
        );
      })}

      {draggingLine && (
        <line
          x1={draggingLine.x1}
          y1={draggingLine.y1}
          x2={draggingLine.x2}
          y2={draggingLine.y2}
          stroke={isDarkMode ? "#ffffff" : "#000000"}
          strokeWidth={2}
        />
      )}
    </svg>
  );
};

export default ConnectionsLayer;
