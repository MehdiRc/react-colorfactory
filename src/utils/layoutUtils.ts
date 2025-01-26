export interface Point {
  x: number;
  y: number;
}

interface ForceNode extends Point {
  id: string;
  vx: number;
  vy: number;
}

export function calculateLayout(
  nodes: { id: string }[],
  connections: { fromId: string; toId: string }[],
  width: number,
  height: number
): { [key: string]: { x: number; y: number } } {
  const positions: { [key: string]: { x: number; y: number } } = {};
  const nodeCount = nodes.length;

  // Calculate the center of the workspace
  const centerX = width / 2;
  const centerY = height / 2;

  // Calculate the radius to maximize screen usage while keeping margins
  const marginY = 150; // Vertical margin for node height and padding
  const marginX = 100; // Reduced horizontal margin
  const radius = Math.min(
    (width - 2 * marginX) / 2,  // Horizontal radius
    (height - 2 * marginY) / 2   // Vertical radius
  );

  // Position nodes in a circle
  nodes.forEach((node, index) => {
    // Calculate angle for this node (distribute evenly around the circle)
    const angle = (index / nodeCount) * 2 * Math.PI;

    // Calculate position using trigonometry
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    positions[node.id] = { x, y };
  });

  // If there's only one node, place it in the center
  if (nodeCount === 1) {
    positions[nodes[0].id] = { x: centerX, y: centerY };
  }

  return positions;
}

// Add an empty export to make this a module
export {}; 