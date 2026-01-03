import { useCallback, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
  type DraggableProvided,
  type DroppableProvided,
} from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";

export interface DraggableItem {
  id: string;
  content: React.ReactNode;
}

interface DraggableListProps<T extends DraggableItem> {
  items: T[];
  onReorder: (items: T[]) => void;
  droppableId?: string;
  className?: string;
  itemClassName?: string;
  showHandle?: boolean;
  renderItem?: (item: T, index: number) => React.ReactNode;
}

export default function DraggableList<T extends DraggableItem>({
  items,
  onReorder,
  droppableId = "droppable-list",
  className = "",
  itemClassName = "",
  showHandle = true,
  renderItem,
}: DraggableListProps<T>): React.ReactElement {
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;

      const startIndex = result.source.index;
      const endIndex = result.destination.index;

      if (startIndex === endIndex) return;

      const newItems = Array.from(items);
      const [removed] = newItems.splice(startIndex, 1);
      newItems.splice(endIndex, 0, removed);

      onReorder(newItems);
    },
    [items, onReorder],
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId={droppableId}>
        {(provided: DroppableProvided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={className}
          >
            {items.map((item, index) => (
              <Draggable key={item.id} draggableId={item.id} index={index}>
                {(provided: DraggableProvided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`${itemClassName} ${
                      snapshot.isDragging
                        ? "shadow-lg ring-2 ring-nexus-500 bg-card"
                        : ""
                    }`}
                    style={{
                      ...provided.draggableProps.style,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {showHandle && (
                        <div
                          {...provided.dragHandleProps}
                          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded text-muted-foreground"
                        >
                          <GripVertical size={16} />
                        </div>
                      )}
                      <div className="flex-1">
                        {renderItem ? renderItem(item, index) : item.content}
                      </div>
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}

// Utility function to reorder arrays
export function reorder<T>(
  list: T[],
  startIndex: number,
  endIndex: number,
): T[] {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

// Hook for managing draggable state
export function useDraggableList<T extends DraggableItem>(
  initialItems: T[],
): {
  items: T[];
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  handleReorder: (newItems: T[]) => void;
  moveItem: (fromIndex: number, toIndex: number) => void;
  addItem: (item: T, index?: number) => void;
  removeItem: (id: string) => void;
} {
  const [items, setItems] = useState<T[]>(initialItems);

  const handleReorder = useCallback((newItems: T[]) => {
    setItems(newItems);
  }, []);

  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    setItems((prev) => reorder(prev, fromIndex, toIndex));
  }, []);

  const addItem = useCallback((item: T, index?: number) => {
    setItems((prev) => {
      if (index !== undefined) {
        const newItems = [...prev];
        newItems.splice(index, 0, item);
        return newItems;
      }
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return { items, setItems, handleReorder, moveItem, addItem, removeItem };
}
