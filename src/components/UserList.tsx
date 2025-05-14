import React from "react";
import { Crown, UserX, Award } from "lucide-react";
import useRoomStore from "../store/roomStore";
import { User } from "../types";

const UserList: React.FC = () => {
  const { room, user, removeUser, transferHost } = useRoomStore();

  if (!room) return null;

  const isHost = user?.isHost || false;
  const currentUserId = user?.id;

  const users = Object.values(room.users).sort((a, b) => {
    // Sort host first, then by join time
    if (a.isHost) return -1;
    if (b.isHost) return 1;
    return a.joinedAt - b.joinedAt;
  });

  const handleRemoveUser = (userId: string) => {
    if (
      window.confirm("Are you sure you want to remove this user from the room?")
    ) {
      removeUser(userId);
    }
  };

  const handleTransferHost = (userId: string, userName: string) => {
    if (
      window.confirm(
        `Are you sure you want to make ${userName} the new host? You will lose your host privileges.`
      )
    ) {
      transferHost(userId);
    }
  };

  return (
    <div className="users-list mb-6">
      <h3 className="text-lg font-semibold text-white mb-2">
        Users in Room ({users.length})
      </h3>

      <ul className="space-y-2">
        {users.map((user: User) => (
          <li
            key={user.id}
            className="flex items-center p-2 bg-gray-800 rounded-lg"
          >
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mr-3">
              <span className="text-white font-medium">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-white font-medium flex-1 truncate">
              {user.name}
              {user.id === currentUserId && (
                <span className="text-xs text-gray-400 ml-2">(You)</span>
              )}
            </span>
            {user.isHost && (
              <div className="flex items-center mx-2" title="Room Host">
                <Crown size={16} className="text-yellow-400" />
              </div>
            )}
            <div className="flex space-x-2">
              {/* Transfer host button (only visible to current host and for non-host users) */}
              {isHost && !user.isHost && user.id !== currentUserId && (
                <button
                  onClick={() => handleTransferHost(user.id, user.name)}
                  className="p-1 text-gray-400 hover:text-yellow-400 transition-colors"
                  title="Make host"
                >
                  <Award size={16} />
                </button>
              )}
              {/* Remove user button (only visible to host for non-host users) */}
              {isHost && !user.isHost && user.id !== currentUserId && (
                <button
                  onClick={() => handleRemoveUser(user.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="Remove from room"
                >
                  <UserX size={16} />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserList;
