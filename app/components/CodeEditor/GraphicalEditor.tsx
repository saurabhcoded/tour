import React, { useCallback, useEffect } from "react";
import dagre from "@dagrejs/dagre";
import {
  Background,
  ConnectionLineType,
  Panel,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import type { Node, Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import MyBtn from "../MyBtn/MyBtn";
import { Flex } from "@chakra-ui/react";

interface GraphicalEditorProps {
  codeString: string;
  setCodeString: (codeString: string) => void;
}

type DirectionType = "TB" | "LR";

interface SchemaType {
  type: string;
  properties: Record<string, { type: string }>;
}

const position = { x: 0, y: 0 };
const edgeType = "step";

const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

const nodeWidth = 172;
const nodeHeight = 36;

const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction: DirectionType = "TB",
) => {
  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newNode = {
      ...node,
      targetPosition: isHorizontal ? "left" : "top",
      sourcePosition: isHorizontal ? "right" : "bottom",
      // We are shifting the dagre node position (anchor=center center) to the top left
      // so it matches the React Flow node anchor point (top left).
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };

    return newNode;
  });

  return { nodes: newNodes, edges };
};

const codestrToGraphData = (
  schema: SchemaType,
): { nodes: Node[]; edges: Edge[] } => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Root Node
  const rootNodeId = "1";
  nodes.push({
    id: rootNodeId,
    type: "input",
    data: { label: "Root Object" },
    position,
  });

  let nodeIdCounter = 2;

  Object.entries(schema.properties).forEach(([key, value], index) => {
    const nodeId = `node-${nodeIdCounter++}`;

    nodes.push({
      id: nodeId,
      data: { label: `${key} (${value.type})` },
      position: { x: index * 200, y: 100 }, // Spacing out child nodes
    });

    edges.push({
      id: `edge-${rootNodeId}-${nodeId}`,
      source: rootNodeId,
      target: nodeId,
    });
  });

  return { nodes, edges };
};

export const GraphicalEditor: React.FC<GraphicalEditorProps> = ({
  codeString,
  setCodeString,
}) => {
  // Initialize with proper empty arrays typed as Node[] and Edge[]
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView } = useReactFlow();

  useEffect(() => {
    try {
      const parsedSchema = JSON.parse(codeString) as SchemaType;
      const { nodes: _nodes, edges: _edges } = codestrToGraphData(parsedSchema);
      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(_nodes, _edges);

      // Type assertion to help TypeScript understand the types
      setNodes(layoutedNodes as Node[]);
      setEdges(layoutedEdges as Edge[]);
    } catch (error) {
      console.error("Error parsing schema:", error);
    }
  }, [codeString]);

  const onLayout = useCallback(
    (direction: DirectionType) => {
      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(nodes, edges, direction);

      setNodes([...layoutedNodes] as Node[]);
      setEdges([...layoutedEdges] as Edge[]);
      requestAnimationFrame(() => {
        fitView();
      });
    },
    [nodes, edges, fitView],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      defaultEdgeOptions={{ type: edgeType }}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      connectionLineType={ConnectionLineType.SmoothStep}
      fitView
      style={{ backgroundColor: "#F7F9FB" }}
      attributionPosition="top-left"
    >
      <Panel position="top-right">
        <Flex gap={1}>
          <MyBtn variant="default" onClick={() => onLayout("TB")}>
            vertical layout
          </MyBtn>
          <MyBtn variant="default" onClick={() => onLayout("LR")}>
            horizontal layout
          </MyBtn>
        </Flex>
      </Panel>
      <Background />
    </ReactFlow>
  );
};