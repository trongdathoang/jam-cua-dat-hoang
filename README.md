# JamcuaDatdepzai

JamcuaDatdepzai is a real-time YouTube video sharing platform that lets you watch videos together with friends and family, no matter where they are. Create rooms, chat with participants, and enjoy synchronized video playback.

## Features

- **Create or Join Rooms**: Generate unique room IDs and invite others to join your viewing session
- **Real-time Video Synchronization**: Play, pause, and seek videos in perfect sync
- **Video Queue Management**: Add videos to a queue and control playback order
- **Live Chat**: Communicate with others in your room
- **User Presence**: See who's currently in the room
- **Responsive Design**: Works on desktop and mobile devices

## Technologies Used

- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **State Management**: Zustand
- **Backend**: Firebase Realtime Database
- **UI Components**: Lucide React for icons

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or pnpm

### Installation

1. Clone the repository

   ```
   git clone https://github.com/yourusername/youtube-jam.git
   cd youtube-jam
   ```

2. Install dependencies

   ```
   npm install
   # or
   pnpm install
   ```

3. Set up Firebase

   - Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
   - Enable Realtime Database
   - Create a `.env` file in the project root with your Firebase configuration:
     ```
     VITE_FIREBASE_API_KEY=your-api-key
     VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
     VITE_FIREBASE_PROJECT_ID=your-project-id
     VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
     VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
     VITE_FIREBASE_APP_ID=your-app-id
     VITE_FIREBASE_DATABASE_URL=your-database-url
     ```

4. Start the development server

   ```
   npm run dev
   # or
   pnpm dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser

## Usage

### Creating a Room

1. Open the application
2. Enter your name and a room name
3. Click "Create Room"
4. Share the generated link with friends

### Joining a Room

1. Use a room invite link or enter a room ID
2. Enter your name
3. Click "Join Room"

### Watching Videos

1. Search for videos using the search bar
2. Add videos to the queue
3. Control playback with the video player controls
4. Chat with others in the room using the chat panel

## Building for Production

```
npm run build
# or
pnpm build
```

The built files will be in the `dist` directory.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
