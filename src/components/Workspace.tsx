import React, { useState, useEffect } from "react";
import Cnode from "./Cnode";
import ConnectionsLayer from "./ConnectionsLayer";
import { Node, Connection, DraggingLine, UndoAction } from "../types";

interface WorkspaceProps {
  workspaceRef: React.RefObject<HTMLDivElement | null>;
  onWorkspaceMouseDown: (e: React.MouseEvent) => void;
  connections: Connection[];
  nodes: Node[];
  draggingLine: DraggingLine | null;
  contrastThreshold: number;
  calculateContrast: (hex1: string, hex2: string) => number;
  getConnectionOpacity: (conn: Connection) => number;
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
  linksVisible: boolean;
  previewColorsEnabled: boolean;
  handleFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  eraserActive: boolean;
  lightnessPercentage: number;
  darknessPercentage: number;
  isDarkMode?: boolean;
  setUndoStack: React.Dispatch<React.SetStateAction<UndoAction[]>>;
}

const Workspace: React.FC<WorkspaceProps> = ({
  workspaceRef,
  onWorkspaceMouseDown,
  connections,
  nodes,
  draggingLine,
  contrastThreshold,
  calculateContrast,
  getConnectionOpacity,
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
  linksVisible,
  previewColorsEnabled,
  handleFileInput,
  eraserActive,
  lightnessPercentage,
  darknessPercentage,
  isDarkMode = false,
  setUndoStack,
}) => {
  // Add state to track preview colors
  const [previewColors, setPreviewColors] = React.useState<{ [key: string]: string }>({});
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);
  const [workspaceSize, setWorkspaceSize] = React.useState({
    width: 0,
    height: 0
  });

  // Add state for panning
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Add these state variables
  const [clonedNode, setClonedNode] = useState<Node | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Add this state to store the mouse offset from the node's top-left corner
  const [cloneOffset, setCloneOffset] = useState({ x: 0, y: 0 });

  // Add this state to track if we're currently dragging
  const [isDragging, setIsDragging] = useState(false);

  // Add this state to track the dragged node ID
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  // Add state to track the last dragged node
  const [lastDraggedNodeId, setLastDraggedNodeId] = useState<string | null>(null);

  // Add this state near the other state declarations
  const [showMobileWarning, setShowMobileWarning] = useState(false);

  // Add this effect to update workspace size
  React.useEffect(() => {
    const updateSize = () => {
      if (workspaceRef.current) {
        const rect = workspaceRef.current.getBoundingClientRect();
        setWorkspaceSize({
          width: rect.width,
          height: rect.height
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    
    return () => {
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Add this effect to detect mobile devices and show warning
  useEffect(() => {
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobileDevice) {
      setShowMobileWarning(true);
    }
  }, []);

  // Handler for preview colors
  const handlePreviewColor = (nodeId: string, color: string | null) => {
    setPreviewColors(prev => {
      if (color === null) {
        const { [nodeId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [nodeId]: color };
    });
  };

  // Helper to get effective color for a node (preview or actual)
  const getEffectiveColor = (nodeId: string) => {
    return previewColors[nodeId] || nodes.find(n => n.id === nodeId)?.color || '#FFFFFF';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const fakeEvent = {
        target: {
          files: files
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      
      handleFileInput(fakeEvent);
    }
  };

  // Handle mouse down for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle mouse button (button 1)
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    } else {
      onWorkspaceMouseDown(e);
    }
  };

  // Handle mouse move for panning
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const newX = e.clientX - panStart.x;
      const newY = e.clientY - panStart.y;
      setOffset({ x: newX, y: newY });

      // Update all node positions
      setNodes(prevNodes => prevNodes.map(node => ({
        ...node,
        x: node.x + (e.movementX),
        y: node.y + (e.movementY)
      })));
    }
    
    if (clonedNode) {
      const rect = workspaceRef.current!.getBoundingClientRect();
      const newX = e.clientX - rect.left - cloneOffset.x;
      const newY = e.clientY - rect.top - cloneOffset.y;
      setMousePos({ x: newX, y: newY });
    }
  };

  // Handle mouse up to stop panning
  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button === 1) {
      setIsPanning(false);
    }
    
    setIsDragging(false);
    setDraggedNodeId(null); // Reset dragged node ID
    
    if (clonedNode) {
      // Add the node at final position
      const newNode = {
        ...clonedNode,
        x: mousePos.x,
        y: mousePos.y
      };
      
      setNodes(prev => [...prev, newNode]);
      
      // Add to undo stack
      setUndoStack(prev => [...prev, { 
        type: "ADD_NODE", 
        nodeId: newNode.id 
      }]);
      
      setClonedNode(null);
    }
  };

  // Add event listeners for when mouse leaves the window
  useEffect(() => {
    const handleMouseUpGlobal = () => {
      setIsPanning(false);
    };

    window.addEventListener('mouseup', handleMouseUpGlobal);
    return () => {
      window.removeEventListener('mouseup', handleMouseUpGlobal);
    };
  }, []);

  // Function to update node's last interaction time
  const updateNodeInteraction = (nodeId: string) => {
    setNodes(prev => prev.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          lastInteracted: Date.now()
        };
      }
      return node;
    }));
  };

  // Update handleMouseDownNode to include interaction time
  const handleMouseDownNode = (e: React.MouseEvent, nodeId: string) => {
    if ((e.ctrlKey || e.metaKey) && e.button === 0) {
      e.stopPropagation();
      
      // Find the node to duplicate
      const originalNode = nodes.find(n => n.id === nodeId);
      if (!originalNode) return;

      // Calculate the offset from the mouse position to the node's top-left corner
      const rect = workspaceRef.current!.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const offsetX = clickX - originalNode.x;
      const offsetY = clickY - originalNode.y;

      // Store the offset
      setCloneOffset({ x: offsetX, y: offsetY });

      // Create a new node at the exact same position as the original
      const newNode = {
        ...originalNode,
        id: `node-${Date.now()}`,
        x: originalNode.x,
        y: originalNode.y,
        connections: [],
      };

      // Set the cloned node and initial mouse position
      setClonedNode(newNode);
      setMousePos({ x: originalNode.x, y: originalNode.y }); // Set initial position to match original node
    } else {
      setIsDragging(true);
      setDraggedNodeId(nodeId);
      updateNodeInteraction(nodeId);
      onMouseDownNode(e, nodeId);
    }
  };

  // Sort nodes by lastInteracted time before rendering
  const sortedNodes = [...nodes].sort((a, b) => {
    const timeA = a.lastInteracted || 0;
    const timeB = b.lastInteracted || 0;
    return timeA - timeB;
  });

  return (
    <div 
      id="workspace" 
      ref={workspaceRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ cursor: isPanning ? 'grabbing' : 'default' }}
      className={`
        ${!linksVisible ? 'links-hidden' : ''} 
        ${isDraggingOver ? 'dragging-over' : ''} 
        ${eraserActive ? 'eraser-active' : ''}
        ${isPanning ? 'panning' : ''}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDraggingOver && (
        <div className="drag-overlay">
          <div className="drag-message">
            <span>Drop files here</span>
            <small>Images or text files containing hex colors</small>
          </div>
        </div>
      )}

      {nodes.length === 0 && !isDraggingOver && (
        <div className="empty-workspace">
          <div className="empty-message">
            <span>Empty Workspace</span>
            <small>Add nodes using the "Add Node +" button or drag files here</small>
          </div>
        </div>
      )}

      {linksVisible && (
        <ConnectionsLayer
          connections={connections}
          nodes={nodes}
          draggingLine={draggingLine}
          contrastThreshold={contrastThreshold}
          calculateContrast={calculateContrast}
          getConnectionOpacity={getConnectionOpacity}
          getEffectiveColor={getEffectiveColor}
          previewColorsEnabled={previewColorsEnabled}
          workspaceSize={workspaceSize}
          isDarkMode={isDarkMode}
        />
      )}

      {sortedNodes.map((oneNode) => (
        <Cnode
          key={oneNode.id}
          node={oneNode}
          setNodes={setNodes}
          highlightNode={highlightNode}
          unhighlightAll={unhighlightAll}
          onMouseDownNode={handleMouseDownNode}
          onMouseDownRight={onMouseDownRight}
          getNodeOpacity={getNodeOpacity}
          changeNodeColor={changeNodeColor}
          colorBeforeDragRef={colorBeforeDragRef}
          colorBeforeHexRef={colorBeforeHexRef}
          simpleMode={simpleMode}
          onPreviewColor={handlePreviewColor}
          lightnessPercentage={lightnessPercentage}
          darknessPercentage={darknessPercentage}
          style={{
            zIndex: oneNode.lastInteracted ? Math.floor(oneNode.lastInteracted / 100) : 10
          }}
          isDragging={draggedNodeId === oneNode.id}
        />
      ))}

      {/* Render the cloned node that follows the mouse */}
      {clonedNode && (
        <Cnode
          key={clonedNode.id}
          node={{
            ...clonedNode,
            x: mousePos.x,
            y: mousePos.y
          }}
          setNodes={setNodes}
          highlightNode={highlightNode}
          unhighlightAll={unhighlightAll}
          onMouseDownNode={handleMouseDownNode}
          onMouseDownRight={onMouseDownRight}
          getNodeOpacity={getNodeOpacity}
          changeNodeColor={changeNodeColor}
          colorBeforeDragRef={colorBeforeDragRef}
          colorBeforeHexRef={colorBeforeHexRef}
          simpleMode={simpleMode}
          onPreviewColor={handlePreviewColor}
          lightnessPercentage={lightnessPercentage}
          darknessPercentage={darknessPercentage}
          style={{ opacity: 0.7 }} // Make it semi-transparent while dragging
          isDragging={draggedNodeId === clonedNode.id}
        />
      )}

      {showMobileWarning && (
        <div className="mobile-warning-overlay">
          <div className="mobile-warning-content">
            <h3>Desktop Only Tool</h3>
            <p>This color tool is designed for desktop use with a mouse. Touch input is not fully supported.</p>
            <button 
              onClick={() => setShowMobileWarning(false)}
              className="warning-close-button"
            >
              I understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workspace;
