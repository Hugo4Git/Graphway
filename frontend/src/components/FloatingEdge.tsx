import { useCallback } from 'react';
import { BaseEdge, type EdgeProps, getStraightPath, useStore } from '@xyflow/react';

// Helper to get the center of a node
function getNodeCenter(node: any) {
    const width = node.measured?.width ?? node.width;
    const height = node.measured?.height ?? node.height;
    const positionAbsolute = node.computed?.positionAbsolute ?? node.position; // Fallback to relative pos if absolute missing (better than 0,0)

    if (!positionAbsolute || !width || !height) {
        return { x: 0, y: 0 };
    }
    return {
        x: positionAbsolute.x + width / 2,
        y: positionAbsolute.y + height / 2,
    };
}

// Helper to calculate the intersection point between the edge vector and the target node's bounding circle
function getIntersection(centerA: { x: number, y: number }, centerB: { x: number, y: number }, radiusB: number) {
    const dx = centerA.x - centerB.x;
    const dy = centerA.y - centerB.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) return centerB; // Should not happen for distinct nodes

    return {
        x: centerB.x + (dx / len) * radiusB,
        y: centerB.y + (dy / len) * radiusB
    };
}


export default function FloatingEdge({ source, target, markerEnd, style }: EdgeProps) {
    const sourceNode = useStore(useCallback((store) => store.nodeLookup.get(source), [source]));
    const targetNode = useStore(useCallback((store) => store.nodeLookup.get(target), [target]));

    if (!sourceNode || !targetNode) {
        return null;
    }

    const sourceCenter = getNodeCenter(sourceNode);
    const targetCenter = getNodeCenter(targetNode);

    // Assuming standard circular node radius from w-32 (128px) -> radius = 64
    const radius = 64;

    const sourceIntersection = getIntersection(targetCenter, sourceCenter, radius);
    const targetIntersection = getIntersection(sourceCenter, targetCenter, radius);

    const [edgePath] = getStraightPath({
        sourceX: sourceIntersection.x,
        sourceY: sourceIntersection.y,
        targetX: targetIntersection.x,
        targetY: targetIntersection.y,
    });

    return (
        <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
    );
}
