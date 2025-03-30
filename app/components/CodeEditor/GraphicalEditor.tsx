import React, { useCallback, useEffect, useMemo } from "react";
import dagre from "@dagrejs/dagre";
import {
  Background,
  ConnectionLineType,
  Controls,
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
type directionType = "TB" | "LR";
interface SchemaType {
  type: string;
  properties: Record<string, { type: string }>;
}

const position = { x: 0, y: 0 };
const edgeType = "step";

export const initialNodes = [
  {
    id: "1",
    type: "input",
    data: { label: "input" },
    position,
  },
  {
    id: "2",
    data: { label: "node 2" },
    position,
  },
  {
    id: "2a",
    data: { label: "node 2a" },
    position,
  },
  {
    id: "2b",
    data: { label: "node 2b" },
    position,
  },
  {
    id: "2c",
    data: { label: "node 2c" },
    position,
  },
  {
    id: "2d",
    data: { label: "node 2d" },
    position,
  },
  {
    id: "3",
    data: { label: "node 3" },
    position,
  },
  {
    id: "4",
    data: { label: "node 4" },
    position,
  },
  {
    id: "5",
    data: { label: "node 5" },
    position,
  },
  {
    id: "6",
    type: "output",
    data: { label: "output" },
    position,
  },
  { id: "7", type: "output", data: { label: "output" }, position },
];

export const initialEdges = [
  { id: "e12", source: "1", target: "2", type: edgeType, animated: true },
  { id: "e13", source: "1", target: "3", type: edgeType, animated: true },
  { id: "e22a", source: "2", target: "2a", type: edgeType, animated: true },
  { id: "e22b", source: "2", target: "2b", type: edgeType, animated: true },
  { id: "e22c", source: "2", target: "2c", type: edgeType, animated: true },
  { id: "e2c2d", source: "2c", target: "2d", type: edgeType, animated: true },
  { id: "e45", source: "4", target: "5", type: edgeType, animated: true },
  { id: "e56", source: "5", target: "6", type: edgeType, animated: true },
  { id: "e57", source: "5", target: "7", type: edgeType, animated: true },
];

const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

const nodeWidth = 172;
const nodeHeight = 36;

const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction: directionType = "TB",
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

const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
  initialNodes,
  initialEdges,
);

export const GraphicalEditor: React.FC<GraphicalEditorProps> = ({
  codeString,
  setCodeString,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    let { nodes: _nodes, edges: _edges } = codestrToGraphData(
      JSON.parse(codeString),
    );
    let { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      _nodes,
      _edges,
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [codeString]);

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          { ...params, type: ConnectionLineType.SmoothStep, animated: true },
          eds,
        ),
      ),
    [],
  );

  const { fitView } = useReactFlow();

  const onLayout = useCallback(
    (direction: directionType) => {
      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(nodes, edges, direction);

      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
      requestAnimationFrame(fitView);
    },
    [nodes, edges],
  );
  console.log("Nodes", { nodes, edges });
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
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

let codestrToGraphData = (schema: SchemaType) => {
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
