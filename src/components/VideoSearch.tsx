import React, { useState } from "react";
import { Search, Plus } from "lucide-react";
import useRoomStore from "../store/roomStore";

interface VideoSearchResult {
  id: string;
  title: string;
  thumbnail: string;
}

const VideoSearch: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<VideoSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addVideo } = useRoomStore();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Extract video ID if user pasted a YouTube URL
      const urlRegex =
        /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
      const urlMatch = searchQuery.match(urlRegex);

      if (urlMatch && urlMatch[1]) {
        // Get video details for the single video
        const videoId = urlMatch[1];
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${
            import.meta.env.VITE_YOUTUBE_API_KEY
          }`
        );
        const data = await response.json();

        if (data.items && data.items.length > 0) {
          const video = data.items[0];
          setSearchResults([
            {
              id: video.id,
              title: video.snippet.title,
              thumbnail: video.snippet.thumbnails.medium.url,
            },
          ]);
        } else {
          setError("Video not found");
          setSearchResults([]);
        }
      } else {
        // Perform a search query
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${encodeURIComponent(
            searchQuery
          )}&type=video&key=AIzaSyDh_KnD20yfV4Zmq7l89WFQuaeMUQnWaXg`
        );
        const data = await response.json();

        if (data.items) {
          const results = data.items.map(
            (item: {
              id: { videoId: string };
              snippet: {
                title: string;
                thumbnails: { medium: { url: string } };
              };
            }) => ({
              id: item.id.videoId,
              title: item.snippet.title,
              thumbnail: item.snippet.thumbnails.medium.url,
            })
          );
          setSearchResults(results);
        } else {
          setError("No videos found");
          setSearchResults([]);
        }
      }
    } catch (error) {
      console.error("YouTube search error:", error);
      setError("Failed to search YouTube. Please try again.");
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddVideo = (video: VideoSearchResult) => {
    addVideo(video.id, video.title, video.thumbnail);
    // Clear search results after adding
    setSearchResults([]);
    setSearchQuery("");
  };

  return (
    <div className="video-search mb-6">
      <h3 className="text-lg font-semibold text-white mb-2">Add Video</h3>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="YouTube URL or search term"
            className="w-full pl-10 pr-4 py-2 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <button
          type="submit"
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          disabled={isLoading}
        >
          {isLoading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && <div className="text-red-400 text-sm mb-4">{error}</div>}

      {searchResults.length > 0 && (
        <div className="search-results">
          <h4 className="text-sm font-medium text-gray-300 mb-2">
            Search Results
          </h4>
          <ul className="space-y-2 max-h-[300px] overflow-y-auto">
            {searchResults.map((video) => (
              <li
                key={video.id}
                className="bg-gray-800 rounded-lg overflow-hidden"
              >
                <div className="flex items-start p-2">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-20 h-auto rounded object-cover mr-3"
                  />
                  <div className="flex-1 overflow-hidden">
                    <h5 className="text-sm text-white truncate font-medium">
                      {video.title}
                    </h5>
                  </div>
                  <button
                    onClick={() => handleAddVideo(video)}
                    className="ml-2 p-2 text-white hover:bg-gray-700 rounded-full transition-colors"
                    title="Add video to queue"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default VideoSearch;
