import React, { useState, useEffect, useRef } from "react";
import "./App.css";

import Cnode from "./components/Cnode";
import TopBar from "./components/TopBar";
import Workspace from "./components/Workspace";
import KMeansModal from "./components/KMeansModal";
import ExportModal from "./components/ExportModal";
import ClearBoardModal from './components/ClearBoardModal';
import { Node, Connection, DraggingLine, UndoAction } from "./types";
import { calculateLayout } from './utils/layoutUtils';
import SettingsDrawer from "./components/SettingsDrawer";
import Tooltip from "./components/Tooltip";

/*****************************************************
 * Helper: Luminance-based contrast ratio (WCAG)
 *****************************************************/
function calculateContrast(hex1: string, hex2: string): number {
  function luminance(hex: string): number {
    const rgb =
      hex
        .replace("#", "")
        .match(/.{2}/g)
        ?.map((c) => parseInt(c, 16) / 255) || [];
    const [r, g, b] = rgb.map((val) =>
      val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
    );
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  const lum1 = luminance(hex1);
  const lum2 = luminance(hex2);
  return (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
}

/*****************************************************
 * Helper: Convert R,G,B to hex
 *****************************************************/
function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    r.toString(16).padStart(2, "0") +
    g.toString(16).padStart(2, "0") +
    b.toString(16).padStart(2, "0")
  ).toUpperCase();
}

/*****************************************************
 * K-Means color clustering
 *****************************************************/
function clusterPixelsKMeans(
  data: number[][],
  k: number,
  maxIters: number = 10
): number[][] {
  if (!data.length || k < 1) return [];
  // Random init
  const centers: number[][] = [];
  for (let i = 0; i < k; i++) {
    const randIndex = Math.floor(Math.random() * data.length);
    centers.push([...data[randIndex]]);
  }
  let assignments = new Array(data.length).fill(-1);

  for (let iter = 0; iter < maxIters; iter++) {
    let moved = false;
    // Assign each pixel to closest center
    for (let i = 0; i < data.length; i++) {
      const [r, g, b] = data[i];
      let bestDist = Infinity;
      let bestIndex = 0;
      for (let c = 0; c < k; c++) {
        const [cr, cg, cb] = centers[c];
        const dist = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
        if (dist < bestDist) {
          bestDist = dist;
          bestIndex = c;
        }
      }
      if (assignments[i] !== bestIndex) {
        assignments[i] = bestIndex;
        moved = true;
      }
    }
    if (!moved) break; // no changes => done

    // Re-center
    const sums: [number, number, number, number][] = Array.from(
      { length: k },
      () => [0, 0, 0, 0]
    );
    for (let i = 0; i < data.length; i++) {
      const cIdx = assignments[i];
      sums[cIdx][0] += data[i][0];
      sums[cIdx][1] += data[i][1];
      sums[cIdx][2] += data[i][2];
      sums[cIdx][3] += 1;
    }
    for (let c = 0; c < k; c++) {
      const count = sums[c][3];
      if (count > 0) {
        centers[c][0] = sums[c][0] / count;
        centers[c][1] = sums[c][1] / count;
        centers[c][2] = sums[c][2] / count;
      }
    }
  }
  return centers.map(([r, g, b]) => [
    Math.round(r),
    Math.round(g),
    Math.round(b),
  ]);
}

// Add this CSS class near the top of the file
const preventSelectStyle = {
  userSelect: 'none',
  WebkitUserSelect: 'none' as any,
} as const;

function App() {
  /*****************************************************
   * State
   *****************************************************/
  const [nodes, setNodes] = useState<Node[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [nodeCount, setNodeCount] = useState(0);

  const [eraserActive, setEraserActive] = useState(false);
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);

  const [contrastThreshold, setContrastThreshold] = useState(4.5);

  // For K-means modal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [modalMaxColors, setModalMaxColors] = useState(5);
  const [currentColorList, setCurrentColorList] = useState<string[]>([]);

  // Line dragging states
  const [draggingLine, setDraggingLine] = useState<DraggingLine | null>(null);
  const [startNodeId, setStartNodeId] = useState<string | null>(null);

  // Hover highlight
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Refs
  const draggingNodeRef = useRef<string | null>(null);
  const dragOffsetsRef = useRef<{
    [key: string]: { offsetX: number; offsetY: number };
  }>({});
  const colorBeforeDragRef = useRef<{ [key: string]: string }>({});
  const colorBeforeHexRef = useRef<{ [key: string]: string }>({});
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Add simple mode state
  const [simpleMode, setSimpleMode] = useState(false);

  // Add hover highlight toggle state
  const [hoverHighlightEnabled, setHoverHighlightEnabled] = useState(true);

  // Add links visibility toggle state
  const [linksVisible, setLinksVisible] = useState(true);

  // Add export modal state
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Add preview colors toggle state
  const [previewColorsEnabled, setPreviewColorsEnabled] = useState(false);

  // Add clear board modal state
  const [clearBoardModalOpen, setClearBoardModalOpen] = useState(false);

  // Add this near the other state declarations
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  // Add state for settings drawer
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Add these to your state declarations
  const [tooltipText, setTooltipText] = useState('');
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Add these state declarations near the other useState hooks
  const [lightnessPercentage, setLightnessPercentage] = useState(30); // Default 30%
  const [darknessPercentage, setDarknessPercentage] = useState(30); // Default 30%

  // Add this state for dark mode
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check if user has a saved preference
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  // Add this effect to handle window resizing
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Add this effect to recalculate layout on window resize
  useEffect(() => {
    if (workspaceRef.current && nodes.length > 0) {
      const rect = workspaceRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // Create temporary connections for layout
      const tempConnections = nodes.flatMap((node, i) => 
        nodes.slice(i + 1).map(otherNode => ({
          fromId: node.id,
          toId: otherNode.id
        }))
      );

      const positions = calculateLayout(
        nodes,
        tempConnections,
        width,
        height
      );

      // Update node positions
      setNodes(prev => prev.map(node => ({
        ...node,
        x: positions[node.id].x,
        y: positions[node.id].y
      })));
    }
  }, [windowSize]); // Only recalculate when window size changes

  // Add this effect to handle mouse movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Add this effect to apply dark mode
  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // Add toggle function
  const toggleSimpleMode = () => {
    setSimpleMode(prev => !prev);
  };

  const toggleHoverHighlight = () => {
    setHoverHighlightEnabled(prev => !prev);
  };

  const toggleLinksVisibility = () => {
    setLinksVisible(prev => !prev);
  };

  const togglePreviewColors = () => {
    setPreviewColorsEnabled(prev => !prev);
  };

  const toggleSettings = () => {
    setIsSettingsOpen(prev => !prev);
  };

  const toggleDarkMode = () => {
    setIsDarkMode((prev: boolean) => !prev);
  };

  /*****************************************************
   * Global key listener (Ctrl+Z => Undo)
   *****************************************************/
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undoLastAction();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [undoStack]);

  /*****************************************************
   * ADD / REMOVE Node
   *****************************************************/
  function addNode(): void {
    const id = `node-${nodeCount}`;
    const newNode: Node = {
      id,
      x: Math.random() * 300,
      y: Math.random() * 300,
      color: "#FFFFFF",
      title: `Node ${nodeCount}`,
      connections: [],
    };
    setNodes((prev) => [...prev, newNode]);
    setNodeCount((prev) => prev + 1);

    setUndoStack((prev) => [...prev, { type: "ADD_NODE", nodeId: id }]);
  }

  function removeNode(nodeId: string, pushToUndo = false): void {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    if (pushToUndo) {
      const connsData = node.connections.map((c) => ({
        fromId: c.fromId,
        toId: c.toId,
      }));
      setUndoStack((prev) => [
        ...prev,
        {
          type: "REMOVE_NODE",
          nodeData: {
            id: nodeId,
            title: node.title,
            color: node.color,
            x: node.x,
            y: node.y,
            connections: connsData,
          },
        },
      ]);
    }

    // Remove connections from global
    const updatedConnections = connections.filter((conn) => {
      if (conn.fromId === nodeId || conn.toId === nodeId) {
        // remove from the other node
        const otherId = conn.fromId === nodeId ? conn.toId : conn.fromId;
        const otherNode = nodes.find((n) => n.id === otherId);
        if (otherNode) {
          otherNode.connections = otherNode.connections.filter(
            (c) => c !== conn
          );
        }
        return false;
      }
      return true;
    });

    // Remove node
    const updatedNodes = nodes.filter((n) => n.id !== nodeId);
    setConnections(updatedConnections);
    setNodes(updatedNodes);

    // Reset highlights
    setHoveredNodeId(null);
    unhighlightAll();
  }

  /*****************************************************
   * CREATE / REMOVE Connection
   *****************************************************/
  function createConnection(
    fromId: string,
    toId: string,
    pushToUndo = true
  ): void {
    if (fromId === toId) return;
    const exists = connections.some(
      (c) =>
        (c.fromId === fromId && c.toId === toId) ||
        (c.fromId === toId && c.toId === fromId)
    );
    if (exists) return;

    const newConn = { fromId, toId };
    setConnections((prev) => [...prev, newConn]);

    const fromNode = nodes.find((n) => n.id === fromId);
    const toNode = nodes.find((n) => n.id === toId);
    if (fromNode) fromNode.connections.push(newConn);
    if (toNode) toNode.connections.push(newConn);

    if (pushToUndo) {
      setUndoStack((prev) => [
        ...prev,
        {
          type: "ADD_CONNECTION",
          fromId,
          toId,
        },
      ]);
    }
  }

  function removeConnection(conn: Connection | null, pushToUndo = false): void {
    if (!conn) return;
    const { fromId, toId } = conn;
    if (pushToUndo) {
      setUndoStack((prev) => [
        ...prev,
        {
          type: "REMOVE_CONNECTION",
          connectionData: { fromId, toId },
        },
      ]);
    }
    // Remove globally
    setConnections((prev) => prev.filter((c) => c !== conn));

    // Remove from each node's connections
    setNodes((prevNodes) => {
      return prevNodes.map((n) => {
        if (n.id === fromId || n.id === toId) {
          return { ...n, connections: n.connections.filter((c) => c !== conn) };
        }
        return n;
      });
    });
  }

  /*****************************************************
   * UNDO Logic
   *****************************************************/
  function undoLastAction(): void {
    if (!undoStack.length) return;
    const action = undoStack[undoStack.length - 1];
    if (!action) return;
    setUndoStack((prev) => prev.slice(0, -1));

    switch (action.type) {
      case "ADD_NODE":
        // We remove that node (no new undo)
        if (!action.nodeId) return;
        removeNode(action.nodeId, false);
        break;
      case "REMOVE_NODE":
        if (!action.nodeData) return;
        undoRecreateNode(action.nodeData);
        break;
      case "ADD_CONNECTION":
        if (!action.fromId || !action.toId) return;
        undoRemoveConnection(action.fromId, action.toId);
        break;
      case "REMOVE_CONNECTION":
        if (!action.connectionData) return;
        undoReAddConnection(
          action.connectionData.fromId,
          action.connectionData.toId
        );
        break;
      case "CHANGE_COLOR": {
        // revert color
        if (!action.nodeId || !action.oldColor || !action.newColor) return;
        setNodes((prev) =>
          prev.map((n) => {
            if (n.id === action.nodeId) {
              return { ...n, color: action.oldColor as string };
            }
            return n;
          })
        );
        break;
      }
      case "CLEAR_BOARD":
        if (!action.nodesData) return;
        
        // First, recreate all nodes with empty connections
        const restoredNodes = action.nodesData.map(node => ({
          ...node,
          connections: [] as Connection[]
        }));

        // Create a set of unique connections
        const allConnections = new Set<Connection>();
        
        // Restore all connections
        action.nodesData.forEach(originalNode => {
          originalNode.connections.forEach(conn => {
            const connKey = [conn.fromId, conn.toId].sort().join('-');
            if (!Array.from(allConnections).some(c => 
              [c.fromId, c.toId].sort().join('-') === connKey
            )) {
              allConnections.add(conn);
              
              // Add connection to both connected nodes
              restoredNodes.forEach(node => {
                if (node.id === conn.fromId || node.id === conn.toId) {
                  node.connections.push(conn);
                }
              });
            }
          });
        });

        // Update both states
        setNodes(restoredNodes);
        setConnections(Array.from(allConnections));
        break;
      default:
        break;
    }
  }

  function undoRecreateNode(nodeData: Node): void {
    // First, create the node with its original connections
    const newNode = {
      ...nodeData,
      connections: [...nodeData.connections] // Keep original connections
    };
    
    // Add the node
    setNodes(prev => [...prev, newNode]);

    // Add connections to global connections state and update other nodes
    nodeData.connections.forEach(conn => {
      // Add to global connections if not already there
      setConnections(prev => {
        const exists = prev.some(c => 
          (c.fromId === conn.fromId && c.toId === conn.toId) ||
          (c.fromId === conn.toId && c.toId === conn.fromId)
        );
        return exists ? prev : [...prev, conn];
      });

      // Add connection to the other node if it exists
      const otherId = conn.fromId === nodeData.id ? conn.toId : conn.fromId;
      setNodes(prevNodes => {
        return prevNodes.map(n => {
          if (n.id === otherId) {
            const alreadyHasConn = n.connections.some(c => 
              (c.fromId === conn.fromId && c.toId === conn.toId) ||
              (c.fromId === conn.toId && c.toId === conn.fromId)
            );
            if (!alreadyHasConn) {
              return {
                ...n,
                connections: [...n.connections, conn]
              };
            }
          }
          return n;
        });
      });
    });
  }

  // Undo for "ADD_CONNECTION" => remove it
  function undoRemoveConnection(fromId: string, toId: string): void {
    setConnections((prev) => {
      const conn = prev.find(
        (c) =>
          (c.fromId === fromId && c.toId === toId) ||
          (c.fromId === toId && c.toId === fromId)
      );
      if (!conn) return prev;

      // remove from array
      const updated = prev.filter((c) => c !== conn);

      // remove from node connections
      setNodes((prevNodes) => {
        return prevNodes.map((n) => {
          if (n.id === fromId || n.id === toId) {
            return {
              ...n,
              connections: n.connections.filter((c) => c !== conn),
            };
          }
          return n;
        });
      });

      return updated;
    });
  }

  // Undo for "REMOVE_CONNECTION" => re-add it
  function undoReAddConnection(fromId: string, toId: string): void {
    const exists = connections.some(
      (c) =>
        (c.fromId === fromId && c.toId === toId) ||
        (c.fromId === toId && c.toId === fromId)
    );
    if (exists) return; // already there

    const newConn = { fromId, toId };
    setConnections((prev) => [...prev, newConn]);
    setNodes((prevNodes) => {
      return prevNodes.map((n) => {
        if (n.id === fromId || n.id === toId) {
          return { ...n, connections: [...n.connections, newConn] };
        }
        return n;
      });
    });
  }

  /*****************************************************
   * Changing Node Color
   *****************************************************/
  function changeNodeColor(
    nodeId: string,
    newColor: string,
    pushToUndo = false,
    oldColor: string | null = null
  ): void {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === nodeId) {
          return { ...n, color: newColor };
        }
        return n;
      })
    );

    if (pushToUndo && oldColor !== null && oldColor !== newColor) {
      // push a single record
      setUndoStack((prev) => [
        ...prev,
        {
          type: "CHANGE_COLOR",
          nodeId,
          oldColor,
          newColor,
        },
      ]);
    }
  }

  /*****************************************************
   * Draggable logic for nodes (left-click)
   *****************************************************/
  function onMouseDownNode(e: any, nodeId: string): void {
    if (!workspaceRef.current) return;

    // ignore right-click or if user clicked an input
    if (e.button !== 0) return;
    if (e.target.tagName === "INPUT") return;
    if (eraserActive) return;

    e.stopPropagation();
    const workspaceRect = workspaceRef.current.getBoundingClientRect();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const offsetX = e.clientX - workspaceRect.left - node.x;
    const offsetY = e.clientY - workspaceRect.top - node.y;

    draggingNodeRef.current = nodeId;
    dragOffsetsRef.current[nodeId] = { offsetX, offsetY };

    window.addEventListener("mousemove", onMouseMoveNode);
    window.addEventListener("mouseup", onMouseUpNode);
  }

  function onMouseMoveNode(e: MouseEvent): void {
    if (!workspaceRef.current) return;

    const nodeId = draggingNodeRef.current;
    if (!nodeId) return;

    e.preventDefault();
    const workspaceRect = workspaceRef.current.getBoundingClientRect();
    const { offsetX, offsetY } = dragOffsetsRef.current[nodeId] || {
      offsetX: 0,
      offsetY: 0,
    };
    const x = e.clientX - workspaceRect.left - offsetX;
    const y = e.clientY - workspaceRect.top - offsetY;

    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === nodeId) {
          return { ...n, x, y };
        }
        return n;
      })
    );
  }

  function onMouseUpNode(): void {
    window.removeEventListener("mousemove", onMouseMoveNode);
    window.removeEventListener("mouseup", onMouseUpNode);
    draggingNodeRef.current = null;
  }

  /*****************************************************
   * Right drag => connection
   *****************************************************/
  function onMouseDownRight(e: React.MouseEvent, nodeId: string): void {
    if (e.button !== 2) return; // Only right-click
    if (eraserActive) return; // Skip if eraser is active
    if (!linksVisible) return; // Skip if links are hidden

    e.preventDefault(); // Disable browser's context menu
    e.stopPropagation(); // Stop event bubbling

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Set initial position
    const workspaceRect = workspaceRef.current?.getBoundingClientRect();
    if (!workspaceRect) return;

    const x1 = node.x + 110; // node center X (assuming 220px wide)
    const y1 = node.y + 90;  // node center Y (assuming 180px tall)
    const x2 = e.clientX - workspaceRect.left;
    const y2 = e.clientY - workspaceRect.top;

    // Track initial mouse position to detect drag
    const initialMousePos = { x: e.clientX, y: e.clientY };
    let isDragging = false;

    // Apply prevent-select style to workspace
    if (workspaceRef.current) {
        Object.assign(workspaceRef.current.style, preventSelectStyle);
    }

    const onMouseMove = (e: MouseEvent) => {
        // Check if we've moved enough to consider it a drag
        const dx = e.clientX - initialMousePos.x;
        const dy = e.clientY - initialMousePos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 5) { // 5px threshold for drag detection
            isDragging = true;
            setStartNodeId(nodeId);
            setDraggingLine({
                x1, y1,
                x2: e.clientX - workspaceRect.left,
                y2: e.clientY - workspaceRect.top
            });

            // Set cursor for all nodes once dragging starts
            document.querySelectorAll('.node').forEach(el => {
                (el as HTMLElement).style.cursor = 'crosshair';
            });
        }

        if (isDragging) {
            setDraggingLine(prev => {
                if (!prev) return null;

                const x2 = e.clientX - workspaceRect.left;
                const y2 = e.clientY - workspaceRect.top;

                // Highlight potential target node
                const el = document.elementFromPoint(e.clientX, e.clientY);
                const nodeDiv = el?.closest('.node');
                
                document.querySelectorAll('.node').forEach(n => {
                    if (n === nodeDiv && n.getAttribute('data-id') !== nodeId) {
                        (n as HTMLElement).style.outline = '2px solid #4CAF50';
                    } else {
                        (n as HTMLElement).style.outline = 'none';
                    }
                });

                return { ...prev, x2, y2 };
            });
        }
    };

    const onMouseUp = (e: MouseEvent) => {
        // Remove listeners
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('mouseleave', onMouseUp);

        // Reset styles
        document.querySelectorAll('.node').forEach(el => {
            (el as HTMLElement).style.cursor = '';
            (el as HTMLElement).style.outline = 'none';
        });

        if (workspaceRef.current) {
            workspaceRef.current.style.userSelect = '';
        }

        if (isDragging) {
            // If we were dragging, check for connection
            const el = document.elementFromPoint(e.clientX, e.clientY);
            if (el) {
                const nodeDiv = el.closest('.node');
                if (nodeDiv) {
                    const targetNodeId = nodeDiv.getAttribute('data-id');
                    if (targetNodeId && targetNodeId !== nodeId) {
                        createConnection(nodeId, targetNodeId);
                    }
                }
            }
            setDraggingLine(null);
            setStartNodeId(null);
        }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mouseleave', onMouseUp);
  }

  /*****************************************************
   * Eraser logic
   *****************************************************/
  function toggleEraser(): void {
    setEraserActive(!eraserActive);
  }

  function onWorkspaceMouseDown(e: any): void {
    if (!eraserActive) return;

    // Check if we clicked a node
    const nodeDiv = e.target.closest(".node");
    if (nodeDiv) {
      const nodeId = nodeDiv.getAttribute("data-id");
      removeNode(nodeId, true);
      return;
    }

    // Check if we clicked a line or text
    if (e.target.tagName === "line" || e.target.tagName === "text") {
      const fromId = e.target.getAttribute("data-from");
      const toId = e.target.getAttribute("data-to");
      if (fromId && toId) {
        const conn = connections.find(
          (c) =>
            (c.fromId === fromId && c.toId === toId) ||
            (c.fromId === toId && c.toId === fromId)
        );
        if (conn) {
          removeConnection(conn, true);
        }
      }
    }
  }

  /*****************************************************
   * File Input (text or image => K-means)
   *****************************************************/
  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'txt') {
      const text = await file.text();
      const hexColors = text.match(/#[0-9A-Fa-f]{6}/g) || [];
      
      // Create nodes first
      const newNodeIds: string[] = [];
      const newNodes: Node[] = [];
      
      hexColors.forEach((hexColor) => {
        const alreadyExists = nodes.some(
          (n) => n.color.toLowerCase() === hexColor.toLowerCase()
        );
        if (!alreadyExists) {
          const id = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          newNodeIds.push(id);
          
          const newNode: Node = {
            id,
            x: 0,
            y: 0,
            color: hexColor,
            title: `Color ${hexColor}`,
            connections: [], // Initialize empty connections array
          };
          newNodes.push(newNode);
        }
      });

      // Calculate optimal positions
      if (workspaceRef.current && newNodes.length > 0) {
        const rect = workspaceRef.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        const positions = calculateLayout(
          newNodes,
          [], // Empty connections for layout
          width,
          height
        );

        // Update node positions
        newNodes.forEach(node => {
          const pos = positions[node.id];
          node.x = pos.x;
          node.y = pos.y;
        });

        // Create all connections
        const allNewConnections: Connection[] = [];
        const updatedNodes = [...nodes]; // Copy existing nodes

        // Connect new nodes among themselves
        for (let i = 0; i < newNodes.length; i++) {
          for (let j = i + 1; j < newNodes.length; j++) {
            const connection: Connection = {
              fromId: newNodes[i].id,
              toId: newNodes[j].id
            };
            allNewConnections.push(connection);
            
            // Add connection to both nodes
            newNodes[i].connections.push({...connection});
            newNodes[j].connections.push({...connection});
          }
        }

        // Connect new nodes to existing nodes
        newNodes.forEach(newNode => {
          updatedNodes.forEach(existingNode => {
            const connection: Connection = {
              fromId: newNode.id,
              toId: existingNode.id
            };
            allNewConnections.push(connection);
            
            // Add connection to both nodes
            newNode.connections.push({...connection});
            existingNode.connections.push({...connection});
          });
        });

        // Update state
        setNodes([...updatedNodes, ...newNodes]);
        setConnections(prev => [...prev, ...allNewConnections]);
        setNodeCount(prev => prev + newNodes.length);

        // Add to undo stack
        newNodes.forEach(node => {
          setUndoStack(prev => [...prev, { 
            type: "ADD_NODE", 
            nodeId: node.id,
            nodeData: node
          }]);
        });
      }
    } else if (extension === 'png' || extension === 'jpg' || extension === 'jpeg') {
      setPendingImageFile(file);
      setPreviewModalOpen(true);
    }

    // Clear the input
    e.target.value = '';
  };

  function handleTextFile(file: File): void {
    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      const text = event.target?.result as string;
      const colorRegex = /#[0-9A-Fa-f]{6}\b/g;
      const matches = [...new Set(text.match(colorRegex) || [])];

      // Reset nodes if too many to prevent overcrowding
      if (matches.length > 50) {
        setNodes([]);
        setConnections([]);
        setNodeCount(0);
      }

      // Create nodes first
      const newNodeIds: string[] = [];
      matches.forEach((hexColor) => {
        const alreadyExists = nodes.some(
          (n) => n.color.toLowerCase() === hexColor.toLowerCase()
        );
        if (!alreadyExists) {
          const id = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          newNodeIds.push(id);
        }
      });

      // Calculate optimal positions
      if (workspaceRef.current && newNodeIds.length > 0) {
        const rect = workspaceRef.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        // Create temporary connections for layout
        const tempConnections = [];
        for (let i = 0; i < newNodeIds.length; i++) {
          for (let j = i + 1; j < newNodeIds.length; j++) {
            tempConnections.push({
              fromId: newNodeIds[i],
              toId: newNodeIds[j]
            });
          }
        }

        const positions = calculateLayout(
          newNodeIds.map(id => ({ id })),
          tempConnections,
          width,
          height
        );

        // Create nodes with calculated positions
        newNodeIds.forEach((id, index) => {
          const pos = positions[id];
          const newNode = {
            id,
            x: pos.x,
            y: pos.y,
            color: matches[index],
            title: `Color ${matches[index]}`,
            connections: [],
          };
          setNodes(prev => [...prev, newNode]);
          setNodeCount(prev => prev + 1);
          setUndoStack(prev => [...prev, { type: "ADD_NODE", nodeId: id }]);
        });

        // Connect nodes after they're created
        connectNewNodesAmongThemselves(newNodeIds);
        connectNewNodesToExisting(newNodeIds);
      }
    };
    reader.readAsText(file);
  }

  function createColorNode(hexColor: string): string {
    const id = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`; // Unique ID
    
    // Calculate grid position based on current node count
    const gridColumns = 5; // Number of nodes per row
    const nodeWidth = 240; // Node width + margin
    const nodeHeight = 200; // Node height + margin
    
    const currentIndex = nodes.length;
    const row = Math.floor(currentIndex / gridColumns);
    const col = currentIndex % gridColumns;
    
    const x = col * nodeWidth + 50; // 50px initial offset
    const y = row * nodeHeight + 50; // 50px initial offset

    const newNode = {
      id,
      x,
      y,
      color: hexColor,
      title: `Color ${hexColor}`,
      connections: [],
    };
    
    setNodes(prev => [...prev, newNode]);
    setNodeCount(prev => prev + 1);
    
    setUndoStack(prev => [...prev, { type: "ADD_NODE", nodeId: id }]);
    return id;
  }

  /*****************************************************
   * K-means preview modal
   *****************************************************/
  function doKmeansPreview(file: File | null, k: number): void {
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      // scale down
      const maxDimension = 100;
      let { width, height } = img;
      if (width > height) {
        if (width > maxDimension) {
          height = Math.round(height * (maxDimension / width));
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width = Math.round(width * (maxDimension / height));
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      ctx.drawImage(img, 0, 0, width, height);

      const data = ctx.getImageData(0, 0, width, height).data;
      const pixelArray = [];
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i],
          g = data[i + 1],
          b = data[i + 2],
          a = data[i + 3];
        if (a > 50) {
          pixelArray.push([r, g, b]);
        }
      }

      const centers = clusterPixelsKMeans(pixelArray, k, 10);
      const colorList = centers.map(([r, g, b]) => rgbToHex(r, g, b));
      setCurrentColorList(colorList);
    };
    img.src = URL.createObjectURL(file);
  }

  function addColorsFromPreview(): void {
    setPreviewModalOpen(false);
    if (!currentColorList || currentColorList.length === 0) return;

    // Reset if too many colors
    if (currentColorList.length > 50) {
      setNodes([]);
      setConnections([]);
      setNodeCount(0);
    }

    // Create nodes first
    const newNodeIds: string[] = [];
    const newNodes: Node[] = [];
    
    currentColorList.forEach((hexColor) => {
      const alreadyExists = nodes.some(
        (n) => n.color.toLowerCase() === hexColor.toLowerCase()
      );
      if (!alreadyExists) {
        const id = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        newNodeIds.push(id);
        
        const newNode: Node = {
          id,
          x: 0,
          y: 0,
          color: hexColor,
          title: `Color ${hexColor}`,
          connections: [], // Initialize empty connections array
        };
        newNodes.push(newNode);
      }
    });

    // Calculate optimal positions
    if (workspaceRef.current && newNodes.length > 0) {
      const rect = workspaceRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      const positions = calculateLayout(
        newNodes,
        [], // Empty connections for layout
        width,
        height
      );

      // Update node positions
      newNodes.forEach(node => {
        const pos = positions[node.id];
        node.x = pos.x;
        node.y = pos.y;
      });

      // Create all connections
      const allNewConnections: Connection[] = [];
      const updatedNodes = [...nodes]; // Copy existing nodes

      // Connect new nodes among themselves
      for (let i = 0; i < newNodes.length; i++) {
        for (let j = i + 1; j < newNodes.length; j++) {
          const connection: Connection = {
            fromId: newNodes[i].id,
            toId: newNodes[j].id
          };
          allNewConnections.push(connection);
          
          // Add connection to both nodes
          newNodes[i].connections.push(connection);
          newNodes[j].connections.push(connection);
        }
      }

      // Connect new nodes to existing nodes
      newNodes.forEach(newNode => {
        updatedNodes.forEach(existingNode => {
          const connection: Connection = {
            fromId: newNode.id,
            toId: existingNode.id
          };
          allNewConnections.push(connection);
          
          // Add connection to both nodes
          newNode.connections.push(connection);
          existingNode.connections.push(connection);
        });
      });

      // Update state
      setNodes([...updatedNodes, ...newNodes]);
      setConnections(prev => [...prev, ...allNewConnections]);
      setNodeCount(prev => prev + newNodes.length);

      // Add to undo stack
      newNodes.forEach(node => {
        setUndoStack(prev => [...prev, { 
          type: "ADD_NODE", 
          nodeId: node.id,
          nodeData: node
        }]);
      });
    }

    setPendingImageFile(null);
    setCurrentColorList([]);
  }

  function connectNewNodesAmongThemselves(newIds: string[]): void {
    for (let i = 0; i < newIds.length; i++) {
      for (let j = i + 1; j < newIds.length; j++) {
        const a = newIds[i];
        const b = newIds[j];
        const alreadyConn = connections.some(
          (c) =>
            (c.fromId === a && c.toId === b) || (c.fromId === b && c.toId === a)
        );
        if (!alreadyConn) {
          createConnection(a, b);
        }
      }
    }
  }

  function connectNewNodesToExisting(newIds: string[]): void {
    newIds.forEach((newId) => {
      nodes.forEach((nd) => {
        if (nd.id !== newId) {
          const alreadyConn = connections.some(
            (c) =>
              (c.fromId === newId && c.toId === nd.id) ||
              (c.fromId === nd.id && c.toId === newId)
          );
          if (!alreadyConn) {
            createConnection(newId, nd.id);
          }
        }
      });
    });
  }

  /*****************************************************
   * Contrast threshold slider
   *****************************************************/
  function handleContrastSliderChange(
    e: React.ChangeEvent<HTMLInputElement>
  ): void {
    setContrastThreshold(parseFloat(e.target.value));
  }

  /*****************************************************
   * Hover highlight
   *****************************************************/
  function highlightNode(nodeId: string): void {
    if (hoverHighlightEnabled) {
      setHoveredNodeId(nodeId);
    }
  }

  function unhighlightAll(): void {
    setHoveredNodeId(null);
  }

  function getNodeOpacity(nodeId: string): number {
    if (!hoveredNodeId) return 1;
    if (nodeId === hoveredNodeId) return 1;
    const hoveredNode = nodes.find((n) => n.id === hoveredNodeId);
    if (!hoveredNode) return 1;
    const connected = hoveredNode.connections.some(
      (c) =>
        (c.fromId === hoveredNodeId && c.toId === nodeId) ||
        (c.toId === hoveredNodeId && c.fromId === nodeId)
    );
    return connected ? 1 : 0.2;
  }

  function getConnectionOpacity(conn: Connection): number {
    if (!hoveredNodeId) return 1;
    const { fromId, toId } = conn;
    if (fromId === hoveredNodeId || toId === hoveredNodeId) return 1;
    return 0.2;
  }

  // Update the clearBoard function to show the modal instead
  const showClearBoardModal = () => {
    setClearBoardModalOpen(true);
  };

  const handleClearBoard = () => {
    // Add to undo stack
    if (nodes.length > 0) {
      // Store complete node data with all connections
      const nodesData = nodes.map(node => ({
        ...node,
        connections: connections.filter(conn => 
          conn.fromId === node.id || conn.toId === node.id
        )
      }));

      setUndoStack(prev => [...prev, {
        type: "CLEAR_BOARD",
        nodesData: nodesData
      }]);
    }
    
    // Clear the board
    setNodes([]);
    setConnections([]);
  };

  // Add these handler functions
  const showTooltip = (text: string) => {
    setTooltipText(text);
    setTooltipVisible(true);
  };

  const hideTooltip = () => {
    setTooltipVisible(false);
  };

  // Add these handler functions
  const handleLightnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLightnessPercentage(Number(e.target.value));
  };

  const handleDarknessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDarknessPercentage(Number(e.target.value));
  };

  return (
    <div className={`app-container ${isDarkMode ? 'dark-mode' : ''}`}>
      <TopBar
        addNode={addNode}
        eraserActive={eraserActive}
        toggleEraser={toggleEraser}
        handleFileInput={handleFileInput}
        contrastThreshold={contrastThreshold}
        handleContrastSliderChange={handleContrastSliderChange}
        simpleMode={simpleMode}
        toggleSimpleMode={toggleSimpleMode}
        hoverHighlightEnabled={hoverHighlightEnabled}
        toggleHoverHighlight={toggleHoverHighlight}
        linksVisible={linksVisible}
        toggleLinksVisibility={toggleLinksVisibility}
        onExport={() => setExportModalOpen(true)}
        previewColorsEnabled={previewColorsEnabled}
        togglePreviewColors={togglePreviewColors}
        clearBoard={showClearBoardModal}
        isSettingsOpen={isSettingsOpen}
        toggleSettings={toggleSettings}
        showTooltip={showTooltip}
        hideTooltip={hideTooltip}
        undoLastAction={undoLastAction}
      />

      <Workspace
        workspaceRef={workspaceRef}
        onWorkspaceMouseDown={onWorkspaceMouseDown}
        connections={connections}
        nodes={nodes}
        draggingLine={draggingLine}
        contrastThreshold={contrastThreshold}
        calculateContrast={calculateContrast}
        getConnectionOpacity={getConnectionOpacity}
        setNodes={setNodes}
        highlightNode={highlightNode}
        unhighlightAll={unhighlightAll}
        onMouseDownNode={onMouseDownNode}
        onMouseDownRight={onMouseDownRight}
        getNodeOpacity={getNodeOpacity}
        changeNodeColor={changeNodeColor}
        colorBeforeDragRef={colorBeforeDragRef}
        colorBeforeHexRef={colorBeforeHexRef}
        simpleMode={simpleMode}
        linksVisible={linksVisible}
        previewColorsEnabled={previewColorsEnabled}
        handleFileInput={handleFileInput}
        eraserActive={eraserActive}
        lightnessPercentage={lightnessPercentage}
        darknessPercentage={darknessPercentage}
        isDarkMode={isDarkMode}
        setUndoStack={setUndoStack}
      />

      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        contrastThreshold={contrastThreshold}
        handleContrastSliderChange={handleContrastSliderChange}
        simpleMode={simpleMode}
        toggleSimpleMode={toggleSimpleMode}
        hoverHighlightEnabled={hoverHighlightEnabled}
        toggleHoverHighlight={toggleHoverHighlight}
        linksVisible={linksVisible}
        toggleLinksVisibility={toggleLinksVisibility}
        previewColorsEnabled={previewColorsEnabled}
        togglePreviewColors={togglePreviewColors}
        lightnessPercentage={lightnessPercentage}
        darknessPercentage={darknessPercentage}
        handleLightnessChange={handleLightnessChange}
        handleDarknessChange={handleDarknessChange}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
      />

      <KMeansModal
        previewModalOpen={previewModalOpen}
        modalMaxColors={modalMaxColors}
        currentColorList={currentColorList}
        setModalMaxColors={setModalMaxColors}
        pendingImageFile={pendingImageFile}
        doKmeansPreview={doKmeansPreview}
        addColorsFromPreview={addColorsFromPreview}
      />

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        nodes={nodes}
      />

      <ClearBoardModal
        isOpen={clearBoardModalOpen}
        onClose={() => setClearBoardModalOpen(false)}
        onConfirm={handleClearBoard}
      />

      {/* Add Tooltip component */}
      <Tooltip
        text={tooltipText}
        visible={tooltipVisible}
        x={mousePos.x}
        y={mousePos.y}
      />
    </div>
  );
}

export default App;
