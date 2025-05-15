import React from "react";
import { Trash2, Play, GripVertical } from "lucide-react";
import useRoomStore from "../store/roomStore";
import { VideoInfo } from "../types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableQueueItemProps {
  video: VideoInfo;
  index: number;
  canReorder: boolean;
  canDelete: boolean;
  canPlayFromQueue: boolean;
  userName: string | undefined;
  onPlay: (id: string) => void;
  onRemove: (id: string) => void;
}

const SortableQueueItem: React.FC<SortableQueueItemProps> = ({
  video,
  index,
  canReorder,
  canDelete,
  canPlayFromQueue,
  userName,
  onPlay,
  onRemove,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: video.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`bg-gray-800 rounded-lg overflow-hidden draggable-queue-item ${
        isDragging ? "queue-item-dragging" : ""
      }`}
    >
      <div className="flex items-start p-2">
        {canReorder && (
          <div
            {...attributes}
            {...listeners}
            className="flex-shrink-0 flex items-center px-1 text-gray-500 cursor-grab drag-handle"
          >
            <GripVertical size={16} />
          </div>
        )}
        <div className="flex-shrink-0 relative">
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-20 h-auto rounded object-cover"
          />
          <div className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
            #{index + 1}
          </div>
        </div>
        <div className="flex-1 ml-3 overflow-hidden">
          <h5 className="text-sm text-white truncate font-medium">
            {video.title}
          </h5>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-400">
              Added by {userName || "Unknown"}
            </span>
            <div className="flex space-x-2">
              {canPlayFromQueue && (
                <button
                  onClick={() => onPlay(video.id)}
                  className="text-gray-400 hover:text-green-400 transition-colors"
                  title="Play now"
                >
                  <Play size={16} />
                </button>
              )}
              {(canDelete ||
                video.addedBy === useRoomStore.getState().user?.id) && (
                <button
                  onClick={() => onRemove(video.id)}
                  className="text-gray-400 hover:text-red-400 transition-colors"
                  title="Remove from queue"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
};

const VideoQueue: React.FC = () => {
  const { room, user, removeVideo, playVideoFromQueue, reorderQueue } =
    useRoomStore();
  const queue = room?.queue || [];
  const isHost = user?.isHost || false;

  // Use room settings for permissions
  const roomSettings = room?.settings || {
    allowAllPlayPause: false,
    allowAllSkip: false,
    allowAllDelete: false,
    allowAllQueueReorder: false,
  };

  // Calculate permissions based on host status and room settings
  const canReorder = isHost || roomSettings.allowAllQueueReorder;
  const canDelete = isHost || roomSettings.allowAllDelete;
  const canPlayFromQueue = isHost; // Only host can play from queue

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 100, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (!room) return null;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!canReorder || !over) return;

    if (active.id !== over.id) {
      const oldIndex = queue.findIndex((item) => item.id === active.id);
      const newIndex = queue.findIndex((item) => item.id === over.id);

      const newQueue = arrayMove(queue, oldIndex, newIndex);
      reorderQueue(newQueue);
    }
  };

  return (
    <div className="video-queue mb-6">
      <h3 className="text-lg font-semibold text-white mb-2">
        Queue {queue.length > 0 && `(${queue.length})`}
      </h3>

      {queue.length === 0 ? (
        <div className="text-gray-400 text-sm bg-gray-800 p-4 rounded-lg">
          No videos in queue. Search for videos to add them here.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          // Only enable drag if the user has permission to reorder
        >
          <SortableContext
            items={queue.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {queue.map((video, index) => (
                <SortableQueueItem
                  key={video.id}
                  video={video}
                  index={index}
                  canReorder={canReorder}
                  canDelete={canDelete}
                  canPlayFromQueue={canPlayFromQueue}
                  userName={
                    Object.values(room.users).find(
                      (u) => u.id === video.addedBy
                    )?.name
                  }
                  onPlay={playVideoFromQueue}
                  onRemove={removeVideo}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

export default VideoQueue;
