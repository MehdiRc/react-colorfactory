export interface Node {
  id: string;
  x: number;
  y: number;
  color: string;
  title: string;
  connections: Connection[];
  lastInteracted?: number;
}

export interface Connection {
  fromId: string;
  toId: string;
}

export interface DraggingLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ColorRefs {
  [key: string]: string;
}

export type UndoAction = {
  type: "ADD_NODE" | "REMOVE_NODE" | "ADD_CONNECTION" | "REMOVE_CONNECTION" | "CHANGE_COLOR" | "CLEAR_BOARD";
  nodeId?: string;
  nodeData?: Node;
  connectionData?: { fromId: string; toId: string };
  oldColor?: string;
  newColor?: string;
  nodesData?: Node[];
  fromId?: string;
  toId?: string;
};
