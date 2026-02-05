import { memo } from 'react';
import { type Node, type NodeProps, Handle, Position } from '@xyflow/react';
import clsx from 'clsx';
import { Star } from 'lucide-react';

type CustomNodeData = {
    rating: number;
    state: string;
    pid: string;
};

const CustomNode = memo(({ data, selected }: NodeProps<Node<CustomNodeData>>) => {
    return (
        <div className={clsx(
            "w-32 h-32 flex flex-col items-center justify-center text-center px-1 shadow-lg rounded-full transition-all border-2",
            // Selection state
            selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
            // Status based styling
            data.state === 'solved' ? "bg-green-600 border-green-700 text-white" :
                data.state === 'available' ? "bg-card border-foreground text-foreground ring-2 ring-offset-2 ring-green-600" :
                    data.state === 'locked' ? "bg-card border-stone-300 text-foreground border-dashed" :
                        "bg-card border-foreground text-foreground hover:border-black" // Default (Admin/Normal)
        )}>
            {/* Handles for smart connection feel (invisible) */}
            <Handle type="source" position={Position.Top} className="opacity-0 w-1 h-1 !bg-transparent pointer-events-none" isConnectable={false} />

            <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                    {/* ID hidden as requested */}
                    {data.rating > 0 && ( /* If locked, rating might be hidden or passed as string '???' which fails this check */
                        <div className={clsx(
                            "flex items-center text-xs font-bold mx-auto",
                            data.state === 'locked' ? "text-inherit" : "text-yellow-500"
                        )}>
                            <Star size={10} className={clsx("mr-1", data.state === 'locked' ? "fill-current" : "fill-yellow-500")} />
                            {data.rating}
                        </div>
                    )}
                </div>

                <div className={clsx("font-bold text-3xl truncate")} title={data.state === 'locked' ? "Locked" : data.pid}>
                    {data.state === 'locked' ? "?" :
                        data.state === 'solved' ? "AC" :
                            data.state === 'available' ? "Solve" :
                                (data.pid || "Problem")}
                </div>

            </div>

            {/* Handle required for edges to render */}
            <Handle type="target" position={Position.Top} className="opacity-0 w-1 h-1 !bg-transparent pointer-events-none" isConnectable={false} />
        </div >
    );
});

export default CustomNode;
