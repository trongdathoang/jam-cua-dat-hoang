import React, { useState } from "react";
import { X, Settings } from "lucide-react";

interface RoomSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSettings: RoomSettings;
  onSave: (settings: RoomSettings) => void;
}

export interface RoomSettings {
  allowAllPlayPause: boolean;
  allowAllSkip: boolean;
  allowAllDelete: boolean;
  allowAllQueueReorder: boolean;
}

const RoomSettingsModal: React.FC<RoomSettingsModalProps> = ({
  isOpen,
  onClose,
  initialSettings,
  onSave,
}) => {
  const [settings, setSettings] = useState<RoomSettings>(initialSettings);

  if (!isOpen) return null;

  const handleChange = (setting: keyof RoomSettings) => {
    setSettings((prev) => ({
      ...prev,
      [setting]: !prev[setting],
    }));
  };

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  // Toggle switch component for better reusability and consistency
  const ToggleSwitch = ({
    id,
    label,
    checked,
    onChange,
  }: {
    id: string;
    label: string;
    checked: boolean;
    onChange: () => void;
  }) => (
    <div className="flex items-center justify-between">
      <label htmlFor={id} className="text-white cursor-pointer">
        {label}
      </label>
      <div
        className="relative inline-block w-12 h-6 cursor-pointer"
        onClick={onChange}
      >
        <div
          className={`absolute inset-0 rounded-full transition-colors duration-200 ${
            checked ? "bg-purple-600" : "bg-gray-600"
          }`}
        >
          <div
            className={`absolute bg-white h-5 w-5 rounded-full top-0.5 left-0.5 transition-transform duration-200 ${
              checked ? "translate-x-6" : ""
            }`}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white text-xl font-medium flex items-center">
            <Settings size={22} className="mr-2" />
            Room Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-6">
          <h3 className="text-lg text-white font-medium mb-3">
            User Permissions
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            Control what all users in the room can do. When disabled, only the
            host can perform these actions.
          </p>

          <div className="space-y-4">
            <ToggleSwitch
              id="play-pause"
              label="Play & Pause Videos"
              checked={settings.allowAllPlayPause}
              onChange={() => handleChange("allowAllPlayPause")}
            />

            <ToggleSwitch
              id="skip"
              label="Skip Videos"
              checked={settings.allowAllSkip}
              onChange={() => handleChange("allowAllSkip")}
            />

            <ToggleSwitch
              id="delete"
              label="Delete Videos"
              checked={settings.allowAllDelete}
              onChange={() => handleChange("allowAllDelete")}
            />

            <ToggleSwitch
              id="reorder"
              label="Reorder Queue"
              checked={settings.allowAllQueueReorder}
              onChange={() => handleChange("allowAllQueueReorder")}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="mr-4 px-4 py-2 text-white hover:underline"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomSettingsModal;
